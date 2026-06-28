import CardNav from './ui/CardNav'
import type { CardNavItem } from './ui/CardNav'
import { useUserStore } from '../store/useUserStore'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'

const LOGO_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='22' viewBox='0 0 72 22'%3E%3Ctext x='0' y='17' font-family='system-ui%2C-apple-system%2Csans-serif' font-size='17' font-weight='700' letter-spacing='3' fill='white' text-rendering='optimizeLegibility'%3EAEGIS%3C/text%3E%3C/svg%3E"

const NAV_ITEMS: CardNavItem[] = [
  {
    label: 'Navigate',
    bgColor: '#161616',
    textColor: '#ffffff',
    links: [
      { label: 'Home', href: '/', ariaLabel: 'Go to Home' },
      { label: 'Dashboard', href: '/dashboard', ariaLabel: 'Go to Dashboard' },
    ],
  },
  {
    label: 'Product',
    bgColor: '#1a1a1a',
    textColor: '#ffffff',
    links: [
      { label: 'Features', href: '/features', ariaLabel: 'Go to Features' },
      { label: 'About', href: '/about', ariaLabel: 'Go to About' },
    ],
  },
  {
    label: 'Resources',
    bgColor: '#111111',
    textColor: '#ffffff',
    links: [
      { label: 'GitHub', href: 'https://github.com/ikeshav26/cybersec_', ariaLabel: 'GitHub Repository' },
      { label: 'Contact', href: 'mailto:keshavgilhotra4@gmail.com', ariaLabel: 'Contact us' },
    ],
  },
]

const Navbar = () => {
  const { user, isAuthenticated, clearUser } = useUserStore()
  const navigate = useNavigate()

  const ctaElement = isAuthenticated && user ? (
    <div className="hidden md:flex items-center gap-3.5 h-full px-2 pointer-events-auto">
      <div className="flex items-center gap-2">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name || user.username}
            className="w-7 h-7 rounded-full border border-white/20 object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full border border-white/20 bg-white/10 flex items-center justify-center text-xs font-bold text-white/60">
            {(user.name || user.username || 'U').slice(0, 2).toUpperCase()}
          </div>
        )}
        <span className="text-xs font-semibold text-white/80 max-w-[85px] truncate">
          {user.name || user.username}
        </span>
      </div>
      <button
        onClick={async () => {
          try {
            const token = localStorage.getItem('token')
            if (token) {
              await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/auth/logout`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              })
            }
          } catch (error) {
            console.error('Logout error:', error)
          } finally {
            clearUser()
            localStorage.removeItem('token')
            toast.success('Logged out successfully')
            navigate('/auth')
          }
        }}
        className="border-0 rounded-[calc(0.75rem-0.2rem)] px-3 py-1.5 font-medium bg-white/10 text-white/80 hover:bg-white/20 hover:text-white cursor-pointer transition-all duration-300 text-xs select-none"
      >
        Sign Out
      </button>
    </div>
  ) : (
    <Link
      to="/auth"
      className="card-nav-cta-button hidden md:inline-flex border-0 rounded-[calc(0.75rem-0.2rem)] px-4 items-center justify-center h-full font-medium bg-white text-black hover:bg-neutral-100 cursor-pointer transition-all duration-300 text-xs md:text-sm select-none pointer-events-auto"
    >
      Get Started
    </Link>
  )

  return (
    <div className="fixed top-0 left-0 right-0 z-50 w-full pointer-events-none">
      <CardNav
        logo={LOGO_SRC}
        logoAlt="Aegis"
        items={NAV_ITEMS}
        baseColor="rgba(12, 12, 12, 0.75)"
        menuColor="#ffffff"
        ctaElement={ctaElement}
        className="pointer-events-auto [&_.card-nav]:backdrop-blur-xl [&_.card-nav]:border [&_.card-nav]:border-white/[0.08] [&_.card-nav]:shadow-[0_4px_32px_rgba(0,0,0,0.6)]"
      />
    </div>
  )
}

export default Navbar
