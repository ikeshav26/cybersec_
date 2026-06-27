import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useUserStore } from '../store/useUserStore'
import { toast } from 'react-hot-toast'
import {
  Shield,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  GitPullRequest,
  ChevronDown,
  ChevronUp
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

const FindingsPage = () => {
  const { scanId } = useParams<{ scanId: string }>()
  const { isAuthenticated } = useUserStore()
  const navigate = useNavigate()

  const [scan, setScan] = useState<any>(null)
  const [repoName, setRepoName] = useState<string>('')
  const [findings, setFindings] = useState<Finding[]>([])
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [fixingFindingId, setFixingFindingId] = useState<string | null>(null)
  const [fixResults, setFixResults] = useState<Record<string, { explanation: string; code: string }>>({})
  const [expandedFixIds, setExpandedFixIds] = useState<Record<string, boolean>>({})
  const [selectedFindingIds, setSelectedFindingIds] = useState<string[]>([])
  const [fixingAll, setFixingAll] = useState(false)
  const [isPrOpening, setIsPrOpening] = useState(false)
  const [openedPrUrl, setOpenedPrUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth')
      return
    }
    if (scanId) {
      fetchScanDetails()
    }
  }, [scanId, isAuthenticated])

  const fetchScanDetails = async () => {
    try {
      setIsPageLoading(true)
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
          setScan(scanData)
          setFindings(scanData.findings || [])

          // Fetch repo name from app integration service to show in header
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
        } else {
          toast.error(data.message || 'Scan details not found')
        }
      } else {
        toast.error('Failed to load scan details')
      }
    } catch (error) {
      console.error('Error fetching scan status:', error)
      toast.error('Network error loading findings')
    } finally {
      setIsPageLoading(false)
    }
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
    if (!scanId) return
    const token = localStorage.getItem('token')
    if (!token) return

    setIsPrOpening(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_SECURE_BOT_URL}/api/secure-bot/pr/open-pr/${scanId}`, {
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

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-12 font-sans">
      <div className="w-full max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-200">
        
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors font-semibold text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

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

        {isPageLoading ? (
          <div className="space-y-8 animate-pulse">
            <div className="h-10 bg-neutral-900 rounded-lg w-1/3" />
            <div className="h-64 bg-neutral-900 border border-white/[0.04] rounded-xl" />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Header Details */}
            <div className="border border-white/[0.08] rounded-xl bg-neutral-950 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                  <Shield className="w-6 h-6 text-emerald-400" />
                  Findings: {repoName || 'Evaluating codebase...'}
                </h1>
                <p className="text-xs text-neutral-400">
                  Scan UUID: <code className="font-mono text-neutral-300 bg-white/5 px-2 py-0.5 rounded">{scanId}</code>
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

            {/* Findings List Container */}
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
                
                {/* Bulk Actions Header */}
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

                {/* Findings Cards */}
                <div className="space-y-4">
                  {findings.map((finding) => (
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

                      {/* Collapsible code details */}
                      {finding.status === 'RESOLVED' && fixResults[finding.id] && (
                        <div className="border border-white/[0.06] rounded-xl overflow-hidden mt-3 bg-neutral-900 text-xs">
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
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default FindingsPage
