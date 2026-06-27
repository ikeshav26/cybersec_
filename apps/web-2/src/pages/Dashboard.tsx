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
  AlertTriangle,
  User,
  ExternalLink,
  Lock,
  AlertCircle,
  Terminal,
  X,
  GitPullRequest,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

const Dashboard = () => {
  const { user, isAuthenticated, setUser, setIsAuthenticated, clearUser } = useUserStore()
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
        setUser(parsedUser)
        setIsAuthenticated(true)
        toast.success(`Welcome, @${parsedUser.username}!`)
        window.history.replaceState({}, document.title, window.location.pathname)
      } catch (err) {
        console.error('Failed to parse user redirect JSON:', err)
      }
    }

    if (installationIdFromUrl) {
      localStorage.setItem('temp_installation_id', installationIdFromUrl)
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    // Try reading credentials
    const token = localStorage.getItem('token')
    if (token) {
      loadReposFromDb()
    } else {
      setIsPageLoading(false)
    }
  }, [isAuthenticated])

  // Fetch scans history when relevant tab is selected
  useEffect(() => {
    if (isAuthenticated && (activeTab === 'scans' || activeTab === 'fixes')) {
      fetchScanHistory()
    }
  }, [activeTab, isAuthenticated])

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

  const fetchScanHistory = async () => {
    try {
      setIsScansLoading(true)
      const token = localStorage.getItem('token')
      if (!token) return
      const response = await fetch(`${import.meta.env.VITE_SECURE_BOT_URL}/api/secure-bot/scan/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setScans(data.data || [])
        }
      }
    } catch (error) {
      console.error('Error loading scan history:', error)
    } finally {
      setIsScansLoading(false)
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
            setUser(updatedUser)
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
                toast.success('Scan complete! Loading findings console...')
                navigate(`/findings/${targetScanId}`)
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

  const handleLogout = () => {
    clearUser()
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('temp_installation_id')
    toast.success('Logged out successfully')
    navigate('/auth')
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="w-full min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
        <div className="max-w-md w-full border border-white/10 rounded-2xl bg-neutral-950 p-8 text-center shadow-lg">
          <div className="w-16 h-16 rounded-full bg-neutral-950 border border-white/10 flex items-center justify-center mx-auto text-neutral-400 text-xl font-bold mb-6">
            ?
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">
            Access Restricted
          </h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-6">
            Please log in to your Aegis account to view active scans, security alerts, and automation setups.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center bg-white text-black font-bold text-sm px-6 py-3 rounded-xl hover:bg-neutral-100 transition-all duration-200"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full bg-black text-white font-sans">
      {/* ─── Left Sidebar ─── */}
      <aside className="w-64 border-r border-white/[0.08] bg-neutral-950 flex flex-col justify-between shrink-0">
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <Shield className="w-5 h-5 text-white" />
            <span className="text-sm font-black tracking-[0.25em] uppercase text-white">aegis</span>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] mb-8">
            {user.avatar ? (
              <img src={user.avatar} className="w-9 h-9 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs">
                {(user.name || user.username).slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user.name || user.username}</p>
              <p className="text-[10px] text-neutral-500 truncate">@{user.username}</p>
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
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === tab.id
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
                    {user.installationID && (
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
                        {repos.map((repo) => {
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
                                onClick={() => navigate(`/findings/${scanItem.id}`)}
                                className="inline-flex items-center gap-1 border border-white/10 hover:border-white/20 bg-white/[0.03] text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                              >
                                📋 View Findings
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                ) : scans.filter(s => s.findings && s.findings.some((f: any) => f.status === 'RESOLVED')).length === 0 ? (
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
                        {scans
                          .filter((scanItem) => scanItem.findings && scanItem.findings.some((f: any) => f.status === 'RESOLVED'))
                          .map((scanItem) => {
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
                                    onClick={() => navigate(`/findings/${scanItem.id}`)}
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
                        {repos.map((repo) => (
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
                        {user.id}
                      </code>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
                      <span className="text-neutral-500 font-medium">Email Address</span>
                      <span className="text-neutral-300 font-semibold">{user.email || 'Not shared'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-neutral-500 font-medium">GitHub App Installation</span>
                      {user.installationID && user.installationID !== 'null' ? (
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
