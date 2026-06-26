import Navbar from './components/Navbar'
import About from './pages/About'
import Dashboard from './pages/Dashboard'
import Features from './pages/Features'
import Home from './pages/Home'
import { Route, Routes } from 'react-router-dom'

const App = () => {
  return (
    <div className="bg-black w-full min-h-screen text-white font-sans selection:bg-white/10 selection:text-white">
      <Navbar />
      <main className="w-full">
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/features' element={<Features />} />
          <Route path='/about' element={<About />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
