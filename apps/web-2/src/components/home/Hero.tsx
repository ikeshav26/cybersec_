/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import React from 'react'
import LightRays from '../ui/LightRays'
import { Link } from 'react-router-dom'
import { useUserStore } from '../../store/useUserStore'

interface HeroProps {
  className?: string
}

export const Hero: React.FC<HeroProps> = ({ className = '' }) => {
  return (
    <section
      className={`relative min-h-screen w-full flex flex-col justify-center items-center overflow-hidden bg-black text-white ${className}`}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-black" />
        <div
          className="absolute bottom-[-10%] left-[-15%] w-[80%] h-[120%] opacity-[0.06] blur-[160px]"
          style={{
            background:
              'radial-gradient(ellipse, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 70%)',
            transform: 'skewX(12deg) rotate(8deg)',
            transformOrigin: 'bottom left',
          }}
        />
        <div
          className="absolute bottom-[-10%] right-[-15%] w-[80%] h-[120%] opacity-[0.06] blur-[160px]"
          style={{
            background:
              'radial-gradient(ellipse, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 70%)',
            transform: 'skewX(-12deg) rotate(-8deg)',
            transformOrigin: 'bottom right',
          }}
        />

        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[70%] h-[60%] opacity-[0.07] blur-[140px]"
          style={{
            background:
              'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 80%)',
          }}
        />

        <div className="absolute inset-0">
          <LightRays
            raysOrigin="bottom-center"
            raysColor="#ffffff"
            raysSpeed={1}
            lightSpread={0.5}
            rayLength={3}
            followMouse={true}
            mouseInfluence={0.1}
            noiseAmount={0}
            distortion={0}
            className="custom-rays"
            pulsating={false}
            fadeDistance={1}
            saturation={1}
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black to-transparent" />
      </div>
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-12 flex flex-col items-center text-center pt-16 pb-16">
        <div className="inline-flex items-center gap-2.5 bg-white/[0.05] border border-white/[0.12] rounded-full px-4 py-1.5 mb-10 hover:border-white/25 hover:bg-white/[0.08] transition-all duration-300 cursor-default shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-md">
          <span className="bg-white text-black px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase leading-none">
            NEW
          </span>
          <span className="text-sm text-white/60 font-medium tracking-wide">
            AI security scans, fully automated
          </span>
        </div>
        <h1
          className="text-[clamp(5rem,15vw,12rem)] font-black tracking-tighter leading-[0.9] text-white select-none uppercase mb-6"
          style={{
            textShadow: '0 0 80px rgba(255,255,255,0.08)',
          }}
        >
          aegis
        </h1>

        <p className="text-base md:text-lg text-white/40 max-w-xl mx-auto mb-12 leading-relaxed font-normal tracking-wide">
          AI security scanning that fixes what it finds —{' '}
          <span className="text-white/70">not just comments on it.</span>
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
          <Link
            to="https://github.com/apps/aegisbykeshav"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-white text-black font-semibold text-base px-8 py-3.5 rounded-xl hover:bg-neutral-100 active:scale-[0.98] transition-all duration-200 shadow-[0_0_30px_rgba(255,255,255,0.1)] cursor-pointer"
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
            Install on GitHub
          </Link>
          {useUserStore.getState().isAuthenticated ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-base px-8 py-3.5 rounded-xl active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.2)]"
            >
              Go to Dashboard →
            </Link>
          ) : (
            <Link
              to="/auth"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-white/[0.05] text-white font-medium text-base px-8 py-3.5 rounded-xl border border-white/[0.12] hover:bg-white/[0.1] hover:border-white/25 active:scale-[0.98] transition-all duration-200 backdrop-blur-sm cursor-pointer"
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
              Login with GitHub
            </Link>
          )}
        </div>
      </div>

      <div className="absolute bottom-7 left-8 z-10 select-none opacity-20 hover:opacity-50 transition-opacity duration-300 hidden md:block">
        <span className="text-[11px] text-white font-semibold tracking-[0.25em] uppercase">
          aegis
        </span>
      </div>
    </section>
  )
}

export default Hero
