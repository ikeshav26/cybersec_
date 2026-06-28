import { useState, useEffect } from 'react'
import { useUserStore } from '../store/useUserStore'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  Shield,
  Database,
  Home,
  LogOut,
  RefreshCw,
  Play,
  CheckCircle2,
  User,
  ExternalLink,
  Terminal,
  GitPullRequest,
  ChevronDown,
  ChevronUp,
  ArrowLeft
} from 'lucide-react'

interface Finding {
  id: string
  title: string
  description: string
  filePath: string
  line?: number
  severity: string
  tool: string
  status: string
}

interface PaginationProps {
  currentPage: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}

const Pagination = ({ currentPage, totalItems, itemsPerPage, onPageChange }: PaginationProps) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between border-t border-white/[0.08] bg-white/[0.01] px-6 py-4">
      <div className="text-xs text-neutral-400">
        Showing <span className="font-semibold text-white">{Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
        <span className="font-semibold text-white">{Math.min(totalItems, currentPage * itemsPerPage)}</span> of{' '}
        <span className="font-semibold text-white">{totalItems}</span> entries
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] text-xs font-bold text-neutral-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          Previous
        </button>
        <div className="text-xs text-neutral-400 font-medium px-2">
          Page <span className="text-white font-bold">{currentPage}</span> of <span className="text-white font-bold">{totalPages}</span>
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] text-xs font-bold text-neutral-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  )
}

