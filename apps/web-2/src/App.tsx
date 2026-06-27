import Navbar from './components/Navbar'
import About from './pages/About'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Features from './pages/Features'
import Home from './pages/Home'
import { Route, Routes, useLocation } from 'react-router-dom'

const NAVBAR_HIDDEN_ROUTES = ['/auth']

const App = () => {
  const location = useLocation()
  const showNavbar = !NAVBAR_HIDDEN_ROUTES.includes(location.pathname)

  return (
    <div className="bg-black w-full min-h-screen text-white font-sans selection:bg-white/10 selection:text-white">
      {showNavbar && <Navbar />}
      <main className="w-full">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/features" element={<Features />} />
          <Route path="/about" element={<About />} />
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
