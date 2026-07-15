/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import { RefreshCw, ExternalLink, Database, GitPullRequest } from 'lucide-react'
import Pagination from '../ui/Pagination'

interface PrReviewerTabProps {
  repos: any[]
  reviewerPage: number
  totalRepos: number
  setReviewerPage: (page: number) => void
  isSyncing: boolean
  handleSync: () => void
  handleTogglePrReviewer: (repoId: string) => void
  togglingPrReviewer: Record<string, boolean>
  user: any
}

const PrReviewerTab = ({
  repos,
  reviewerPage,
  totalRepos,
  setReviewerPage,
  isSyncing,
  handleSync,
  handleTogglePrReviewer,
  togglingPrReviewer,
  user
}: PrReviewerTabProps) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">AI Pull Request Reviewer</h1>
          <p className="text-neutral-400 text-sm">Toggle automated, continuous AI-driven review comments on your GitHub Pull Requests.</p>
        </div>
        {user?.installationID ? (
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 border border-white/10 hover:border-white/20 bg-white/[0.03] text-white font-bold text-xs px-4 py-2.5 rounded-lg active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Repositories'}
          </button>
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
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${repo.prReviewer
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : 'bg-white/[0.05] border border-white/[0.08] text-neutral-400'
                          }`}
                      >
                        {repo.prReviewer ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleTogglePrReviewer(repo.id)}
                        disabled={!!togglingPrReviewer[repo.id]}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${repo.prReviewer
                            ? 'bg-neutral-900 border border-white/[0.06] text-neutral-400 hover:text-white hover:bg-neutral-800'
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
          <Pagination
            currentPage={reviewerPage}
            totalItems={totalRepos}
            itemsPerPage={9}
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
  )
}

export default PrReviewerTab
