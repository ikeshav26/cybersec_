/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import { Link } from 'react-router-dom'
import { Shield, Mail, ArrowLeft } from 'lucide-react'
import { FaGithub } from 'react-icons/fa'

const About = () => {
  return (
    <div className="w-full min-h-screen bg-black text-white font-sans flex flex-col justify-between selection:bg-white/[0.1] px-6 py-12">
      {/* Header */}
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Home
        </Link>
        <div className="flex items-center gap-1.5 text-neutral-400">
          <Shield className="w-4 h-4" />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase">aegis</span>
        </div>
      </header>

      {/* Main Content (Centered, Max Width 2xl) */}
      <main className="w-full max-w-2xl mx-auto py-16 flex-1 flex flex-col justify-center space-y-10">
        
        {/* Title Section */}
        <div className="space-y-3 text-center sm:text-left">
          <h1 className="text-3xl font-semibold tracking-tight text-white">About Aegis</h1>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Aegis is an automated security pipeline designed to detect vulnerability findings in source repositories, generate context-aware code remediation diffs, and stage secure Pull Requests directly on GitHub.
          </p>
        </div>

        {/* Creator Bio Section */}
        <div className="border border-white/[0.08] rounded-xl bg-neutral-950 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <img
            src="/me.jpeg"
            className="w-16 h-16 rounded-full object-cover border border-white/[0.08]"
            alt="Keshav"
          />
          <div className="space-y-3 text-center sm:text-left flex-1">
            <div className="space-y-0.5">
              <h3 className="text-base font-semibold text-white">Keshav</h3>
              <p className="text-xs text-neutral-500">Software Engineer & Project Creator</p>
            </div>
            <p className="text-neutral-400 text-xs md:text-sm leading-relaxed">
              I build developer-first automation pipelines. Aegis was created to bridge vulnerability scanning with AI remediation, removing security debt without disrupting product engineering workflows.
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-3 pt-1">
              <a
                href="https://github.com/ikeshav26"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
              >
                <FaGithub className="w-3.5 h-3.5" />
                GitHub
              </a>
              <span className="text-neutral-700">•</span>
              <a
                href="mailto:keshavgilhotra4@gmail.com"
                className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                Contact
              </a>
            </div>
          </div>
        </div>

        {/* Key Features List */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest block">Capabilities</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="border border-white/[0.08] rounded-xl p-4 bg-neutral-950/40 space-y-1">
              <h4 className="font-semibold text-neutral-200">Remediation Diffs</h4>
              <p className="text-neutral-400 leading-relaxed">Calculates context-aware, minimal changes in unified patch formats to address issues.</p>
            </div>
            <div className="border border-white/[0.08] rounded-xl p-4 bg-neutral-950/40 space-y-1">
              <h4 className="font-semibold text-neutral-200">Automated PR Staging</h4>
              <p className="text-neutral-400 leading-relaxed">Pushes and stages code patches as Pull Requests automatically using secure sandboxes.</p>
            </div>
            <div className="border border-white/[0.08] rounded-xl p-4 bg-neutral-950/40 space-y-1">
              <h4 className="font-semibold text-neutral-200">Webhook Review Engine</h4>
              <p className="text-neutral-400 leading-relaxed">Triggers continuous AI review comments on pull request commits automatically.</p>
            </div>
            <div className="border border-white/[0.08] rounded-xl p-4 bg-neutral-950/40 space-y-1">
              <h4 className="font-semibold text-neutral-200">Clean Scans Bypassing</h4>
              <p className="text-neutral-400 leading-relaxed">Excludes lockfiles, build outputs, and node_modules folders automatically to prevent noise.</p>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full max-w-2xl mx-auto pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-neutral-500">
        <span>© {new Date().getFullYear()} Aegis Security. Created by Keshav.</span>
        <a
          href="https://github.com/ikeshav26/cybersec_"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
        >
          View Repository
        </a>
      </footer>
    </div>
  )
}

export default About
