const GITHUB_AUTH_URL = 'http://localhost:5000/api/auth/github';

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"
    />
  </svg>
);

const Auth = () => {
  return (
    <div className="min-h-screen w-full flex bg-black text-white overflow-hidden">

      {/* ─── Left Panel: Background Image ─── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background image */}
        <img
          src="/auth-bg.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center opacity-70"
          aria-hidden="true"
        />

        {/* Overlay gradient: black fade on right edge so card blends */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/10 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

        {/* Left panel content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <a
            href="/"
            className="text-sm font-black tracking-[0.25em] text-white/80 hover:text-white transition-colors duration-200 uppercase"
          >
            aegis
          </a>

          {/* Bottom testimonial / tagline */}
          <div className="space-y-4">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 fill-white/60" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <blockquote className="text-white/70 text-sm leading-relaxed max-w-sm">
              "Aegis caught a critical SQL injection vulnerability in our repo within 3 minutes
              of installation. It opened the PR and fixed it before our morning standup."
            </blockquote>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-bold text-white/60">
                AK
              </div>
              <div>
                <p className="text-xs font-semibold text-white/80">Arjun K.</p>
                <p className="text-xs text-white/40">Lead Engineer, Fintech startup</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right Panel: Auth Card ─── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center min-h-screen px-8 py-16 relative bg-black">

        {/* Subtle top-right glow */}
        <div
          className="absolute top-0 right-0 w-96 h-96 opacity-[0.04] blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, white, transparent 70%)' }}
        />

        {/* Mobile-only logo */}
        <a
          href="/"
          className="lg:hidden text-sm font-black tracking-[0.25em] text-white/60 hover:text-white transition-colors duration-200 uppercase mb-12"
        >
          aegis
        </a>

        <div className="w-full max-w-sm mx-auto">
          {/* Heading */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">
              Welcome back
            </h1>
            <p className="text-sm text-white/40 leading-relaxed">
              Sign in to manage your repos and security scans.
            </p>
          </div>

          {/* Primary CTA */}
          <a
            href={GITHUB_AUTH_URL}
            className="group w-full flex items-center justify-center gap-3 bg-white text-black font-bold text-sm px-6 py-4 rounded-xl hover:bg-neutral-100 active:scale-[0.98] transition-all duration-200 shadow-[0_0_32px_rgba(255,255,255,0.1)] cursor-pointer select-none mb-4"
          >
            <GitHubIcon className="w-5 h-5 flex-shrink-0" />
            Continue with GitHub
          </a>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-xs text-white/25 font-medium tracking-wide">OR</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {/* Install link */}
          <a
            href="https://github.com/apps/aegisbykeshav"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 text-white/45 hover:text-white text-sm font-medium py-3.5 rounded-xl border border-white/[0.09] hover:border-white/20 hover:bg-white/[0.04] transition-all duration-200 cursor-pointer"
          >
            <GitHubIcon className="w-4 h-4 flex-shrink-0" />
            Install Aegis on GitHub
          </a>

          {/* Fine print */}
          <p className="mt-8 text-xs text-white/20 leading-relaxed text-center">
            By continuing you agree to our{' '}
            <span className="underline underline-offset-2 hover:text-white/40 cursor-pointer transition-colors">
              Terms
            </span>{' '}
            and{' '}
            <span className="underline underline-offset-2 hover:text-white/40 cursor-pointer transition-colors">
              Privacy Policy
            </span>.
          </p>
        </div>

        {/* Back to home */}
        <a
          href="/"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-white/20 hover:text-white/50 transition-colors duration-200 whitespace-nowrap"
        >
          ← Back to home
        </a>
      </div>
    </div>
  );
};

export default Auth;