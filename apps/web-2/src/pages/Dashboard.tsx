import { useUserStore } from '../store/useUserStore'
import { Link } from 'react-router-dom'

const Dashboard = () => {
  const { user, isAuthenticated } = useUserStore()

  return (
    <div className="w-full min-h-screen bg-black pt-24 px-6 md:px-12 flex flex-col items-center">
      <div className="max-w-4xl w-full border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md p-8 md:p-12 text-center shadow-lg mt-10 relative overflow-hidden">
        {/* Glow backdrop element */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {isAuthenticated && user ? (
          <div className="flex flex-col items-center space-y-6">
            {/* User Avatar */}
            <div className="relative">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || user.username}
                  className="w-24 h-24 rounded-full border-2 border-emerald-500/30 object-cover shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-2 border-emerald-500/30 bg-neutral-900 flex items-center justify-center text-3xl font-bold text-neutral-400 shadow-lg">
                  {(user.name || user.username || 'U').slice(0, 2).toUpperCase()}
                </div>
              )}
              {/* Authenticated badge dot */}
              <span className="absolute bottom-1 right-1 w-5.5 h-5.5 bg-emerald-500 border-4 border-black rounded-full flex items-center justify-center shadow" />
            </div>

            {/* User Details */}
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white mb-1">
                {user.name || user.username}
              </h2>
              <p className="text-emerald-400 text-sm font-semibold tracking-wide uppercase mb-3">
                @{user.username}
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-white/[0.06] text-xs text-neutral-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Verified Aegis Operator</span>
              </div>
            </div>

            <div className="w-full max-w-md h-px bg-white/[0.08]" />

            {/* Profile fields */}
            <div className="w-full max-w-md text-left space-y-3.5 bg-neutral-950/45 rounded-xl border border-white/[0.04] p-5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500 font-medium">User ID</span>
                <code className="text-neutral-300 font-mono text-xs select-all bg-white/5 px-2 py-0.5 rounded border border-white/[0.03]">{user.id}</code>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500 font-medium">Email Address</span>
                <span className="text-neutral-300 font-semibold">{user.email || 'No email shared'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-500 font-medium">GitHub App Installation</span>
                {user.installationID && user.installationID !== 'null' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded">
                    Active (ID: {user.installationID})
                  </span>
                ) : (
                  <a
                    href="https://github.com/apps/aegisbykeshav"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-400 hover:underline text-xs font-semibold"
                  >
                    Setup Github App →
                  </a>
                )}
              </div>
            </div>

            {/* Dashboard details */}
            <div className="pt-4">
              <h3 className="text-xl font-bold text-white mb-2">Project Security Dashboard</h3>
              <p className="text-neutral-400 text-sm max-w-md mx-auto leading-relaxed">
                Your repos are fully integrated. Track sprint health, active epics, and automation status in real time.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-6">
            <div className="w-16 h-16 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center mx-auto text-neutral-400 text-xl font-bold">
              ?
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">
                Access Restricted
              </h2>
              <p className="text-neutral-400 text-sm max-w-sm mx-auto leading-relaxed">
                Please log in to your Aegis account to view active scans, security alerts, and automation setups.
              </p>
            </div>
            <div>
              <Link
                to="/auth"
                className="inline-flex items-center justify-center bg-white text-black font-bold text-sm px-6 py-3 rounded-xl hover:bg-neutral-100 transition-all duration-200"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
