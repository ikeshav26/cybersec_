/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import React from 'react'
import { Link } from 'react-router-dom'

export const Footer: React.FC = () => {
  return (
    <footer className="bg-black text-neutral-500 py-16 px-6 md:px-12 border-t border-neutral-900 select-none">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-12 text-left">
        <div className="flex flex-col justify-start max-w-xs">
          <div className="flex items-center gap-2 text-white font-bold tracking-widest uppercase mb-4">
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-300 w-2.5 h-2.5 rounded-full inline-block" />
            aegis
          </div>
          <p className="text-xs text-neutral-500 leading-relaxed">
            AI-powered DevSecOps platform automatically securing GitHub codebases on every
            commit.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 md:gap-16">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Product
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs">
              <li>
                <Link to="/" className="hover:text-white transition-colors duration-200">
                  Security Scan
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-white transition-colors duration-200">
                  AI Remediation
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-white transition-colors duration-200">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Resources
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs">
              <li>
                <a
                  href="https://docs.aegis.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors duration-200"
                >
                  Documentation
                </a>
              </li>
              <li>
                <Link
                  to="/about"
                  className="hover:text-white transition-colors duration-200"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="hover:text-white transition-colors duration-200"
                >
                  Workspace
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Developer
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs">
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors duration-200"
                >
                  GitHub App
                </a>
              </li>
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors duration-200"
                >
                  Open Source
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Legal
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs">
              <li>
                <Link to="/" className="hover:text-white transition-colors duration-200">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-white transition-colors duration-200">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-white transition-colors duration-200">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-neutral-900 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-neutral-600">
        <span>© {new Date().getFullYear()} Aegis Security. All rights reserved.</span>
        <span>Secured automatically using AI.</span>
      </div>
    </footer>
  )
}

export default Footer
