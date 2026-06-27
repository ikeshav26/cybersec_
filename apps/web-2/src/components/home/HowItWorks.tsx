import React from 'react'

const STEPS = [
  {
    step: '01',
    title: 'Install on GitHub',
    description:
      'Add the Aegis GitHub App to your organisation in one click. No configuration files, no CI changes — it just works.',
  },
  {
    step: '02',
    title: 'Aegis scans every commit',
    description:
      'Each push triggers an automated security pipeline. Vulnerabilities, misconfigurations, and exposed secrets are caught before they reach production.',
  },
  {
    step: '03',
    title: 'Auto-PR with the fix',
    description:
      'For every critical finding, Aegis opens a pull request with a ready-to-merge patch — reviewed, tested, and explained.',
  },
]

export const HowItWorks: React.FC = () => {
  return (
    <section className="relative w-full bg-black py-28 px-6 md:px-12 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-6 h-px bg-white/30" />
          <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase">
            How it works
          </span>
        </div>

        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-16 leading-tight">
          Three steps to a <span className="text-white/40">secure repo.</span>
        </h2>

        <div className="relative">
          <div className="absolute left-[27px] top-10 bottom-10 w-px bg-white/[0.07] hidden md:block" />

          <div className="flex flex-col gap-0">
            {STEPS.map((item, idx) => (
              <div
                key={item.step}
                className="relative flex gap-8 md:gap-12 items-start group"
              >
                <div className="relative z-10 flex-shrink-0 w-14 h-14 rounded-full border border-white/[0.12] bg-black flex items-center justify-center group-hover:border-white/30 transition-all duration-300">
                  <span className="text-sm font-black text-white/40 group-hover:text-white/70 transition-colors duration-300">
                    {item.step}
                  </span>
                </div>
                <div className={`pb-16 ${idx === STEPS.length - 1 ? 'pb-0' : ''}`}>
                  <h3 className="text-xl md:text-2xl font-black text-white mb-3 mt-3 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-white/45 text-sm md:text-base leading-relaxed max-w-lg">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
