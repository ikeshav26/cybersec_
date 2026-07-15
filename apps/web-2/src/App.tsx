/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import { useEffect } from 'react'
import Navbar from './components/Navbar'
import About from './pages/About'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Features from './pages/Features'
import Home from './pages/Home'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useUserStore } from './store/useUserStore'
import { toast, Toaster } from 'react-hot-toast'

const NAVBAR_HIDDEN_ROUTES = ['/auth', '/dashboard']

const App = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const showNavbar = !NAVBAR_HIDDEN_ROUTES.includes(location.pathname)
  const { user, setUser } = useUserStore()



  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const errorParam = params.get('error')
    const messageParam = params.get('message')

    if (errorParam === 'oauth_failed') {
      toast.error(messageParam ? messageParam.replace(/"/g, '') : 'Authentication failed')
      params.delete('error')
      params.delete('message')
      const newSearch = params.toString()
      navigate(
        {
          pathname: '/',
          search: newSearch ? `?${newSearch}` : ''
        },
        { replace: true }
      )
      return
    }

    let token = params.get('token')
    const hasParamToken = !!token

    if (!token) {
      token = localStorage.getItem('token')
    }

    if (token) {
      if (hasParamToken) {
        localStorage.setItem('token', token)
      }

      const fetchUser = async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_AUTH_SERVICE_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          if (response.ok) {
            const data = await response.json()
            if (data.user) {
              setUser(data.user)
              if (location.pathname === '/auth' || hasParamToken) {
                navigate('/dashboard')
              }
              if (hasParamToken) {
                toast.success(`Welcome back, ${data.user.name || data.user.username}!`)
              }
            }
          } else {
            localStorage.removeItem('token')
            setUser(null)
            if (location.pathname === '/dashboard') {
              navigate('/auth')
            }
          }
        } catch (error) {
          console.error('Error fetching user:', error)
        } finally {
          if (hasParamToken) {
            params.delete('token')
            params.delete('oauth')
            params.delete('user')
            const newSearch = params.toString()
            navigate(
              {
                pathname: location.pathname,
                search: newSearch ? `?${newSearch}` : ''
              },
              { replace: true }
            )
          }
        }
      }

      fetchUser()
    }
  }, [location.search, location.pathname, navigate, setUser])

  return (
    <div className="bg-black w-full min-h-screen text-white font-sans selection:bg-white/10 selection:text-white">
      {showNavbar && <Navbar />}
      <main className="w-full">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Auth />} />
          <Route path="/features" element={<Features />} />
          <Route path="/about" element={<About />} />
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0a0a0a',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: 'Playpen Sans, sans-serif',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#000000',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#000000',
            },
          },
        }}
      />
    </div>
  )
}

export default App
