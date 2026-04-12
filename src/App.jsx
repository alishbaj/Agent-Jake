import { useState, useEffect, useRef } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AssessmentPage from './pages/AssessmentPage'
import ResultsPage from './pages/ResultsPage'

function AppRoutes() {
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState(location)
  const [overlayStyle, setOverlayStyle] = useState({
    opacity: 1,
    transition: 'opacity 400ms ease',
  })
  const firstPaint = useRef(true)

  useEffect(() => {
    if (firstPaint.current) {
      firstPaint.current = false
      return
    }
    if (
      displayLocation.pathname === location.pathname &&
      displayLocation.search === location.search &&
      displayLocation.hash === location.hash
    ) {
      return
    }

    setOverlayStyle({ opacity: 0, transition: 'opacity 300ms ease' })
    const exitTimer = window.setTimeout(() => {
      setDisplayLocation(location)
      setOverlayStyle({ opacity: 0, transition: 'none' })
      window.requestAnimationFrame(() => {
        setOverlayStyle({ opacity: 1, transition: 'opacity 400ms ease' })
      })
    }, 300)
    return () => window.clearTimeout(exitTimer)
  }, [location])

  return (
    <div className="min-h-screen" style={overlayStyle}>
      <Routes location={displayLocation}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/assessment" element={<AssessmentPage />} />
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return <AppRoutes />
}
