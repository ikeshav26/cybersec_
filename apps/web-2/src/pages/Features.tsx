/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import { Link } from 'react-router-dom'
import { useUserStore } from '../store/useUserStore'
import { ArrowRight, Lock, Shield, Trash2 } from 'lucide-react'

const Features = () => {
  const { isAuthenticated } = useUserStore()

  return (
    <div className="w-full min-h-screen bg-black text-white pt-32 pb-24 px-6 md:px-12 flex flex-col items-center">
      <div className="max-w-3xl w-full">
        
        {/* ─── Page Header ─── */}
        <div className="mb-20">
          <span className="text-xs font-mono tracking-[0.3em] text-neutral-500 uppercase block mb-3">
            Aegis Platform
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
            Autonomous Repository Security & Continuous Reviews
          </h1>
          <p className="text-neutral-400 text-base md:text-lg leading-relaxed font-normal">
            Aegis is an autonomous agent that integrates with your repositories to scan code, patch vulnerabilities, and review incoming pull requests with a privacy-first sandbox model.
          </p>
        </div>

        {/* ─── Workflow Timeline / Blog Content ─── */}
        <div className="relative border-l border-white/10 ml-3 md:ml-6 pl-8 md:pl-12 space-y-24">
          
          {/* Workflow Step 1 */}
          <div className="relative">
            {/* Timeline Circle */}
            <div className="absolute -left-[41px] md:-left-[57px] top-1.5 w-6 h-6 rounded-full bg-black border border-white flex items-center justify-center">
              <span className="text-[10px] font-mono font-bold text-white">01</span>
            </div>
            
            <div className="space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                Setup Phase
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Repository Onboarding & App Installation
              </h2>
              <div className="text-neutral-400 text-sm md:text-base leading-relaxed space-y-4 font-normal">
                <p>
                  Integrating Aegis is designed to be frictionless. The onboarding workflow starts by installing our GitHub App. You retain full control, selecting only the specific repositories you want the agent to monitor.
                </p>
                <p>
                  No global credentials or broad organization-wide keys are needed. Aegis requests minimal scopes, focusing strictly on read/write access to code files and pull request notifications for the selected repos.
                </p>
              </div>
              
              <div className="pt-2">
                <a
                  href="https://github.com/apps/aegisbykeshav"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:underline transition-all"
                >
                  Configure on GitHub
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Workflow Step 2 */}
          <div className="relative">
            {/* Timeline Circle */}
            <div className="absolute -left-[41px] md:-left-[57px] top-1.5 w-6 h-6 rounded-full bg-black border border-white flex items-center justify-center">
              <span className="text-[10px] font-mono font-bold text-white">02</span>
            </div>

            <div className="space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                Remediation Engine
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Secure Sandboxed Scanning & Self-Healing
              </h2>
              
              <div className="text-neutral-400 text-sm md:text-base leading-relaxed space-y-6 font-normal">
                <p>
                  When a scan is initiated—either manually through the dashboard or scheduled via your pipeline configuration—the secure bot executes a structured sandbox scan:
                </p>

                {/* Sub-steps in blog format */}
                <div className="pl-4 border-l-2 border-white/5 space-y-5 py-2">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-neutral-400" />
                      1. Ephemeral Sandbox Cloning
                    </h4>
                    <p className="text-xs text-neutral-500">
                      The bot clones your target repository inside an isolated, secure sandbox environment solely for analysis.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-neutral-400" />
                      2. Immediate Repository Destruction
                    </h4>
                    <p className="text-xs text-neutral-500">
                      Immediately after the scan finishes, the cloned files are permanently deleted. We do not store or cache your code, ensuring total privacy.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-neutral-400" />
                      3. Self-Healing & Pull Requests
                    </h4>
                    <p className="text-xs text-neutral-500">
                      If security bugs (such as SQL injections, secrets leaks, or dependency issues) are found, the agent writes patches and opens a Pull Request on GitHub.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Step 3 */}
          <div className="relative">
            {/* Timeline Circle */}
            <div className="absolute -left-[41px] md:-left-[57px] top-1.5 w-6 h-6 rounded-full bg-black border border-white flex items-center justify-center">
              <span className="text-[10px] font-mono font-bold text-white">03</span>
            </div>

            <div className="space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                Continuous Integration
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Continuous PR Reviewer
              </h2>
              
              <div className="text-neutral-400 text-sm md:text-base leading-relaxed space-y-4 font-normal">
                <p>
                  For ongoing protection, you can activate the **Auto PR Reviewer** on your repositories. The bot monitors active developer branches, triggering reviews automatically on specific repository webhook signals:
                </p>

                <ul className="list-disc list-inside space-y-2 text-xs md:text-sm pl-2 text-neutral-500">
                  <li><strong className="text-neutral-300">PR Opened:</strong> Triggers a scan on initial pull request submission.</li>
                  <li><strong className="text-neutral-300">PR Reopened:</strong> Re-evaluates safety status.</li>
                  <li><strong className="text-neutral-300">PR Synchronized:</strong> Triggers when new commits are pushed, providing immediate feedback on revisions.</li>
                </ul>

                <p>
                  Aegis reviews code diffs, finds structural or security flaws, and writes inline comments and code suggestions directly on the affected lines in the PR code. This keeps code standards high before merges.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* ─── Cardless Clean CTA Section ─── */}
        <div className="mt-24 pt-12 border-t border-white/10 text-center">
          <h3 className="text-lg font-bold text-white mb-2">Ready to secure your software?</h3>
          <p className="text-neutral-500 text-xs mb-6">Configure repository monitoring or run scans in real time.</p>
          
          <Link
            to={isAuthenticated ? "/dashboard" : "/auth"}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-black bg-white hover:bg-neutral-200 px-6 py-3.5 rounded-xl transition-all duration-200"
          >
            {isAuthenticated ? "Go to Dashboard" : "Sign In to Aegis"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  )
}

export default Features
