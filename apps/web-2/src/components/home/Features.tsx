import React from 'react';

const FEATURES = [
  {
    number: '01',
    title: 'Scan',
    description:
      'Every push triggers a deep security scan across your entire codebase. SAST, dependency checks, and secrets detection — all in under 5 minutes.',
    tags: ['SAST', 'Dependency Audit', 'Secrets Detection'],
  },
  {
    number: '02',
    title: 'Fix',
    description:
      "Aegis doesn't just report issues — it writes the fix. AI-generated patches are targeted, minimal, and context-aware.",
    tags: ['AI Patches', 'Zero Noise', 'Context-Aware'],
  },
  {
    number: '03',
    title: 'Review',
    description:
      'Acts as a security engineer on every pull request. Flags risky patterns, enforces best practices, and leaves structured review comments.',
    tags: ['PR Review', 'Risk Scoring', 'Policy Enforcement'],
  },
  {
    number: '04',
    title: 'Protect',
    description:
      'Continuous monitoring with real-time alerts. Get notified the moment a new CVE affects your dependencies or a high-risk pattern is committed.',
    tags: ['CVE Monitoring', 'Real-time Alerts', 'Dashboards'],
  },
];

export const Features: React.FC = () => {
  return (
    <section className="relative w-full bg-black py-28 px-6 md:px-12 overflow-hidden">
      {/* Faint top divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-6xl mx-auto">
        {/* Section label */}
        <div className="flex items-center gap-3 mb-6">
          <span className="w-6 h-px bg-white/30" />
          <span className="text-xs font-semibold tracking-[0.2em] text-white/40 uppercase">
            What Aegis does
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4 leading-tight">
          Scan. Fix. Review.{' '}
          <span className="text-white/40">Protect.</span>
        </h2>
        <p className="text-white/40 text-base md:text-lg max-w-xl mb-16 leading-relaxed">
          Four capabilities. One GitHub App. Zero compromise on security.
        </p>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map((feat) => (
            <div
              key={feat.number}
              className="group relative bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-300 overflow-hidden"
            >
              {/* Background number watermark */}
              <span className="absolute top-4 right-6 text-[5rem] font-black text-white/[0.03] leading-none select-none group-hover:text-white/[0.05] transition-all duration-500">
                {feat.number}
              </span>

              {/* Number + Title */}
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-xs font-bold text-white/25 tracking-widest">{feat.number}</span>
                <h3 className="text-2xl font-black text-white tracking-tight">{feat.title}</h3>
              </div>

              {/* Description */}
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                {feat.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {feat.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-semibold tracking-wider text-white/40 bg-white/[0.04] border border-white/[0.08] px-3 py-1 rounded-full uppercase"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
