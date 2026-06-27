import CardNav from './ui/CardNav'
import type { CardNavItem } from './ui/CardNav'

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
      { label: 'GitHub', href: 'https://github.com', ariaLabel: 'GitHub Repository' },
      { label: 'Contact', href: '#contact', ariaLabel: 'Contact us' },
    ],
  },
]

const Navbar = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 w-full pointer-events-none">
      <CardNav
        logo={LOGO_SRC}
        logoAlt="Aegis"
        items={NAV_ITEMS}
        baseColor="rgba(12, 12, 12, 0.75)"
        menuColor="#ffffff"
        buttonBgColor="#ffffff"
        buttonTextColor="#000000"
        className="pointer-events-auto [&_.card-nav]:backdrop-blur-xl [&_.card-nav]:border [&_.card-nav]:border-white/[0.08] [&_.card-nav]:shadow-[0_4px_32px_rgba(0,0,0,0.6)]"
      />
    </div>
  )
}

export default Navbar
