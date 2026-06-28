import React from 'react'
import { Shield, CheckCircle2, Terminal, GitPullRequest, ArrowLeft, ChevronUp, ChevronDown } from 'lucide-react'
import Pagination from '../ui/Pagination'

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

interface FindingsExplorerProps {
  findings: Finding[]
  findingsPage: number
  FINDINGS_PER_PAGE: number
  setFindingsPage: (page: number) => void
  selectedFindingIds: string[]
  setSelectedFindingIds: React.Dispatch<React.SetStateAction<string[]>>
  fixingAll: boolean
  handleFixSelected: () => void
  fixingFindingId: string | null
  handleFixFinding: (findingId: string) => void
  fixResults: Record<string, { explanation: string; code: string }>
  expandedFixIds: Record<string, boolean>
  setExpandedFixIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  repoName: string
  activeScanIdForFindings: string
  isFindingsLoading: boolean
  openPR: () => void
  isPrOpening: boolean
  openedPrUrl: string | null
  handleInspectFixes: (scanId: string) => void
  setActiveScanIdForFindings: (scanId: string | null) => void
}

const FindingsExplorer = ({
  findings,
  findingsPage,
  FINDINGS_PER_PAGE,
  setFindingsPage,
  selectedFindingIds,
  setSelectedFindingIds,
  fixingAll,
  handleFixSelected,
  fixingFindingId,
  handleFixFinding,
  fixResults,
  expandedFixIds,
  setExpandedFixIds,
  repoName,
  activeScanIdForFindings,
  isFindingsLoading,
  openPR,
  isPrOpening,
  openedPrUrl,
  handleInspectFixes,
  setActiveScanIdForFindings
}: FindingsExplorerProps) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Back button & Action Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={() => setActiveScanIdForFindings(null)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Scans List
        </button>

        {/* PR Staging Trigger Button */}
        {findings.some((f) => f.status === 'RESOLVED') && (
          <div className="flex items-center gap-3">
            {openedPrUrl ? (
              <button
                onClick={() => handleInspectFixes(activeScanIdForFindings)}
                className="inline-flex items-center gap-2 border border-emerald-500/20 bg-emerald-950/20 text-emerald-400 font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-emerald-950/40 transition-all cursor-pointer"
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                ✓ Pull Request Staged: Click to Inspect
              </button>
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
              <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-neutral-400" />
                Findings: {repoName || 'Evaluating codebase...'}
              </h1>
              <p className="text-xs text-neutral-400">
                Scan UUID: <code className="font-mono text-neutral-300 bg-white/5 px-2 py-0.5 rounded">{activeScanIdForFindings}</code>
              </p>
            </div>
          </div>

          {/* Findings GitHub-Section List */}
          {findings.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-white/[0.08] rounded-xl space-y-4 bg-neutral-950">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
              <div>
                <h3 className="text-sm font-bold text-white">No Vulnerabilities Detected</h3>
                <p className="text-neutral-500 text-xs mt-1">Excellent! Your repository code matches Aegis security standards.</p>
              </div>
            </div>
          ) : (
            <div className="border border-white/[0.08] rounded-xl bg-neutral-950 overflow-hidden">
              {/* Header bar / Selection bar */}
              <div className="bg-white/[0.02] border-b border-white/[0.08] p-4 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  {findings.some((f) => f.status !== 'RESOLVED') && (
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
                  )}
                  <span className="font-semibold text-neutral-400">
                    {selectedFindingIds.length > 0 
                      ? `${selectedFindingIds.length} selected` 
                      : `${findings.filter(f => f.status !== 'RESOLVED').length} open findings`}
                  </span>
                </div>
                {selectedFindingIds.length > 0 && (
                  <button
                    onClick={handleFixSelected}
                    disabled={fixingAll}
                    className="inline-flex items-center gap-1.5 bg-white text-black hover:bg-neutral-200 font-semibold px-3 py-1.5 rounded-lg active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer text-xs"
                  >
                    {fixingAll ? 'Fixing Selected...' : `Auto Fix Selected (${selectedFindingIds.length})`}
                  </button>
                )}
              </div>

              {/* Findings list rows */}
              <div className="divide-y divide-white/[0.06]">
                {findings.slice((findingsPage - 1) * FINDINGS_PER_PAGE, findingsPage * FINDINGS_PER_PAGE).map((finding) => (
                  <div
                    key={finding.id}
                    className="p-5 space-y-4 hover:bg-white/[0.01] transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
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
                          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${
                            finding.severity === 'CRITICAL' || finding.severity === 'HIGH'
                              ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                              : finding.severity === 'MEDIUM'
                                ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
                                : 'bg-white/[0.05] border border-white/[0.08] text-neutral-300'
                            }`}>
                            {finding.severity}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                            {finding.tool}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-white tracking-tight pt-1">
                          {finding.title}
                        </h3>
                        <code className="text-xs font-mono text-neutral-500 block truncate max-w-xl">
                          File: {finding.filePath}:{finding.line || 1}
                        </code>
                      </div>

                      <div className="shrink-0 pt-1">
                        {finding.status === 'RESOLVED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Patched
                          </span>
                        ) : (
                          <button
                            onClick={() => handleFixFinding(finding.id)}
                            disabled={fixingFindingId === finding.id}
                            className="inline-flex items-center gap-1.5 border border-white/10 hover:border-white/20 bg-white/[0.03] text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
                      <div className="border border-white/[0.06] rounded-xl overflow-hidden mt-3 bg-neutral-900/40 text-xs animate-in slide-in-from-top duration-200">
                        <button
                          onClick={() => {
                            setExpandedFixIds((prev) => ({
                              ...prev,
                              [finding.id]: !prev[finding.id]
                            }))
                          }}
                          className="w-full bg-white/[0.01] border-b border-white/[0.06] px-4 py-2 flex items-center justify-between text-neutral-400 hover:text-white transition-colors cursor-pointer text-left font-semibold"
                        >
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <Terminal className="w-3.5 h-3.5" /> AI Remediation Applied
                          </span>
                          {expandedFixIds[finding.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {expandedFixIds[finding.id] && (
                          <div className="p-4 space-y-3">
                            <div>
                              <p className="text-neutral-500 font-semibold mb-1 text-[10px] uppercase tracking-wider">AI Explanation</p>
                              <p className="text-neutral-300 leading-relaxed font-sans">{fixResults[finding.id].explanation}</p>
                            </div>
                            <div>
                              <p className="text-neutral-500 font-semibold mb-2 text-[10px] uppercase tracking-wider">Patched Code Changes</p>
                              <pre className="p-4 rounded-xl border border-white/[0.08] bg-black font-mono text-xs overflow-x-auto leading-relaxed select-text max-h-[500px] w-full">
                                <code className="block space-y-0.5 w-full">
                                  {fixResults[finding.id].code.split('\n').map((line, idx) => {
                                    let className = "text-neutral-400 px-2 block w-full"
                                    if (line.startsWith('+')) {
                                      className = "text-emerald-400 bg-emerald-500/5 border-l-2 border-emerald-500 px-2 block w-full font-medium"
                                    } else if (line.startsWith('-')) {
                                      className = "text-rose-400 bg-rose-500/5 border-l-2 border-rose-500 px-2 block w-full font-medium"
                                    } else if (line.startsWith('@@')) {
                                      className = "text-neutral-500 font-bold block w-full opacity-60 px-2 border-b border-white/[0.04] pb-1 mb-1 mt-2 text-[10px]"
                                    } else if (line.trim()) {
                                      className = "text-neutral-300 px-2 block w-full opacity-80"
                                    } else {
                                      className = "h-4 block w-full"
                                    }
                                    return (
                                      <span key={idx} className={className}>
                                        {line}
                                      </span>
                                    )
                                  })}
                                </code>
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer / Pagination bar */}
              <div className="bg-white/[0.02] border-t border-white/[0.08] p-4 flex justify-end">
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
  )
}

export default FindingsExplorer
