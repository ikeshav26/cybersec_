/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import React from 'react'

const STATS = [
  { value: '10,000+', label: 'Vulnerabilities detected' },
  { value: '500+', label: 'Repositories secured' },
  { value: '< 5 min', label: 'Average scan time' },
  { value: '98%', label: 'PR merge rate on fixes' },
]

export const Stats: React.FC = () => {
  return (
    <section className="relative w-full bg-white/[0.02] py-20 px-6 md:px-12 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-2">
              <span className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                {stat.value}
              </span>
              <span className="text-sm text-white/40 font-medium leading-snug">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Stats
