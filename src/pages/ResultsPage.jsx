import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ScoreHero from '../components/results/ScoreHero'
import ScoreDrivers from '../components/results/ScoreDrivers'
import WeatherAlert from '../components/results/WeatherAlert'
import ActiveGoals from '../components/results/ActiveGoals'

// Mock data — replace with real data from your backend
const MOCK_RESULT = {
  score: 64,
  tier: 'moderate',
  tierLabel: 'Moderate Risk',
  tierSub: 'Standard — average homeowner profile',
  address: '456 Oak Avenue, Richardson TX 75080',
  drivers: [
    { delta: +18, label: 'Roof age over 15 years', category: 'property', icon: '🏚️' },
    { delta: +12, label: 'Located in hail belt (Texas)', category: 'weather', icon: '🌩️' },
    { delta: +8,  label: 'FEMA Flood Zone AE', category: 'location', icon: '🌊' },
    { delta: +7,  label: 'Electrical system not updated', category: 'property', icon: '⚡' },
    { delta: +5,  label: 'Galvanized plumbing', category: 'property', icon: '🚰' },
    { delta: -10, label: 'Security system present', category: 'behavior', icon: '🔐' },
    { delta: -6,  label: 'Excellent credit tier', category: 'financial', icon: '💳' },
    { delta: -4,  label: 'No prior claims (5 years)', category: 'behavior', icon: '📋' },
    { delta: -4,  label: 'Primary residence', category: 'behavior', icon: '🏠' },
    { delta: -2,  label: 'Smoke & CO detectors', category: 'behavior', icon: '🔥' },
  ],
  components: [
    { label: 'Location Risk', weight: 30, score: 22, max: 30 },
    { label: 'Property Risk', weight: 25, score: 18, max: 25 },
    { label: 'Weather Exposure', weight: 20, score: 14, max: 20 },
    { label: 'Behavior & Maintenance', weight: 15, score: 6, max: 15 },
    { label: 'Financial Stability', weight: 10, score: 4, max: 10 },
  ],
  weather: {
    alert: 'Severe thunderstorm watch in your area — high hail risk today.',
    seasonal: 'Pre-summer checklist active: inspect roof, clear gutters, check AC.',
    severity: 'warning',
  },
  goals: [
    { id: 1, title: 'Schedule roof inspection', desc: 'Could lower your score by up to 8 points', due: 'This week', points: 8 },
    { id: 2, title: 'Install water leak sensor', desc: 'Could lower your score by up to 5 points', due: 'This month', points: 5 },
    { id: 3, title: 'Upgrade electrical panel', desc: 'Could lower your score by up to 7 points', due: 'Next month', points: 7 },
  ],
}

export default function ResultsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [result] = useState(location.state?.result || MOCK_RESULT)
  const [loading, setLoading] = useState(true)
  const [completedGoals, setCompletedGoals] = useState([])
  const [currentScore, setCurrentScore] = useState(result.score)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1800)
    return () => clearTimeout(timer)
  }, [])

  function handleCompleteGoal(goal) {
    if (completedGoals.includes(goal.id)) return
    setCompletedGoals((prev) => [...prev, goal.id])
    setCurrentScore((prev) => Math.max(0, prev - goal.points))
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-gray-950 font-body">
      <Navbar />

      <main className="pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Address pill */}
          <div className="flex items-center gap-2 text-xs text-white/40 font-medium">
            <span>📍</span>
            <span>{result.address}</span>
          </div>

          {/* Score Hero */}
          <ScoreHero
            score={currentScore}
            originalScore={result.score}
            tier={result.tier}
            tierLabel={result.tierLabel}
            tierSub={result.tierSub}
            components={result.components}
          />

          {/* Weather Alert */}
          {result.weather && (
            <WeatherAlert weather={result.weather} />
          )}

          {/* Two column — drivers + goals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ScoreDrivers drivers={result.drivers} />
            <ActiveGoals
              goals={result.goals}
              completedGoals={completedGoals}
              onComplete={handleCompleteGoal}
            />
          </div>

          {/* Start over */}
          <div className="text-center pt-4">
            <button
              onClick={() => navigate('/assessment')}
              className="text-white/30 hover:text-white/60 text-sm underline underline-offset-4 transition-colors"
            >
              Retake Assessment
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}

function LoadingScreen() {
  const [step, setStep] = useState(0)
  const steps = [
    'Analyzing flood zone data...',
    'Calculating property risk...',
    'Checking weather exposure...',
    'Evaluating behavior factors...',
    'Generating your risk score...',
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev))
    }, 320)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center font-body">
      <Navbar />
      <div className="flex flex-col items-center gap-8">
        {/* Spinning score circle */}
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="#CC0000"
              strokeWidth="8"
              strokeDasharray="264"
              strokeDashoffset="66"
              strokeLinecap="round"
              className="animate-spin"
              style={{ animationDuration: '2s' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white/60 text-sm font-semibold">Scoring</span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="font-display text-2xl font-bold text-white">
            Calculating Your Risk Score
          </h2>
          <p className="text-white/40 text-sm">
            Analyzing your property across 5 risk categories
          </p>
        </div>

        {/* Step list */}
        <div className="space-y-2 w-64">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                i <= step ? 'text-white/70' : 'text-white/20'
              }`}
            >
              <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${
                i < step
                  ? 'bg-green-600'
                  : i === step
                  ? 'bg-sf-red animate-pulse'
                  : 'bg-white/10'
              }`}>
                {i < step && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}