const Dashboard = () => {
  const { user, isAuthenticated, clearUser } = useUserStore()
  const navigate = useNavigate()
  
  // Dashboard Navigation State
  const [activeTab, setActiveTab] = useState<'repositories' | 'scans' | 'fixes' | 'reviewer' | 'overview'>('repositories')
  const [repos, setRepos] = useState<any[]>([])
  const [scans, setScans] = useState<any[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isScansLoading, setIsScansLoading] = useState(false)

  // Real-time scan states mapped by repository ID for active scans on the page
  const [scanStatus, setScanStatus] = useState<
    Record<
      string,
      {
        id: string
        status: string
        error?: string
        findingsCount?: number
      }
    >
  >({})

  const [togglingPrReviewer, setTogglingPrReviewer] = useState<Record<string, boolean>>({})

  // Active findings view state (if set, hides the list view and renders findings explorer keeping the sidebar visible)
  const [activeScanIdForFindings, setActiveScanIdForFindings] = useState<string | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [repoName, setRepoName] = useState<string>('')
  const [isFindingsLoading, setIsFindingsLoading] = useState(false)
  const [fixingFindingId, setFixingFindingId] = useState<string | null>(null)
  const [fixResults, setFixResults] = useState<Record<string, { explanation: string; code: string }>>({})
  const [expandedFixIds, setExpandedFixIds] = useState<Record<string, boolean>>({})
  const [selectedFindingIds, setSelectedFindingIds] = useState<string[]>([])
  const [fixingAll, setFixingAll] = useState(false)
  const [isPrOpening, setIsPrOpening] = useState(false)
  const [openedPrUrl, setOpenedPrUrl] = useState<string | null>(null)

  // Pagination constants & states
  const ITEMS_PER_PAGE = 5
  const SCANS_PER_PAGE = 9
  const FINDINGS_PER_PAGE = 5

  const [reposPage, setReposPage] = useState(1)
  const [reviewerPage, setReviewerPage] = useState(1)
  const [scansPage, setScansPage] = useState(1)
  const [fixesPage, setFixesPage] = useState(1)
  const [findingsPage, setFindingsPage] = useState(1)

  const [totalScans, setTotalScans] = useState(0)
  const [totalFixes, setTotalFixes] = useState(0)
  const [fixesScans, setFixesScans] = useState<any[]>([])

  // Reset pagination when switching views
  useEffect(() => {
    setReposPage(1)
    setReviewerPage(1)
    setScansPage(1)
    setFixesPage(1)
    setFindingsPage(1)
  }, [activeTab, activeScanIdForFindings])

  // 1. Process URL redirects & load credentials on load
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const oauthStatus = searchParams.get('oauth')
    const jwtToken = searchParams.get('token')
    const userJson = searchParams.get('user')
    const installationIdFromUrl = searchParams.get('installation_id')

    if (oauthStatus === 'success' && jwtToken && userJson) {
      try {
        const parsedUser = JSON.parse(decodeURIComponent(userJson))
        localStorage.setItem('token', jwtToken)
        localStorage.setItem('user', JSON.stringify(parsedUser))
        window.history.replaceState({}, document.title, window.location.pathname)
      } catch (err) {
        console.error('Failed to parse user JSON:', err)
      }
    }

    if (installationIdFromUrl) {
      localStorage.setItem('temp_installation_id', installationIdFromUrl)
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    const token = localStorage.getItem('token')
    if (token) {
      loadReposFromDb()
    } else {
      setIsPageLoading(false)
    }
  }, [isAuthenticated])

  // Fetch scans history when relevant tab or page changes
  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'scans') {
        fetchScanHistory(scansPage)
      } else if (activeTab === 'fixes') {
        fetchFixesHistory(fixesPage)
      }
    }
  }, [activeTab, scansPage, fixesPage, isAuthenticated])

  // Load findings details when activeScanIdForFindings is set
  useEffect(() => {
    if (activeScanIdForFindings) {
      fetchScanFindings(activeScanIdForFindings)
    }
  }, [activeScanIdForFindings])

  const loadReposFromDb = async () => {
    try {
      setIsPageLoading(true)
      const token = localStorage.getItem('token')
      if (!token) return
      const response = await fetch(`${import.meta.env.VITE_APP_INTEGRATION_URL}/api/v1/repos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRepos(data.data || [])
        }
      }
    } catch (error) {
      console.error('Error loading repos from database:', error)
    } finally {
      setIsPageLoading(false)
    }
  }

  const fetchScanHistory = async (page = scansPage) => {
    try {
      setIsScansLoading(true)
      const token = localStorage.getItem('token')
      if (!token) return
      const response = await fetch(`${import.meta.env.VITE_SECURE_BOT_URL}/api/secure-bot/scan/history?page=${page}&limit=${SCANS_PER_PAGE}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setScans(data.data || [])
          if (data.pagination) {
            setTotalScans(data.pagination.total || 0)
          }
        }
      }
    } catch (error) {
      console.error('Error loading scan history:', error)
    } finally {
      setIsScansLoading(false)
    }
  }

  const fetchFixesHistory = async (page = fixesPage) => {
    try {
      setIsScansLoading(true)
      const token = localStorage.getItem('token')
      if (!token) return
      const response = await fetch(`${import.meta.env.VITE_SECURE_BOT_URL}/api/secure-bot/scan/history?page=${page}&limit=${SCANS_PER_PAGE}&onlyResolved=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setFixesScans(data.data || [])
          if (data.pagination) {
            setTotalFixes(data.pagination.total || 0)
          }
        }
      }
    } catch (error) {
      console.error('Error loading fixes history:', error)
    } finally {
      setIsScansLoading(false)
    }
  }

  const fetchScanFindings = async (scanId: string) => {
    try {
      setIsFindingsLoading(true)
      setFindings([])
      setSelectedFindingIds([])
      setFixResults({})
      setExpandedFixIds({})
      setOpenedPrUrl(null)

      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_SECURE_BOT_URL}/api/secure-bot/scan/status/${scanId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          const scanData = data.data
          setFindings(scanData.findings || [])

          const repo = repos.find(r => r.id === scanData.repositoryId)
          if (repo) {
            setRepoName(repo.repo_name)
          } else {
            const repoRes = await fetch(`${import.meta.env.VITE_APP_INTEGRATION_URL}/api/v1/repos/${scanData.repositoryId}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            if (repoRes.ok) {
              const repoData = await repoRes.json()
              if (repoData.success && repoData.data) {
                setRepoName(repoData.data.repo_name)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching scan status:', error)
    } finally {
      setIsFindingsLoading(false)
    }
  }

  const handleSync = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setIsPageLoading(false)
      return
    }

    setIsSyncing(true)
    try {
      const tempInstallationId = localStorage.getItem('temp_installation_id')
      const installationIdToUse = tempInstallationId || user?.installationID

      const response = await fetch(`${import.meta.env.VITE_APP_INTEGRATION_URL}/api/v1/sync/repos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          installationId: installationIdToUse ? String(installationIdToUse) : undefined,
        }),
      })

      if (response.ok) {
        const resData = await response.json()
        if (resData.success) {
          setRepos(resData.data || [])
          toast.success('Repositories synchronized successfully!')

          if (tempInstallationId) {
            const updatedUser = { ...user, installationID: tempInstallationId }
            localStorage.setItem('user', JSON.stringify(updatedUser))
            localStorage.removeItem('temp_installation_id')
          }
        } else {
          toast.error(resData.message || 'Failed to sync repositories')
        }
      } else {
        toast.error('Sync failed. Please check App configurations.')
      }
    } catch (error) {
      console.error('Error syncing repos:', error)
      toast.error('Failed to sync repositories')
    } finally {
      setIsSyncing(false)
      setIsPageLoading(false)
    }
  }

  const handleTogglePrReviewer = async (repoId: string) => {
    const token = localStorage.getItem('token')
    if (!token) return

    setTogglingPrReviewer((prev) => ({ ...prev, [repoId]: true }))
    try {
      const response = await fetch(`${import.meta.env.VITE_APP_INTEGRATION_URL}/api/v1/pr-reviewer/update-status/${repoId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setRepos((prev) =>
          prev.map((r) => (r.id === repoId ? { ...r, prReviewer: !r.prReviewer } : r))
        )
        toast.success(data.message || 'PR reviewer status updated successfully')
      } else {
        toast.error('Failed to update reviewer status')
      }
    } catch (error) {
      console.error('Error toggling PR reviewer:', error)
      toast.error('Network error updating reviewer status')
    } finally {
      setTogglingPrReviewer((prev) => ({ ...prev, [repoId]: false }))
    }
  }

  const triggerScan = async (repoId: string) => {
    const token = localStorage.getItem('token')
    if (!token) return

    setScanStatus((prev) => ({
      ...prev,
      [repoId]: { id: '', status: 'QUEUED' }
    }))

    try {
      const response = await fetch(`${import.meta.env.VITE_SECURE_BOT_URL}/api/secure-bot/scan/repo/${repoId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          const scan = data.data
          setScanStatus((prev) => ({
            ...prev,
            [repoId]: { id: scan.id, status: scan.status }
          }))
          toast.success('Security scan job queued successfully!')
          pollScanStatus(repoId, scan.id)
        } else {
          setScanStatus((prev) => ({
            ...prev,
            [repoId]: { id: '', status: 'FAILED', error: data.message || 'Failed to start scan' }
          }))
          toast.error(data.message || 'Scan could not be started')
        }
      } else {
        setScanStatus((prev) => ({
          ...prev,
          [repoId]: { id: '', status: 'FAILED', error: 'Failed to initiate scan' }
        }))
        toast.error('Failed to initiate scan')
      }
    } catch (error: any) {
      console.error('Error starting scan:', error)
      setScanStatus((prev) => ({
        ...prev,
        [repoId]: { id: '', status: 'FAILED', error: error.message || 'Network error' }
      }))
      toast.error('Failed to initiate scan')
    }
  }

  const pollScanStatus = (repoId: string, targetScanId: string) => {
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${import.meta.env.VITE_SECURE_BOT_URL}/api/secure-bot/scan/status/${targetScanId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            const scan = data.data
            setScanStatus((prev) => ({
              ...prev,
              [repoId]: {
                id: targetScanId,
                status: scan.status,
                error: scan.error || undefined,
                findingsCount: scan.findings?.length || 0
              }
            }))
            if (scan.status === 'SUCCESS' || scan.status === 'FAILED') {
              clearInterval(interval)
              if (scan.status === 'SUCCESS') {
                toast.success('Scan complete! Opening findings explorer...')
                setActiveScanIdForFindings(targetScanId)
              } else {
                toast.error(`Scan failed: ${scan.error || 'Unknown scanner error'}`)
              }
            }
          }
        } else {
          clearInterval(interval)
        }
      } catch (error) {
        console.error('Error polling status:', error)
        clearInterval(interval)
      }
    }, 2500)
  }

  const handleFixFinding = async (findingId: string) => {
    const token = localStorage.getItem('token')
    if (!token) return

    setFixingFindingId(findingId)
    try {
      const response = await fetch(`${import.meta.env.VITE_SECURE_BOT_URL}/api/secure-bot/fix/finding/${findingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        toast.success('Fix applied successfully!')
        setFixResults((prev) => ({
          ...prev,
          [findingId]: {
            explanation: data.explanation || 'Remediation completed by securing the codebase logic.',
            code: data.code || ''
          }
        }))
        setExpandedFixIds((prev) => ({
          ...prev,
          [findingId]: true
        }))
        setFindings((prev) =>
          prev.map((f) => (f.id === findingId ? { ...f, status: 'RESOLVED' } : f))
        )
      } else {
        toast.error('Failed to apply automated patch')
      }
    } catch (error) {
      console.error('Error applying patch:', error)
      toast.error('Network error applying patch')
    } finally {
      setFixingFindingId(null)
    }
  }

  const handleFixSelected = async () => {
    const token = localStorage.getItem('token')
    if (!token || selectedFindingIds.length === 0) return

    setFixingAll(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_SECURE_BOT_URL}/api/secure-bot/fix/findings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          findingIds: selectedFindingIds
        })
      })

      if (response.ok) {
        const resData = await response.json()
        toast.success('Bulk fixes generated successfully!')

        setFindings((prev) =>
          prev.map((f) => (selectedFindingIds.includes(f.id) ? { ...f, status: 'RESOLVED' } : f))
        )

        const newFixResults = { ...fixResults }
        const newExpandedFixIds = { ...expandedFixIds }

        if (resData.results && Array.isArray(resData.results)) {
          const sanitizePath = (p: string) => p.replace(/^\/?(repo|src)\//, '')
          resData.results.forEach((res: any) => {
            const resSanitized = sanitizePath(res.filePath)
            findings.forEach((f) => {
              if (selectedFindingIds.includes(f.id)) {
                const fSanitized = sanitizePath(f.filePath)
                if (fSanitized === resSanitized) {
                  newFixResults[f.id] = {
                    explanation: res.explanation,
                    code: res.fixedCode
                  }
                  newExpandedFixIds[f.id] = true
                }
              }
            })
          })
        }

        setFixResults(newFixResults)
        setExpandedFixIds(newExpandedFixIds)
        setSelectedFindingIds([])
      } else {
        toast.error('Failed to apply bulk fixes')
      }
    } catch (error) {
      console.error('Error applying bulk fixes:', error)
      toast.error('Failed to connect to fixing service')
    } finally {
      setFixingAll(false)
    }
  }

  const openPR = async () => {
    if (!activeScanIdForFindings) return
    const token = localStorage.getItem('token')
    if (!token) return

    setIsPrOpening(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_SECURE_BOT_URL}/api/secure-bot/pr/open-pr/${activeScanIdForFindings}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        toast.success('Pull Request opened successfully!')
        if (data.pr && data.pr.html_url) {
          setOpenedPrUrl(data.pr.html_url)
          window.open(data.pr.html_url, '_blank')
        }
      } else {
        const data = await response.json()
        toast.error(data.message || 'Failed to create Pull Request')
      }
    } catch (error) {
      console.error('Error creating PR:', error)
      toast.error('Failed to create Pull Request')
    } finally {
      setIsPrOpening(false)
    }
  }

  const handleInspectFixes = async (scanId: string) => {
    const token = localStorage.getItem('token')
    if (!token) return

    const resolveToastId = toast.loading('Locating Pull Request...')
    try {
      const response = await fetch(`${import.meta.env.VITE_SECURE_BOT_URL}/api/secure-bot/pr/pr-url/${scanId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.prUrl) {
          toast.success('Redirecting to Pull Request...', { id: resolveToastId })
          window.open(data.prUrl, '_blank')
          return
        }
      }
      toast.success('No open PR found for this scan. Opening local fixes...', { id: resolveToastId })
      setActiveScanIdForFindings(scanId)
    } catch (error) {
      console.error('Error finding PR:', error)
      toast.dismiss(resolveToastId)
      setActiveScanIdForFindings(scanId)
    }
  }

  const calculateSecurityScore = (findingsList: Finding[]) => {
    if (findingsList.length === 0) return { score: 'A+', color: 'text-emerald-400' }
    const criticals = findingsList.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').length
    const mediums = findingsList.filter(f => f.severity === 'MEDIUM').length
    
    if (criticals === 0 && mediums === 0) return { score: 'A', color: 'text-emerald-400' }
    if (criticals === 0 && mediums > 0) return { score: 'B', color: 'text-yellow-400' }
    if (criticals === 1) return { score: 'C', color: 'text-orange-400' }
    if (criticals > 1 && criticals < 5) return { score: 'D', color: 'text-red-400' }
    return { score: 'F', color: 'text-red-500 font-extrabold' }
  }

  const handleLogout = () => {
    clearUser()
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('temp_installation_id')
    toast.success('Logged out successfully')
    navigate('/auth')
  }

  return (
    <div className="relative flex min-h-screen w-full bg-black text-white font-sans pl-64">
      {/* ─── Left Sidebar ─── */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-white/[0.08] bg-neutral-950 flex flex-col justify-between z-30">
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <Shield className="w-5 h-5 text-white" />
            <span className="text-sm font-black tracking-[0.25em] uppercase text-white">aegis</span>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] mb-8">
            {user?.avatar ? (
              <img src={user.avatar} className="w-9 h-9 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs">
                {user ? (user.name || user.username).slice(0, 2).toUpperCase() : '?'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user?.name || user?.username}</p>
              <p className="text-[10px] text-neutral-500 truncate">@{user?.username}</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="space-y-1.5">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block px-3 mb-2">Workspace</span>
            {[
              { id: 'repositories', label: 'Security Scan & Fix', icon: Shield },
              { id: 'scans', label: 'Security Scans', icon: Database },
              { id: 'fixes', label: 'Scan Fixes', icon: CheckCircle2 },
              { id: 'reviewer', label: 'Auto PR Reviewer', icon: GitPullRequest },
              { id: 'overview', label: 'Configurations', icon: User }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveScanIdForFindings(null)
                    setActiveTab(tab.id as any)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === tab.id && !activeScanIdForFindings
                      ? 'bg-white text-black font-bold'
                      : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/[0.08] space-y-1.5">
          <Link
            to="/"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-all"
          >
            <Home className="w-4 h-4 shrink-0" />
            Back to Home
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-neutral-400 hover:text-red-400 hover:bg-red-950/20 transition-all cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ─── Right Centered Wide Content Area ─── */}
      <main className="flex-1 bg-black p-8 md:p-12 overflow-y-auto w-full max-w-[1400px] mx-auto">
        
        {isPageLoading ? (
          <div className="space-y-8 animate-pulse">
            <div className="h-8 bg-neutral-900 rounded-lg w-1/3" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="h-32 bg-neutral-900 border border-white/[0.04] rounded-xl" />
              <div className="h-32 bg-neutral-900 border border-white/[0.04] rounded-xl" />
              <div className="h-32 bg-neutral-900 border border-white/[0.04] rounded-xl" />
            </div>
            <div className="h-64 bg-neutral-900 border border-white/[0.04] rounded-xl" />
          </div>
        ) : activeScanIdForFindings ? (
          /* ─── Center Findings Page View (Keeping sidebar visible) ─── */
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveScanIdForFindings(null)}
                className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors font-semibold text-sm cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to List
              </button>

              {findings.some((f) => f.status === 'RESOLVED') && (
                <div>
                  {openedPrUrl ? (
                    <a
                      href={openedPrUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 border border-emerald-500/20 bg-emerald-950/20 text-emerald-400 font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-emerald-950/40 transition-all"
                    >
                      🎉 View Pull Request ↗
                    </a>
                  ) : (
                    <button
                      onClick={openPR}
                      disabled={isPrOpening}
                      className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs px-4 py-2.5 rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                    >
                      <GitPullRequest className="w-3.5 h-3.5" />
                      {isPrOpening ? 'Creating PR...' : '🚀 Staged fixes ready: Open Pull Request'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {isFindingsLoading ? (
              <div className="space-y-6 animate-pulse">
                <div className="h-10 bg-neutral-900 rounded-lg w-1/3" />
                <div className="h-64 bg-neutral-900 border border-white/[0.04] rounded-xl" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header details inside modal view */}
                <div className="border border-white/[0.08] rounded-xl bg-neutral-950 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                      <Shield className="w-6 h-6 text-emerald-400" />
                      Findings: {repoName || 'Evaluating codebase...'}
                    </h1>
                    <p className="text-xs text-neutral-400">
                      Scan UUID: <code className="font-mono text-neutral-300 bg-white/5 px-2 py-0.5 rounded">{activeScanIdForFindings}</code>
                    </p>
                  </div>

                  {findings.length > 0 && (
                    <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] px-4 py-2.5 rounded-xl">
                      <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Security Grade</span>
                      <span className={`text-3xl font-black leading-none ${calculateSecurityScore(findings).color}`}>
                        {calculateSecurityScore(findings).score}
                      </span>
                    </div>
                  )}
                </div>

                {/* Findings Cards List */}
                {findings.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-white/[0.08] rounded-xl space-y-4 bg-neutral-950">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <div>
                      <h3 className="text-sm font-bold text-white">No Vulnerabilities Detected</h3>
                      <p className="text-neutral-500 text-xs mt-1">Excellent! Your repository code matches Aegis security standards.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Bulk patch selection header */}
                    {findings.some((f) => f.status !== 'RESOLVED') && (
                      <div className="border border-white/[0.08] bg-neutral-950 p-4 rounded-xl flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={
                              findings.filter((f) => f.status !== 'RESOLVED').length > 0 &&
                              findings
                                .filter((f) => f.status !== 'RESOLVED')
                                .every((f) => selectedFindingIds.includes(f.id))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                const unresolvedIds = findings
                                  .filter((f) => f.status !== 'RESOLVED')
                                  .map((f) => f.id)
                                setSelectedFindingIds(unresolvedIds)
                              } else {
                                setSelectedFindingIds([])
                              }
                            }}
                            className="w-4 h-4 cursor-pointer accent-white"
                          />
                          <span className="font-bold text-neutral-300">Select All Unresolved Findings</span>
                        </div>
                        {selectedFindingIds.length > 0 && (
                          <button
                            onClick={handleFixSelected}
                            disabled={fixingAll}
                            className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-4 py-2 rounded-lg active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer text-xs"
                          >
                            {fixingAll ? 'Fixing Selected...' : `Fix Selected (${selectedFindingIds.length})`}
                          </button>
                        )}
                      </div>
                    )}

                    <div className="space-y-4">
                      {findings.slice((findingsPage - 1) * FINDINGS_PER_PAGE, findingsPage * FINDINGS_PER_PAGE).map((finding) => (
                        <div
                          key={finding.id}
                          className="border border-white/[0.08] rounded-xl bg-neutral-950 p-6 space-y-4 hover:border-white/[0.12] transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                {finding.status !== 'RESOLVED' && (
                                  <input
                                    type="checkbox"
                                    checked={selectedFindingIds.includes(finding.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedFindingIds((prev) => [...prev, finding.id])
                                      } else {
                                        setSelectedFindingIds((prev) =>
                                          prev.filter((id) => id !== finding.id)
                                        )
                                      }
                                    }}
                                    className="w-4 h-4 cursor-pointer accent-white"
                                  />
                                )}
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  finding.severity === 'CRITICAL' || finding.severity === 'HIGH'
                                    ? 'bg-red-950 border border-red-500/30 text-red-400'
                                    : finding.severity === 'MEDIUM'
                                    ? 'bg-yellow-950 border border-yellow-500/30 text-yellow-400'
                                    : 'bg-neutral-800 border border-white/[0.06] text-neutral-400'
                                  }`}>
                                  {finding.severity}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                                  {finding.tool}
                                </span>
                              </div>
                              <h3 className="text-base font-bold text-white tracking-tight pt-1">
                                {finding.title}
                              </h3>
                              <code className="text-xs font-mono text-neutral-500 block truncate max-w-xl">
                                File: {finding.filePath}:{finding.line || 1}
                              </code>
                            </div>

                            <div className="shrink-0 pt-1">
                              {finding.status === 'RESOLVED' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Patched
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleFixFinding(finding.id)}
                                  disabled={fixingFindingId === finding.id}
                                  className="inline-flex items-center gap-1.5 border border-white/10 hover:border-white/20 bg-white/[0.03] text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                                >
                                  {fixingFindingId === finding.id ? 'Fixing...' : 'Auto Fix'}
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-neutral-400 text-xs md:text-sm leading-relaxed border-t border-white/[0.04] pt-3">
                            {finding.description}
                          </p>

                          {/* Collapsible AI fix panel */}
                          {finding.status === 'RESOLVED' && fixResults[finding.id] && (
                            <div className="border border-white/[0.06] rounded-xl overflow-hidden mt-3 bg-neutral-900 text-xs animate-in slide-in-from-top duration-200">
                              <button
                                onClick={() => {
                                  setExpandedFixIds((prev) => ({
                                    ...prev,
                                    [finding.id]: !prev[finding.id]
                                  }))
                                }}
                                className="w-full bg-white/[0.02] border-b border-white/[0.06] px-4 py-2 flex items-center justify-between text-neutral-400 hover:text-white transition-colors cursor-pointer text-left font-semibold"
                              >
                                <span className="flex items-center gap-1.5 text-emerald-400">
                                  <Terminal className="w-3.5 h-3.5" /> AI Remediation Applied
                                </span>
                                {expandedFixIds[finding.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>

                              {expandedFixIds[finding.id] && (
                                <div className="p-4 space-y-3">
                                  <div>
                                    <p className="text-neutral-400 font-semibold mb-1 text-[10px] uppercase tracking-wider">AI Explanation</p>
                                    <p className="text-neutral-300 leading-relaxed font-sans">{fixResults[finding.id].explanation}</p>
                                  </div>
                                  <div>
                                    <p className="text-neutral-400 font-semibold mb-1 text-[10px] uppercase tracking-wider">Patched Code Block</p>
                                    <pre className="p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-950/10 font-mono text-emerald-300/90 overflow-x-auto whitespace-pre leading-relaxed select-all">
                                      <code>{fixResults[finding.id].code}</code>
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      <Pagination
                        currentPage={findingsPage}
                        totalItems={findings.length}
                        itemsPerPage={FINDINGS_PER_PAGE}
                        onPageChange={setFindingsPage}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* TAB 1: SECURITY SCAN & FIX (Feature 1 - Repos list) */}
            {activeTab === 'repositories' && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">AI Security Scan & Fix</h1>
                    <p className="text-neutral-400 text-sm">Run sandbox vulnerability evaluations, generate secure patches, and stage PRs.</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSync}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-2 border border-white/10 hover:border-white/20 bg-white/[0.03] text-white font-bold text-xs px-4 py-2.5 rounded-lg active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Syncing...' : 'Sync Repositories'}
                    </button>
                    {user?.installationID && (
                      <a
                        href={`https://github.com/settings/installations/${user.installationID}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 border border-white/10 hover:border-white/20 bg-white/[0.03] text-white font-bold text-xs px-4 py-2.5 rounded-lg active:scale-[0.98] transition-all"
                      >
                        Configure Repositories
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {repos.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-white/[0.08] rounded-xl space-y-4 bg-neutral-950">
                    <Database className="w-8 h-8 text-neutral-600 mx-auto animate-pulse" />
                    <div>
                      <h3 className="text-sm font-bold text-white">No Repositories Synced</h3>
                      <p className="text-neutral-500 text-xs mt-1">Please configure the GitHub App and click sync repositories to import them.</p>
                    </div>
                    <button
                      onClick={handleSync}
                      className="bg-white text-black font-bold text-xs px-4 py-2 rounded-lg hover:bg-neutral-200 transition-all cursor-pointer"
                    >
                      Sync Repositories
                    </button>
                  </div>
                ) : (
                  <div className="border border-white/[0.08] rounded-xl bg-neutral-950 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.08] text-xs font-bold text-neutral-500 uppercase bg-white/[0.02]">
                          <th className="p-4 pl-6">Repository Name</th>
                          <th className="p-4">GitHub URL</th>
                          <th className="p-4 text-center">Security Scan Status</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-white/[0.04]">
                        {repos.slice((reposPage - 1) * ITEMS_PER_PAGE, reposPage * ITEMS_PER_PAGE).map((repo) => {
                          const scanInfo = scanStatus[repo.id]
                          return (
                            <tr key={repo.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="p-4 pl-6 font-semibold text-white">{repo.repo_name}</td>
                              <td className="p-4">
                                <a
                                  href={repo.repo_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-neutral-400 hover:text-white transition-colors"
                                >
                                  Open GitHub
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </td>
                              <td className="p-4 text-center">
                                {scanInfo ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <span
                                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                        scanInfo.status === 'SUCCESS'
                                          ? 'bg-emerald-950 border border-emerald-500/20 text-emerald-400'
                                          : scanInfo.status === 'FAILED'
                                          ? 'bg-red-950 border border-red-500/20 text-red-400'
                                          : 'bg-blue-950 border border-blue-500/20 text-blue-400'
                                      }`}
                                    >
                                      Status: {scanInfo.status}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-neutral-500 font-medium">Not Scanned Yet</span>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => triggerScan(repo.id)}
                                    disabled={scanInfo?.status === 'QUEUED' || scanInfo?.status === 'IN_PROGRESS'}
                                    className="inline-flex items-center gap-1 bg-white text-black font-bold text-xs px-2.5 py-1.5 rounded-lg hover:bg-neutral-200 transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    {scanInfo?.status === 'QUEUED' || scanInfo?.status === 'IN_PROGRESS' ? 'Scanning...' : 'Scan Now'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <Pagination
                      currentPage={reposPage}
                      totalItems={repos.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                      onPageChange={setReposPage}
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SECURITY SCANS HISTORY */}
            {activeTab === 'scans' && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Security Scans History</h1>
                  <p className="text-neutral-400 text-sm">Review historical security evaluation reports for user repositories.</p>
                </div>

                {isScansLoading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-12 bg-neutral-900 rounded-lg w-full" />
                    <div className="h-12 bg-neutral-900 rounded-lg w-full" />
                    <div className="h-12 bg-neutral-900 rounded-lg w-full" />
                  </div>
                ) : scans.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-white/[0.08] rounded-xl bg-neutral-950 space-y-4">
                    <Shield className="w-8 h-8 text-neutral-600 mx-auto" />
                    <div>
                      <h3 className="text-sm font-bold text-white">No Scans Recorded</h3>
                      <p className="text-neutral-500 text-xs mt-1">Start a security scan on any repository to begin evaluation.</p>
                    </div>
                  </div>
                ) : (
                  <div className="border border-white/[0.08] rounded-xl bg-neutral-950 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.08] text-xs font-bold text-neutral-500 uppercase bg-white/[0.02]">
                          <th className="p-4 pl-6">Scan ID</th>
                          <th className="p-4">Repository Name</th>
                          <th className="p-4 text-center">Status</th>
                          <th className="p-4 text-center">Findings Detected</th>
                          <th className="p-4 text-center">Date Created</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-white/[0.04]">
                        {scans.map((scanItem) => (
                          <tr key={scanItem.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="p-4 pl-6 font-mono text-xs text-neutral-300">{scanItem.id.substring(0, 8)}</td>
                            <td className="p-4 font-semibold text-white">{scanItem.repoName}</td>
                            <td className="p-4 text-center">
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  scanItem.status === 'SUCCESS'
                                    ? 'bg-emerald-950 border border-emerald-500/20 text-emerald-400'
                                    : scanItem.status === 'FAILED'
                                    ? 'bg-red-950 border border-red-500/20 text-red-400'
                                    : 'bg-blue-950 border border-blue-500/20 text-blue-400'
                                }`}
                              >
                                {scanItem.status}
                              </span>
                            </td>
                            <td className="p-4 text-center font-bold text-neutral-200">
                              {scanItem.findings?.length || 0} issues
                            </td>
                            <td className="p-4 text-center text-xs text-neutral-400">
                              {new Date(scanItem.createdAt).toLocaleString()}
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => setActiveScanIdForFindings(scanItem.id)}
                                className="inline-flex items-center gap-1 border border-white/10 hover:border-white/20 bg-white/[0.03] text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                              >
                                📋 View Findings
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <Pagination
                      currentPage={scansPage}
                      totalItems={totalScans}
                      itemsPerPage={SCANS_PER_PAGE}
                      onPageChange={setScansPage}
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SCAN FIXES */}
            {activeTab === 'fixes' && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Scan Fixes Console</h1>
                  <p className="text-neutral-400 text-sm">Review scans containing resolved vulnerabilities and secure code patches.</p>
                </div>

                {isScansLoading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-12 bg-neutral-900 rounded-lg w-full" />
                    <div className="h-12 bg-neutral-900 rounded-lg w-full" />
                  </div>
                ) : fixesScans.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-white/[0.08] rounded-xl bg-neutral-950 space-y-4">
                    <CheckCircle2 className="w-8 h-8 text-neutral-600 mx-auto" />
                    <div>
                      <h3 className="text-sm font-bold text-white">No Fixed Scans Yet</h3>
                      <p className="text-neutral-500 text-xs mt-1">Select findings from your scans and apply AI fixes to view them here.</p>
                    </div>
                  </div>
                ) : (
                  <div className="border border-white/[0.08] rounded-xl bg-neutral-950 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.08] text-xs font-bold text-neutral-500 uppercase bg-white/[0.02]">
                          <th className="p-4 pl-6">Scan ID</th>
                          <th className="p-4">Repository Name</th>
                          <th className="p-4 text-center">Patched Vulnerabilities</th>
                          <th className="p-4 text-center">Date Remedied</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-white/[0.04]">
                        {fixesScans.map((scanItem) => {
                          const resolvedCount = scanItem.findings.filter((f: any) => f.status === 'RESOLVED').length
                          return (
                            <tr key={scanItem.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="p-4 pl-6 font-mono text-xs text-neutral-300">{scanItem.id.substring(0, 8)}</td>
                              <td className="p-4 font-semibold text-white">{scanItem.repoName}</td>
                              <td className="p-4 text-center text-emerald-400 font-bold">
                                ✓ {resolvedCount} resolved
                              </td>
                              <td className="p-4 text-center text-xs text-neutral-400">
                                {new Date(scanItem.updatedAt).toLocaleString()}
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => handleInspectFixes(scanItem.id)}
                                  className="inline-flex items-center gap-1 border border-emerald-500/20 bg-emerald-950/20 text-emerald-400 font-bold text-xs px-3.5 py-1.5 rounded-lg hover:bg-emerald-950/40 transition-all cursor-pointer"
                                >
                                  Inspect Fixes
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <Pagination
                      currentPage={fixesPage}
                      totalItems={totalFixes}
                      itemsPerPage={SCANS_PER_PAGE}
                      onPageChange={setFixesPage}
                    />
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: AUTO PR REVIEWER (Feature 2) */}
            {activeTab === 'reviewer' && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">AI Pull Request Reviewer</h1>
                    <p className="text-neutral-400 text-sm">Toggle automated, continuous AI-driven review comments on your GitHub Pull Requests.</p>
                  </div>
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-2 border border-white/10 hover:border-white/20 bg-white/[0.03] text-white font-bold text-xs px-4 py-2.5 rounded-lg active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Repositories'}
                  </button>
                </div>

                {repos.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-white/[0.08] rounded-xl space-y-4 bg-neutral-950">
                    <Database className="w-8 h-8 text-neutral-600 mx-auto animate-pulse" />
                    <div>
                      <h3 className="text-sm font-bold text-white">No Repositories Synced</h3>
                      <p className="text-neutral-500 text-xs mt-1">Please configure the GitHub App and click sync repositories to import them.</p>
                    </div>
                    <button
                      onClick={handleSync}
                      className="bg-white text-black font-bold text-xs px-4 py-2 rounded-lg hover:bg-neutral-200 transition-all cursor-pointer"
                    >
                      Sync Repositories
                    </button>
                  </div>
                ) : (
                  <div className="border border-white/[0.08] rounded-xl bg-neutral-950 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.08] text-xs font-bold text-neutral-500 uppercase bg-white/[0.02]">
                          <th className="p-4 pl-6">Repository Name</th>
                          <th className="p-4">GitHub URL</th>
                          <th className="p-4 text-center">Auto PR Reviewer Status</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-white/[0.04]">
                        {repos.slice((reviewerPage - 1) * ITEMS_PER_PAGE, reviewerPage * ITEMS_PER_PAGE).map((repo) => (
                          <tr key={repo.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="p-4 pl-6 font-semibold text-white">{repo.repo_name}</td>
                            <td className="p-4">
                              <a
                                href={repo.repo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-neutral-400 hover:text-white transition-colors"
                              >
                                Open GitHub
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </td>
                            <td className="p-4 text-center font-semibold">
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  repo.prReviewer
                                    ? 'bg-emerald-950 border border-emerald-500/20 text-emerald-400'
                                    : 'bg-neutral-800 border border-white/[0.06] text-neutral-400'
                                }`}
                              >
                                {repo.prReviewer ? 'Active / Enabled' : 'Disabled'}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleTogglePrReviewer(repo.id)}
                                disabled={!!togglingPrReviewer[repo.id]}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  repo.prReviewer
                                    ? 'bg-neutral-900 border border-white/[0.06] text-neutral-400 hover:text-white'
                                    : 'bg-white text-black hover:bg-neutral-200'
                                }`}
                              >
                                {togglingPrReviewer[repo.id] ? 'Updating...' : repo.prReviewer ? 'Disable Reviewer' : 'Enable Reviewer'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <Pagination
                      currentPage={reviewerPage}
                      totalItems={repos.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                      onPageChange={setReviewerPage}
                    />
                  </div>
                )}

                <div className="border border-white/[0.08] rounded-xl bg-neutral-950 p-6 space-y-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <GitPullRequest className="w-5 h-5 text-emerald-400" /> Webhook Integration Details
                  </h2>
                  <p className="text-neutral-400 text-sm leading-relaxed">
                    Aegis listens to GitHub webhook triggers. When a contributor creates a Pull Request, re-opens one, or pushes new commits:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-neutral-400 pl-4">
                    <li>The webhook triggers an automated analysis on the file diffs.</li>
                    <li>Secure bot evaluates code security, quality standards, and potential performance bugs.</li>
                    <li>The bot comments inline suggestions directly onto target lines on GitHub, simplifying PR reviews.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 5: CONFIGURATIONS */}
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Account Configurations</h1>
                  <p className="text-neutral-400 text-sm">Review your operator details and authorized credentials.</p>
                </div>

                <div className="border border-white/[0.08] rounded-xl bg-neutral-950 p-6 space-y-6">
                  <div className="space-y-4 text-sm max-w-xl">
                    <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
                      <span className="text-neutral-500 font-medium">Aegis Operator UUID</span>
                      <code className="text-neutral-300 font-mono text-xs select-all bg-white/5 px-2 py-0.5 rounded border border-white/[0.03]">
                        {user?.id}
                      </code>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
                      <span className="text-neutral-500 font-medium">Email Address</span>
                      <span className="text-neutral-300 font-semibold">{user?.email || 'Not shared'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-neutral-500 font-medium">GitHub App Installation</span>
                      {user?.installationID && user.installationID !== 'null' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-0.5 rounded animate-in fade-in duration-300">
                          Active (ID: {user.installationID})
                        </span>
                      ) : (
                        <a
                          href="https://github.com/apps/aegisbykeshav"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-cyan-400 hover:underline text-xs font-semibold"
                        >
                          Setup Aegis App
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default Dashboard
