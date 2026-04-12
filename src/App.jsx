import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AssessmentPage from './pages/AssessmentPage'
import ResultsPage from './pages/ResultsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/assessment" element={<AssessmentPage />} />
      <Route path="/results" element={<ResultsPage />} />
    </Routes>
  )
}
