import { useState, useEffect } from 'react'
import { useUserStore } from '../store/useUserStore'
import { useDashboardStore } from '../store/useDashboardStore'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  Shield,
  Home,
  LogOut,
  User,
  GitPullRequest,
  Database,
  CheckCircle2
} from 'lucide-react'
import RepositoriesTab from '../components/dashboard/RepositoriesTab'
import ScansHistoryTab from '../components/dashboard/ScansHistoryTab'
import FixesConsoleTab from '../components/dashboard/FixesConsoleTab'
import PrReviewerTab from '../components/dashboard/PrReviewerTab'
import ConfigurationsTab from '../components/dashboard/ConfigurationsTab'
import FindingsExplorer from '../components/dashboard/FindingsExplorer'



const Dashboard = () => {
  const { user, isAuthenticated, clearUser } = useUserStore()
  const navigate = useNavigate()

  const {
    repos,
    setRepos,
    totalRepos,
    setTotalRepos,
    scans,
    setScans,
    totalScans,
    setTotalScans,
    fixesScans,
    setFixesScans,
    totalFixes,
    setTotalFixes,
    findings,
    setFindings,
    activeScanIdForFindings,
    setActiveScanIdForFindings,
    lastFetchedScanId,
    setLastFetchedScanId,
    repoName,
    setRepoName,
    scanStatus,
    setScanStatus,
    updateSingleScanStatus,
    fixResults,
    setFixResults,
    expandedFixIds,
    setExpandedFixIds,
    selectedFindingIds,
    setSelectedFindingIds,
    openedPrUrl,
    setOpenedPrUrl,
    fixingFindingId,
    setFixingFindingId,
    fixingAll,
    setFixingAll,
    isFindingsLoading,
    setIsFindingsLoading,
    isPrOpening,
    setIsPrOpening,
    resetFindingsState,
  } = useDashboardStore()

  // Dashboard Navigation State (Persisted across reloads)
  const [activeTab, setActiveTab] = useState<'repositories' | 'scans' | 'fixes' | 'reviewer' | 'overview'>(() => {
    const savedTab = localStorage.getItem('activeTab')
    return (savedTab as any) || 'repositories'
  })
  const [isSyncing, setIsSyncing] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isScansLoading, setIsScansLoading] = useState(false)

  const [togglingPrReviewer, setTogglingPrReviewer] = useState<Record<string, boolean>>({})

  // Pagination constants & states
  const SCANS_PER_PAGE = 9
  const FINDINGS_PER_PAGE = 5

  const [reposPage, setReposPage] = useState(1)
  const [reviewerPage, setReviewerPage] = useState(1)
  const [scansPage, setScansPage] = useState(1)
  const [fixesPage, setFixesPage] = useState(1)
  const [findingsPage, setFindingsPage] = useState(1)

  // 0. Auto polling effect for any running/queued scans in scans list
  useEffect(() => {
    const activeScans = scans.filter(s => s.status === 'QUEUED' || s.status === 'IN_PROGRESS')
    if (activeScans.length === 0) return

    const intervals = activeScans.map(s => {
      const interval = setInterval(async () => {
        try {
          const token = localStorage.getItem('token')
          const response = await fetch(`${import.meta.env.VITE_SECURE_BOT_URL}/api/secure-bot/scan/status/${s.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data) {
              const updatedScan = data.data
              if (updatedScan.status !== s.status) {
                // Update in scans list
                setScans(scans.map(item => item.id === s.id ? { ...item, status: updatedScan.status, error: updatedScan.error } : item))
                
                // If it is also mapped in scanStatus (active repositories tab), update it there!
                const matchedRepo = repos.find(r => r.id === s.repositoryId)
                if (matchedRepo) {
                  updateSingleScanStatus(matchedRepo.id, {
                    id: s.id,
                    status: updatedScan.status,
                    error: updatedScan.error || undefined,
                    findingsCount: updatedScan.findings?.length || 0
                  })
                }

                if (updatedScan.status === 'SUCCESS') {
                  toast.success(`Scan ${s.id.substring(0, 8)} completed successfully!`)
                  fetchScanHistory(scansPage)
                } else if (updatedScan.status === 'FAILED') {
                  toast.error(`Scan ${s.id.substring(0, 8)} failed: ${updatedScan.error || 'Unknown error'}`)
                  fetchScanHistory(scansPage)
                }
              }
            }
          }
        } catch (err) {
          console.error('Error auto-polling scan status:', err)
        }
      }, 3000)
      return { interval, scanId: s.id }
    })

    return () => {
      intervals.forEach(i => clearInterval(i.interval))
    }
  }, [scans, scansPage, repos])

  // Reset pagination when switching views & persist active tab state
  useEffect(() => {
    setReposPage(1)
    setReviewerPage(1)
    setScansPage(1)
    setFixesPage(1)
    setFindingsPage(1)
    localStorage.setItem('activeTab', activeTab)
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
      loadReposFromDb(1)
    } else {
      setIsPageLoading(false)
    }
  }, [isAuthenticated])

  // Fetch repos, scans history, or fixes when relevant tab or page changes
  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'repositories') {
        loadReposFromDb(reposPage)
      } else if (activeTab === 'reviewer') {
        loadReposFromDb(reviewerPage)
      } else if (activeTab === 'scans') {
        fetchScanHistory(scansPage)
      } else if (activeTab === 'fixes') {
        fetchFixesHistory(fixesPage)
      }
    }
  }, [activeTab, scansPage, fixesPage, reposPage, reviewerPage, isAuthenticated])

  // Load findings details when activeScanIdForFindings is set
  useEffect(() => {
    if (activeScanIdForFindings) {
      // Only fetch if findings are empty OR we switched to a different scan ID to preserve active fix loading states!
      if (activeScanIdForFindings !== lastFetchedScanId || findings.length === 0) {
        fetchScanFindings(activeScanIdForFindings)
      }
    }
  }, [activeScanIdForFindings, lastFetchedScanId, findings.length])

  const loadReposFromDb = async (page = (activeTab === 'reviewer' ? reviewerPage : reposPage)) => {
    try {
      setIsPageLoading(true)
      const token = localStorage.getItem('token')
      if (!token) return
      const response = await fetch(`${import.meta.env.VITE_APP_INTEGRATION_URL}/api/v1/repos?page=${page}&limit=9`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRepos(data.data || [])
          if (data.pagination) {
            setTotalRepos(data.pagination.total || 0)
          }
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
      resetFindingsState()
      setFindings([])

      const token = localStorage.getItem('token')

      try {
        const prRes = await fetch(`${import.meta.env.VITE_SECURE_BOT_URL}/api/secure-bot/pr/pr-url/${scanId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (prRes.ok) {
          const prData = await prRes.json()
          if (prData.prUrl) {
            setOpenedPrUrl(prData.prUrl)
          }
        }
      } catch (prErr) {
        console.warn('Error fetching PR URL on findings page load:', prErr)
      }

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
          setLastFetchedScanId(scanId)

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
          setReposPage(1)
          loadReposFromDb(1)
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
        
        const explanationText = data.explanation || 'Remediation completed by securing the codebase logic.'
        const codeDiff = data.code || ''

        setFixResults((prev) => ({
          ...prev,
          [findingId]: {
            explanation: explanationText,
            code: codeDiff
          }
        }))
        setExpandedFixIds((prev) => ({
          ...prev,
          [findingId]: true
        }))
        setFindings((prev) =>
          prev.map((f) => (f.id === findingId ? {
            ...f,
            status: 'RESOLVED',
            rawDetails: {
              fixDiff: codeDiff,
              fixExplanation: explanationText
            }
          } : f))
        )

        // Automatically fetch live status of scan findings
        if (activeScanIdForFindings) {
          fetchScanFindings(activeScanIdForFindings)
        }
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

        setFindings((prev) =>
          prev.map((f) => {
            if (selectedFindingIds.includes(f.id)) {
              return {
                ...f,
                status: 'RESOLVED',
                rawDetails: {
                  fixDiff: newFixResults[f.id]?.code || '',
                  fixExplanation: newFixResults[f.id]?.explanation || ''
                }
              }
            }
            return f
          })
        )

        setFixResults(newFixResults)
        setExpandedFixIds(newExpandedFixIds)
        setSelectedFindingIds([])

        // Automatically fetch live status of scan findings
        if (activeScanIdForFindings) {
          fetchScanFindings(activeScanIdForFindings)
        }
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${activeTab === tab.id && !activeScanIdForFindings
                    ? 'bg-white/[0.06] text-white border-l-2 border-white pl-2 rounded-l-none font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03]'
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
          <FindingsExplorer
            findings={findings}
            findingsPage={findingsPage}
            FINDINGS_PER_PAGE={FINDINGS_PER_PAGE}
            setFindingsPage={setFindingsPage}
            selectedFindingIds={selectedFindingIds}
            setSelectedFindingIds={setSelectedFindingIds}
            fixingAll={fixingAll}
            handleFixSelected={handleFixSelected}
            fixingFindingId={fixingFindingId}
            handleFixFinding={handleFixFinding}
            fixResults={fixResults}
            expandedFixIds={expandedFixIds}
            setExpandedFixIds={setExpandedFixIds}
            repoName={repoName}
            activeScanIdForFindings={activeScanIdForFindings}
            isFindingsLoading={isFindingsLoading}
            openPR={openPR}
            isPrOpening={isPrOpening}
            openedPrUrl={openedPrUrl}
            handleInspectFixes={handleInspectFixes}
            setActiveScanIdForFindings={setActiveScanIdForFindings}
            onRefresh={() => fetchScanFindings(activeScanIdForFindings)}
          />
        ) : (
          <>
            {/* TAB 1: SECURITY SCAN & FIX (Feature 1 - Repos list) */}
            {activeTab === 'repositories' && (
              <RepositoriesTab
                repos={repos}
                reposPage={reposPage}
                totalRepos={totalRepos}
                setReposPage={setReposPage}
                scanStatus={scanStatus}
                isSyncing={isSyncing}
                handleSync={handleSync}
                triggerScan={triggerScan}
                user={user}
              />
            )}

            {/* TAB 2: SECURITY SCANS HISTORY */}
            {activeTab === 'scans' && (
              <ScansHistoryTab
                scans={scans}
                scansPage={scansPage}
                totalScans={totalScans}
                setScansPage={setScansPage}
                isScansLoading={isScansLoading}
                setActiveScanIdForFindings={setActiveScanIdForFindings}
                SCANS_PER_PAGE={SCANS_PER_PAGE}
              />
            )}

            {/* TAB 3: SCAN FIXES */}
            {activeTab === 'fixes' && (
              <FixesConsoleTab
                fixesScans={fixesScans}
                fixesPage={fixesPage}
                totalFixes={totalFixes}
                setFixesPage={setFixesPage}
                isScansLoading={isScansLoading}
                handleInspectFixes={handleInspectFixes}
                SCANS_PER_PAGE={SCANS_PER_PAGE}
              />
            )}

            {/* TAB 4: AUTO PR REVIEWER (Feature 2) */}
            {activeTab === 'reviewer' && (
              <PrReviewerTab
                repos={repos}
                reviewerPage={reviewerPage}
                totalRepos={totalRepos}
                setReviewerPage={setReviewerPage}
                isSyncing={isSyncing}
                handleSync={handleSync}
                handleTogglePrReviewer={handleTogglePrReviewer}
                togglingPrReviewer={togglingPrReviewer}
                user={user}
              />
            )}

            {/* TAB 5: CONFIGURATIONS */}
            {activeTab === 'overview' && (
              <ConfigurationsTab user={user} />
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default Dashboard
