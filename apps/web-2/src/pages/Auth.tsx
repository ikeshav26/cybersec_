import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUserStore } from '../store/useUserStore'

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"
    />
  </svg>
)

const Auth = () => {
  const { isAuthenticated } = useUserStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-black text-white overflow-hidden py-12 px-4 md:px-6">
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <img
          src="/auth-bg.png"
          alt=""
          className="w-full h-full object-cover object-center opacity-65"
          style={{
            WebkitMaskImage:
              'radial-gradient(circle at center, transparent 15%, black 85%)',
            maskImage: 'radial-gradient(circle at center, transparent 15%, black 85%)',
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black/30 opacity-90" />
      </div>

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03] blur-[120px] pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, white, transparent 70%)' }}
      />
      <div className="relative z-10 w-full max-w-[420px] bg-neutral-950/60 backdrop-blur-xl border border-white/[0.08] p-8 md:p-10 rounded-2xl shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8),0_0_80px_-20px_rgba(255,255,255,0.02)] transition-all duration-300 hover:border-white/[0.12] hover:shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8),0_0_80px_-20px_rgba(255,255,255,0.04)]">
        <div className="flex flex-col items-center mb-8">
          <Link
            to="/"
            className="text-xs font-black tracking-[0.4em] text-white/80 hover:text-white transition-all duration-300 uppercase flex items-center gap-1.5"
          >
            <span>aegis</span>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white tracking-tight mb-2">
            Welcome back
          </h1>
          <p className="text-sm text-white/40 leading-relaxed max-w-[280px] mx-auto">
            Sign in to manage your repos and security scans.
          </p>
        </div>

        <Link
          to={`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/auth/github`}
          className="group w-full flex items-center justify-center gap-3 bg-white text-black font-bold text-sm px-6 py-3.5 rounded-xl hover:bg-neutral-100 active:scale-[0.98] transition-all duration-200 shadow-[0_0_30px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] cursor-pointer select-none mb-4"
        >
          <GitHubIcon className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
          Continue with GitHub
        </Link>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-[10px] text-white/30 font-bold tracking-widest uppercase">
            or
          </span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        <Link
          to="https://github.com/apps/aegisbykeshav"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2.5 text-white/50 hover:text-white text-sm font-medium py-3.5 rounded-xl border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03] transition-all duration-200 cursor-pointer"
        >
          <GitHubIcon className="w-4 h-4 flex-shrink-0" />
          Install Aegis on GitHub
        </Link>

        <p className="mt-8 text-xs text-white/20 leading-relaxed text-center">
          By continuing you agree to our{' '}
          <span className="underline underline-offset-2 hover:text-white/40 cursor-pointer transition-colors">
            Terms
          </span>{' '}
          and{' '}
          <span className="underline underline-offset-2 hover:text-white/40 cursor-pointer transition-colors">
            Privacy Policy
          </span>
          .
        </p>

        <div className="mt-8 text-center border-t border-white/[0.04] pt-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors duration-200"
          >
            <span>←</span> <span>Back to home</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Auth
