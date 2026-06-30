import { CheckCircle2 } from 'lucide-react'
import Pagination from '../ui/Pagination'

interface FixesConsoleTabProps {
  fixesScans: any[]
  fixesPage: number
  totalFixes: number
  setFixesPage: (page: number) => void
  isScansLoading: boolean
  handleInspectFixes: (scanId: string) => void
  SCANS_PER_PAGE: number
}

const FixesConsoleTab = ({
  fixesScans,
  fixesPage,
  totalFixes,
  setFixesPage,
  isScansLoading,
  handleInspectFixes,
  SCANS_PER_PAGE
}: FixesConsoleTabProps) => {
  return (
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
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[750px] text-left border-collapse">
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
          </div>
          <Pagination
            currentPage={fixesPage}
            totalItems={totalFixes}
            itemsPerPage={SCANS_PER_PAGE}
            onPageChange={setFixesPage}
          />
        </div>
      )}
    </div>
  )
}

export default FixesConsoleTab
