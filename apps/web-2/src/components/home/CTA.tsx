import React from 'react'
import { Link } from 'react-router-dom'

export const CTA: React.FC = () => {
  return (
    <section
      id="contact"
      className="relative w-full bg-black py-32 px-6 md:px-12 overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 100%)',
        }}
      />

      <div className="relative max-w-3xl mx-auto flex flex-col items-center text-center">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-6 h-px bg-white/30" />
          <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase">
            Get started
          </span>
          <span className="w-6 h-px bg-white/30" />
        </div>

        <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white mb-6 leading-[1.05]">
          Your codebase has <span className="text-white/35">vulnerabilities.</span>
          <br />
          Aegis will find them.
        </h2>

        <p className="text-white/40 text-base md:text-lg max-w-xl mb-12 leading-relaxed">
          Install in under 60 seconds. No credit card required. Works with any GitHub
          repository.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full">
          <Link
            to="https://github.com/apps/aegisbykeshav"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-white text-black font-bold text-base px-10 py-4 rounded-xl hover:bg-neutral-100 active:scale-[0.98] transition-all duration-200 shadow-[0_0_40px_rgba(255,255,255,0.08)] cursor-pointer"
          >
            <svg
              className="w-5 h-5 fill-current flex-shrink-0"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"
              />
            </svg>
            Install on GitHub — it's free
          </Link>

          <Link
            to="/auth"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white/50 hover:text-white text-sm font-medium transition-colors duration-200 py-4 cursor-pointer"
          >
            Or login to your account →
          </Link>
        </div>

        <p className="mt-10 text-xs text-white/20 tracking-wide">
          Trusted by engineers at early-stage startups and growing teams.
        </p>
      </div>
    </section>
  )
}

export default CTA
