/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import { ExternalLink } from 'lucide-react'

interface ConfigurationsTabProps {
  user: any
}

const ConfigurationsTab = ({ user }: ConfigurationsTabProps) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Account Configurations</h1>
        <p className="text-neutral-400 text-sm">Review your operator details and authorized credentials.</p>
      </div>

      <div className="border border-white/[0.08] rounded-xl bg-neutral-950 p-8 max-w-2xl">
        <div className="divide-y divide-white/[0.06] text-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-4">
            <span className="text-neutral-400 font-medium">Aegis Operator UUID</span>
            <code className="text-neutral-300 font-mono text-xs select-all bg-white/[0.04] px-2.5 py-1 rounded border border-white/[0.06] self-start sm:self-auto">
              {user?.id}
            </code>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-4">
            <span className="text-neutral-400 font-medium">Email Address</span>
            <span className="text-neutral-200 font-semibold">{user?.email || 'Not shared'}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-4">
            <span className="text-neutral-400 font-medium">GitHub App Installation</span>
            {user?.installationID && user.installationID !== 'null' ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg animate-in fade-in duration-300">
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
  )
}

export default ConfigurationsTab
