/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import { useState } from 'react'
import { RefreshCw, ExternalLink, Database, Play, Info, Shield } from 'lucide-react'
import Pagination from '../ui/Pagination'

interface RepositoriesTabProps {
  repos: any[]
  reposPage: number
  totalRepos: number
  setReposPage: (page: number) => void
  scanStatus: Record<string, { id: string; status: string; error?: string; findingsCount?: number }>
  isSyncing: boolean
  handleSync: () => void
  triggerScan: (repoId: string) => void
  user: any
}

const RepositoriesTab = ({
  repos,
  reposPage,
  totalRepos,
  setReposPage,
  scanStatus,
  isSyncing,
  handleSync,
  triggerScan,
  user
}: RepositoriesTabProps) => {
  const [isNoteOpen, setIsNoteOpen] = useState(false)

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">AI Security Scan & Fix</h1>
          <p className="text-neutral-400 text-sm">Run sandbox vulnerability evaluations, generate secure patches, and stage PRs.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsNoteOpen(true)}
            className="inline-flex items-center gap-1.5 border border-white/10 hover:border-white/20 bg-white/[0.03] text-neutral-400 hover:text-white font-bold text-xs px-4 py-2.5 rounded-lg active:scale-[0.98] transition-all cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            Access Policy
          </button>
          {user?.installationID ? (
            <>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 border border-white/10 hover:border-white/20 bg-white/[0.03] text-white font-bold text-xs px-4 py-2.5 rounded-lg active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Repositories'}
              </button>
              <a
                href={`https://github.com/settings/installations/${user.installationID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 border border-white/10 hover:border-white/20 bg-white/[0.03] text-white font-bold text-xs px-4 py-2.5 rounded-lg active:scale-[0.98] transition-all"
              >
                Configure Repositories
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </>
          ) : (
            <a
              href="https://github.com/apps/aegisbykeshav"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs px-4 py-2.5 rounded-lg active:scale-[0.98] transition-all cursor-pointer"
            >
              Install Aegis App
            </a>
          )}
        </div>
      </div>

      {repos.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/[0.08] rounded-xl space-y-4 bg-neutral-950">
          <Database className="w-8 h-8 text-neutral-600 mx-auto animate-pulse" />
          <div>
            <h3 className="text-sm font-bold text-white">
              {user?.installationID ? 'No Repositories Synced' : 'GitHub App Not Installed'}
            </h3>
            <p className="text-neutral-500 text-xs mt-1">
              {user?.installationID
                ? 'Please configure the GitHub App and click sync repositories to import them.'
                : 'Please install the Aegis GitHub App to grant access to your repositories.'}
            </p>
          </div>
          {user?.installationID ? (
            <button
              onClick={handleSync}
              className="bg-white text-black font-bold text-xs px-4 py-2 rounded-lg hover:bg-neutral-200 transition-all cursor-pointer"
            >
              Sync Repositories
            </button>
          ) : (
            <a
              href="https://github.com/apps/aegisbykeshav"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs px-4 py-2 rounded-lg active:scale-[0.98] transition-all cursor-pointer"
            >
              Install Aegis App
            </a>
          )}
        </div>
      ) : (
        <div className="border border-white/[0.08] rounded-xl bg-neutral-950 overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[700px] text-left border-collapse">
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
                              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${scanInfo.status === 'SUCCESS'
                                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                  : scanInfo.status === 'FAILED'
                                    ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                    : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
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
          <Pagination
            currentPage={reposPage}
            totalItems={totalRepos}
            itemsPerPage={9}
            onPageChange={setReposPage}
          />
        </div>
      )}

      {/* Side Drawer Modal */}
      {isNoteOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity duration-300 cursor-pointer"
            onClick={() => setIsNoteOpen(false)}
          />
          
          {/* Drawer Panel */}
          <div className="absolute inset-y-0 right-0 max-w-md w-full bg-neutral-950 border-l border-white/[0.08] shadow-2xl p-6 flex flex-col justify-between transform transition-all duration-300 ease-in-out">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-bold text-white tracking-tight">Security & Access Note</h3>
                </div>
                <button 
                  onClick={() => setIsNoteOpen(false)}
                  className="text-neutral-400 hover:text-white transition-colors cursor-pointer text-base font-medium px-2 py-1 hover:bg-white/5 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4 text-sm text-neutral-300 leading-relaxed">
                <p>
                  Aegis implements strict data integration policies with GitHub authorizations.
                </p>
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-200 space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-rose-400">Authorization Removal Policy</h4>
                  <p className="text-xs font-medium">
                    If you remove any of repo authorization, our system will automatically remove the scan history and findings history for that repo.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-200 space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-amber-400">Staged Changes Expiration</h4>
                  <p className="text-xs font-medium">
                    Make sure to open a Pull Request for staged fixes within 30 minutes of generation. Staged changes are automatically cleaned up from the server after 30 minutes, after which you will need to scan and fix them again.
                  </p>
                </div>
                <p>
                  These actions are automated to ensure your compliance, security standards, and privacy boundaries. Once authorization is revoked or staged files expire, they cannot be recovered.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.08] pt-4 flex justify-end">
              <button
                onClick={() => setIsNoteOpen(false)}
                className="bg-white text-black hover:bg-neutral-200 font-bold text-xs px-4 py-2 rounded-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RepositoriesTab
