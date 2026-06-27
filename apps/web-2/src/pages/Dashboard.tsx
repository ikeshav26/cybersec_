import { useState, useEffect } from 'react'
import { useUserStore } from '../store/useUserStore'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  Shield,
  GitPullRequest,
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
  Trash2
} from 'lucide-react'

const Dashboard = () => {
  const { user, isAuthenticated, clearUser } = useUserStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'repositories' | 'scans'>('overview')
  const [repos, setRepos] = useState<any[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedRepoId, setSelectedRepoId] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState<string>('')
  const [scanId, setScanId] = useState<string>('')
  const [findings, setFindings] = useState<any[]>([])
  const [isFixing, setIsFixing] = useState<Record<string, boolean>>({})
  const [isPrOpening, setIsPrOpening] = useState(false)

  // Fetch repositories on load if authenticated
  useEffect(() => {
    if (isAuthenticated && user?.installationID) {
      fetchRepos()
    }
  }, [isAuthenticated, user?.installationID])

  const fetchRepos = async () => {
    try {
      setIsSyncing(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/app-integration/api/v1/sync/repos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ installationId: user?.installationID })
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRepos(data.data || [])
          toast.success('Repositories synchronized successfully!')
        } else {
          toast.error(data.message || 'Failed to sync repositories')
        }
      } else {
        toast.error('Sync failed. Please check app configuration.')
      }
    } catch (error) {
      console.error('Error fetching repos:', error)
      toast.error('Failed to sync repositories')
    } finally {
      setIsSyncing(false)
    }
  }

  const togglePrReviewer = async (repoId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/app-integration/api/v1/pr-reviewer/update-status/${repoId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setRepos((prev) =>
          prev.map((r) => (r.id === repoId ? { ...r, prReviewer: !r.prReviewer } : r))
        )
        toast.success(data.message || 'Status updated successfully!')
      } else {
        toast.error('Failed to update status')
      }
    } catch (error) {
      console.error('Error toggling PR reviewer:', error)
      toast.error('Network error updating status')
    }
  }

  const triggerScan = async () => {
    if (!selectedRepoId) {
      toast.error('Please select a repository to scan')
      return
    }

    try {
      setIsScanning(true)
      setScanStatus('QUEUED')
      setFindings([])
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/secure-bot/api/secure-bot/scan/repo/${selectedRepoId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setScanId(data.data.id)
          toast.success('Scan job queued. Starting evaluation...')
          pollScanStatus(data.data.id)
        } else {
          setIsScanning(false)
          toast.error(data.message || 'Scan could not be started')
        }
      } else {
        setIsScanning(false)
        toast.error('Failed to initiate scan')
      }
    } catch (error) {
      console.error('Error starting scan:', error)
      setIsScanning(false)
      toast.error('Failed to initiate scan')
    }
  }

  const pollScanStatus = (targetScanId: string) => {
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/secure-bot/api/secure-bot/scan/status/${targetScanId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            const scan = data.data
            setScanStatus(scan.status)
            if (scan.status === 'SUCCESS' || scan.status === 'FAILED') {
              clearInterval(interval)
              setIsScanning(false)
              if (scan.status === 'SUCCESS') {
                setFindings(scan.findings || [])
                toast.success(`Scan complete! Found ${scan.findings?.length || 0} vulnerability issues.`)
              } else {
                toast.error(`Scan failed: ${scan.error || 'Unknown scanner error'}`)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error polling status:', error)
      }
    }, 2500)
  }

  const applyFix = async (findingId: string) => {
    try {
      setIsFixing((prev) => ({ ...prev, [findingId]: true }))
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/secure-bot/api/secure-bot/fix/finding/${findingId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        toast.success('Fix applied successfully! Status marked as resolved.')
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
      setIsFixing((prev) => ({ ...prev, [findingId]: false }))
    }
  }

  const openPR = async () => {
    if (!scanId) return
    try {
      setIsPrOpening(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/secure-bot/api/secure-bot/pr/open-pr/${scanId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        toast.success('Pull Request opened successfully!')
        if (data.pr && data.pr.html_url) {
          window.open(data.pr.html_url, '_blank')
        }
      } else {
        toast.error('Failed to create Pull Request')
      }
    } catch (error) {
      console.error('Error creating PR:', error)
      toast.error('Failed to create Pull Request')
    } finally {
      setIsPrOpening(false)
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="w-full min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
        <div className="max-w-md w-full border border-white/10 rounded-2xl bg-neutral-950 p-8 text-center shadow-lg">
          <div className="w-16 h-16 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center mx-auto text-neutral-400 text-xl font-bold mb-6">
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
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'repositories', label: 'Repositories', icon: Database },
              { id: 'scans', label: 'Security Scans', icon: Shield }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-white text-black'
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
            onClick={async () => {
              try {
                const token = localStorage.getItem('token')
                if (token) {
                  await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/auth/logout`, {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  })
                }
              } catch (e) {
                console.error(e)
              } finally {
                clearUser()
                localStorage.removeItem('token')
                toast.success('Logged out successfully')
                navigate('/auth')
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-neutral-400 hover:text-red-400 hover:bg-red-950/20 transition-all cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ─── Right Content Area ─── */}
      <main className="flex-1 bg-black p-8 md:p-12 overflow-y-auto max-w-5xl">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome Back</h1>
              <p className="text-neutral-400 text-sm">Review your repository status and active scanners.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="border border-white/[0.08] rounded-xl bg-neutral-950 p-6 space-y-2">
                <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Total Repositories</span>
                <p className="text-3xl font-bold text-white">{repos.length}</p>
              </div>
              <div className="border border-white/[0.08] rounded-xl bg-neutral-950 p-6 space-y-2">
                <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Active PR Reviewers</span>
                <p className="text-3xl font-bold text-white">
                  {repos.filter((r) => r.prReviewer).length}
                </p>
              </div>
              <div className="border border-white/[0.08] rounded-xl bg-neutral-950 p-6 space-y-2">
                <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Verified Status</span>
                <p className="text-lg font-bold text-emerald-400 flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-4 h-4" /> Aegis Operator
                </p>
              </div>
            </div>

            {/* Detailed profile configuration */}
            <div className="border border-white/[0.08] rounded-xl bg-neutral-950 p-6 space-y-6">
              <h2 className="text-lg font-bold text-white">Account Configurations</h2>
              <div className="space-y-4 text-sm max-w-xl">
                <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
                  <span className="text-neutral-500">Aegis Operator UUID</span>
                  <code className="text-neutral-300 font-mono text-xs select-all bg-white/5 px-2 py-0.5 rounded border border-white/[0.03]">
                    {user.id}
                  </code>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/[0.04]">
                  <span className="text-neutral-500">Email Address</span>
                  <span className="text-neutral-300 font-semibold">{user.email || 'Not shared'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-neutral-500">GitHub Installation Status</span>
                  {user.installationID && user.installationID !== 'null' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-0.5 rounded">
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

        {/* TAB 2: REPOSITORIES */}
        {activeTab === 'repositories' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Authorized Repositories</h1>
                <p className="text-neutral-400 text-sm">Manage repository configurations and review toggles.</p>
              </div>
              <button
                onClick={fetchRepos}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 border border-white/10 hover:border-white/20 bg-white/[0.03] text-white font-bold text-xs px-4 py-2.5 rounded-lg active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Repositories'}
              </button>
            </div>

            {repos.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/[0.08] rounded-xl space-y-4">
                <Database className="w-8 h-8 text-neutral-600 mx-auto" />
                <div>
                  <h3 className="text-sm font-bold text-white">No Repositories Loaded</h3>
                  <p className="text-neutral-500 text-xs mt-1">Please install Aegis or click sync to import your repository list.</p>
                </div>
                <button
                  onClick={fetchRepos}
                  className="bg-white text-black font-bold text-xs px-4 py-2 rounded-lg hover:bg-neutral-200 transition-all cursor-pointer"
                >
                  Fetch Repositories
                </button>
              </div>
            ) : (
              <div className="border border-white/[0.08] rounded-xl bg-neutral-950 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-xs font-bold text-neutral-500 uppercase bg-white/[0.02]">
                      <th className="p-4 pl-6">Repository Name</th>
                      <th className="p-4">GitHub Link</th>
                      <th className="p-4 text-center">Auto PR Reviewer (Feature 2)</th>
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
                            Visit Repo
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => togglePrReviewer(repo.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              repo.prReviewer
                                ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400'
                                : 'bg-neutral-900 border border-white/[0.06] text-neutral-400 hover:text-white'
                            }`}
                          >
                            {repo.prReviewer ? 'Active / Enabled' : 'Disabled'}
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

        {/* TAB 3: SECURITY SCANS */}
        {activeTab === 'scans' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Sandbox Security Scanning</h1>
              <p className="text-neutral-400 text-sm">Select an authorized repository and execute a secure vulnerability evaluation.</p>
            </div>

            {/* Scan Initiation Controller */}
            <div className="border border-white/[0.08] rounded-xl bg-neutral-950 p-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex-1 space-y-2">
                <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider block">Select Repository</label>
                <select
                  value={selectedRepoId}
                  onChange={(e) => setSelectedRepoId(e.target.value)}
                  className="w-full bg-black border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-neutral-300 focus:outline-none focus:border-white/20 transition-all font-semibold"
                >
                  <option value="">-- Choose a repository --</option>
                  {repos.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.repo_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={triggerScan}
                  disabled={isScanning || !selectedRepoId}
                  className="inline-flex items-center gap-2 bg-white text-black font-bold text-sm px-6 py-2.5 rounded-lg active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer select-none"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {isScanning ? 'Scan in progress...' : 'Start Security Scan'}
                </button>
              </div>
            </div>

            {/* Scan Status Logger */}
            {isScanning && (
              <div className="border border-white/[0.08] rounded-xl bg-neutral-950 p-6 space-y-4 text-center">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-semibold text-white">Scanner Engine Active</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-neutral-400">Current Phase: <strong className="text-white uppercase font-mono">{scanStatus}</strong></p>
                  <p className="text-[10px] text-neutral-500 max-w-sm mx-auto leading-relaxed">
                    Aegis is cloning your repo inside a secure sandbox container. Scans typically execute within 1-2 minutes.
                  </p>
                </div>
              </div>
            )}

            {/* Scan Findings results */}
            {!isScanning && scanId && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-white/[0.08]">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      Scan Evaluation Results
                      <span className="text-xs font-mono font-bold bg-neutral-900 border border-white/[0.06] text-neutral-400 px-2.5 py-0.5 rounded">
                        #{scanId.substring(0, 8)}
                      </span>
                    </h2>
                    <p className="text-xs text-neutral-400 mt-1">Status: <span className="text-emerald-400 font-bold uppercase">{scanStatus}</span></p>
                  </div>

                  {findings.some((f) => f.status === 'RESOLVED') && (
                    <button
                      onClick={openPR}
                      disabled={isPrOpening}
                      className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs px-4 py-2.5 rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                    >
                      <GitPullRequest className="w-3.5 h-3.5" />
                      {isPrOpening ? 'Creating Pull Request...' : 'Open Patch PR on GitHub'}
                    </button>
                  )}
                </div>

                {findings.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/[0.08] rounded-xl space-y-3 bg-neutral-950">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <div>
                      <h3 className="text-sm font-bold text-white">No Vulnerabilities Detected</h3>
                      <p className="text-neutral-500 text-xs mt-1">Excellent! Your repository code matches Aegis security standards.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {findings.map((finding) => (
                      <div
                        key={finding.id}
                        className="border border-white/[0.08] rounded-xl bg-neutral-950 p-6 space-y-4 hover:border-white/[0.12] transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                finding.severity === 'CRITICAL' || finding.severity === 'HIGH'
                                  ? 'bg-red-950 border border-red-500/30 text-red-400'
                                  : finding.severity === 'MEDIUM'
                                  ? 'bg-yellow-950 border border-yellow-500/30 text-yellow-400'
                                  : 'bg-neutral-900 border border-white/[0.06] text-neutral-400'
                              }`}>
                                {finding.severity}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                                {finding.tool}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-white tracking-tight pt-1">
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
                                onClick={() => applyFix(finding.id)}
                                disabled={isFixing[finding.id]}
                                className="inline-flex items-center gap-1.5 border border-white/10 hover:border-white/20 bg-white/[0.03] text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                              >
                                {isFixing[finding.id] ? 'Generating fix...' : 'Auto-Fix Code'}
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-neutral-400 text-xs md:text-sm leading-relaxed border-t border-white/[0.04] pt-3.5">
                          {finding.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard
