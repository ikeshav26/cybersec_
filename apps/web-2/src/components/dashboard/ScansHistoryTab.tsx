import { Shield } from 'lucide-react'
import Pagination from '../ui/Pagination'

interface ScansHistoryTabProps {
  scans: any[]
  scansPage: number
  totalScans: number
  setScansPage: (page: number) => void
  isScansLoading: boolean
  setActiveScanIdForFindings: (scanId: string) => void
  SCANS_PER_PAGE: number
}

const ScansHistoryTab = ({
  scans,
  scansPage,
  totalScans,
  setScansPage,
  isScansLoading,
  setActiveScanIdForFindings,
  SCANS_PER_PAGE
}: ScansHistoryTabProps) => {
  return (
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
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[800px] text-left border-collapse">
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
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${scanItem.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          : scanItem.status === 'FAILED'
                            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                            : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
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
                        disabled={scanItem.status === 'IN_PROGRESS' || scanItem.findings?.length === 0}
                        className={`inline-flex items-center gap-1 border border-white/10 hover:border-white/20 bg-white/[0.03] text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer ${scanItem.status === 'IN_PROGRESS' || scanItem.findings?.length === 0 ? 'opacity-50 disabled:cursor-not-allowed' : ''
                          }`}
                      >
                        {scanItem.findings?.length == 0 ? 'No Findings' : scanItem.status === "IN_PROGRESS" ? "Scanning..." : "View Findings"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={scansPage}
            totalItems={totalScans}
            itemsPerPage={SCANS_PER_PAGE}
            onPageChange={setScansPage}
          />
        </div>
      )}
    </div>
  )
}

export default ScansHistoryTab
