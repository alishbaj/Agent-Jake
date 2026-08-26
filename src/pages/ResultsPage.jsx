import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ScoreDrivers from '../components/results/ScoreDrivers'
import ActiveGoals from '../components/results/ActiveGoals'
import { completeGoal } from '../api/riskApi'

function getTier(score) {
  if (score <= 35) return {
    label: 'Low Risk',
    color: '#2e7d32',
    ring: '#22c55e',
    sub: 'Preferred — excellent homeowner profile'
  }
  if (score <= 65) return {
    label: 'Moderate Risk',
    color: '#b45309',
    ring: '#f59e0b',
    sub: 'Standard — average homeowner profile'
  }
  return {
    label: 'High Risk',
    color: '#CC0000',
    ring: '#ef4444',
    sub: 'Elevated — immediate action recommended'
  }
}

function inferCategory(factor = '') {
  const f = factor.toLowerCase()
  if (f.includes('flood') || f.includes('fire station') || f.includes('crime') || f.includes('wildfire')) return 'location'
  if (f.includes('roof') || f.includes('home age') || f.includes('construction')) return 'property'
  if (f.includes('weather') || f.includes('storm') || f.includes('hail')) return 'weather'
  if (f.includes('security') || f.includes('smoke') || f.includes('water') || f.includes('extinguisher') || f.includes('claims') || f.includes('mitigation')) return 'behavior'
  if (f.includes('credit')) return 'financial'
  return 'property'
}

function mapApiResult(apiData) {
  if (!apiData) return null
  const score = apiData.score ?? 0

  const drivers = (apiData.score_drivers ?? []).map((d) => ({
    label: d.factor + (d.value ? ` — ${d.value}` : ''),
    delta: d.delta,
    reason: d.reason,
    category: inferCategory(d.factor),
  }))

  const goals = (apiData.recommendations ?? []).map((r, i) => ({
    id: i + 1,
    title: r.action,
    desc: r.why,
    due: r.effort === 'Easy' ? 'This week' : r.effort === 'Moderate' ? 'This month' : 'Next month',
    points: Math.abs(r.score_impact ?? 0),
    effort: r.effort,
    cost: r.cost,
    tier: r.tier,
  }))

  const weather = apiData.weather_alert_message
    ? {
        alert: apiData.weather_alert_message,
        seasonal: apiData.seasonal_tip || null,
        severity: 'warning',
      }
    : apiData.seasonal_tip
    ? {
        alert: null,
        seasonal: apiData.seasonal_tip,
        severity: 'info',
      }
    : null

  const address =
    apiData.formatted_address ||
    apiData.extracted_intake?.address ||
    apiData.api_data?.formatted_address ||
    'Property address'

  const components = apiData.components ?? []

  return {
    score,
    address,
    drivers,
    goals,
    weather,
    components,
    summary: apiData.summary ?? '',
    assessmentId: apiData.assessment_id,
  }
}

function ResultsLoading() {
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
  }, [steps.length])

  return (
    <div className="min-h-screen font-body flex flex-col" style={{ background: '#1B3A6B' }}>
      <Navbar />
      <div className="flex-1 flex items-center justify-center pt-20 px-4">
        <div className="w-full max-w-md flex flex-col items-center gap-8">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#CC0000"
                strokeWidth="8" strokeDasharray="264" strokeDashoffset="66"
                strokeLinecap="round" className="animate-spin"
                style={{ animationDuration: '2s' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white/70 text-sm font-semibold">Scoring</span>
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="font-display text-2xl font-bold text-white">Calculating Your Risk Score</h2>
            <p className="text-white/60 text-sm">Analyzing your property across 5 risk categories</p>
          </div>
          <div className="space-y-2 w-full max-w-xs">
            {steps.map((s, i) => (
              <div key={s} className={`flex items-center gap-3 text-sm transition-all duration-300 ${i <= step ? 'text-white' : 'text-white/30'}`}>
                <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${i < step ? 'bg-green-500' : i === step ? 'bg-[#CC0000] animate-pulse' : 'bg-white/20'}`}>
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
    </div>
  )
}

function ResultsError({ onRetry }) {
  return (
    <div className="min-h-screen font-body flex flex-col" style={{ background: '#1B3A6B' }}>
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center pt-20 px-6">
        <div className="max-w-md text-center space-y-4">
          <h2 className="font-display text-2xl font-bold text-white">No assessment data found</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Please complete the voice or chat assessment first to generate your personalized risk score.
          </p>
          <button onClick={onRetry}
            className="mt-4 rounded-xl bg-[#CC0000] px-8 py-3.5 text-sm font-semibold text-white hover:bg-red-700 shadow-md">
            Start assessment
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ResultsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [goalMessages, setGoalMessages] = useState({})

  const rawResult = location.state?.result ?? null
  const result = mapApiResult(rawResult)

  const [currentScore, setCurrentScore] = useState(result?.score ?? 0)
  const [completedGoals, setCompletedGoals] = useState([])
  const [displayed, setDisplayed] = useState(0)

  // Loading screen timer
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1600)
    return () => clearTimeout(t)
  }, [])

  // Fade in after loading
  useEffect(() => {
    if (!loading) setTimeout(() => setLoaded(true), 100)
  }, [loading])

  // Sync score when result loads
  useEffect(() => {
    if (result?.score != null) setCurrentScore(result.score)
  }, [result?.score])

  // Animate score counter
  useEffect(() => {
    setDisplayed(0)
    if (!currentScore) return
    const delay = setTimeout(() => {
      let start = 0
      const end = currentScore
      const duration = 1600
      const step = (end / duration) * 16
      const timer = setInterval(() => {
        start += step
        if (start >= end) { setDisplayed(end); clearInterval(timer) }
        else setDisplayed(Math.floor(start))
      }, 16)
      return () => clearInterval(timer)
    }, 200)
    return () => clearTimeout(delay)
  }, [currentScore])

  async function handleCompleteGoal(goal) {
    if (completedGoals.includes(goal.id)) return
    const newScore = Math.max(0, currentScore - goal.points)
    setCompletedGoals((prev) => [...prev, goal.id])
    setCurrentScore(newScore)
    try {
      const res = await completeGoal(goal.title, currentScore, newScore)
      if (res?.message) setGoalMessages((prev) => ({ ...prev, [goal.id]: res.message }))
    } catch (e) {
      console.error('Goal completion error:', e)
    }
  }

  if (loading) return <ResultsLoading />
  if (!result) return <ResultsError onRetry={() => navigate('/assessment')} />

  const tier = getTier(currentScore)
  const circumference = 2 * Math.PI * 54

  return (
    <div className="min-h-screen font-body" style={{ background: '#1B3A6B' }}>
      <Navbar />
      <main className="pt-20 pb-16 px-4">
        <div
          className="max-w-3xl mx-auto rounded-3xl shadow-2xl overflow-hidden"
          style={{
            background: '#f5f4eb',
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}
        >
          {/* HEADER */}
          <div className="px-10 pt-10 pb-6 border-b border-black/6">
            <div className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#CC0000' }}>
              Risk Assessment Report
            </div>
            <h1 className="font-display text-4xl font-black mb-2" style={{ color: '#003087' }}>
              Your property risk profile
            </h1>
            {result.summary ? (
              <p className="text-sm leading-relaxed mb-5" style={{ color: '#5a6272' }}>
                {result.summary}
              </p>
            ) : (
              <p className="text-sm leading-relaxed mb-5" style={{ color: '#5a6272' }}>
                Scores reflect modeled risk factors for this address. Use the breakdown
                below to see what influenced your result and which actions may help.
              </p>
            )}
            <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-black/5">
              <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#003087' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium" style={{ color: '#003087' }}>{result.address}</span>
            </div>
          </div>

          {/* SCORE CIRCLE */}
          <div className="px-10 py-10 flex flex-col items-center border-b border-black/6">
            <div className="relative mb-6">
              <svg width="220" height="220" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e3d8" strokeWidth="7" />
                <circle cx="60" cy="60" r="54"
                  fill="none"
                  stroke={tier.ring}
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (displayed / 100) * circumference}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dashoffset 0.05s linear' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-5xl font-black" style={{ color: tier.color }}>
                  {displayed}
                </span>
                <span className="text-xs font-bold tracking-widest uppercase mt-1" style={{ color: '#9ca3af' }}>
                  out of 100
                </span>
              </div>
            </div>

            <div className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9ca3af' }}>
              Your Risk Score
            </div>
            <h2 className="font-display text-3xl font-black mb-1" style={{ color: tier.color }}>
              {tier.label}
            </h2>
            <p className="text-sm mb-6" style={{ color: '#6b7280' }}>{tier.sub}</p>

            {currentScore !== result.score && (
              <div className="mb-5 flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5">
                <span className="text-green-700 text-xs font-bold">
                  {result.score - currentScore} points saved by completing goals
                </span>
              </div>
            )}

            {/* Weather / seasonal alert */}
            {result.weather && (result.weather.alert || result.weather.seasonal) && (
              <div className="w-full max-w-md rounded-xl p-4 flex items-start gap-3"
                style={{ background: '#fffbeb', border: '1px solid #fcd34d' }}>
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#b45309' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div className="flex-1">
                  <div className="text-xs font-bold tracking-widest uppercase mb-0.5" style={{ color: '#b45309' }}>
                    Live Risk Factor
                  </div>
                  {result.weather.alert && (
                    <p className="text-sm font-semibold leading-snug mb-1" style={{ color: '#1f2937' }}>
                      {result.weather.alert}
                    </p>
                  )}
                  {result.weather.seasonal && (
                    <p className="text-xs" style={{ color: '#6b7280' }}>{result.weather.seasonal}</p>
                  )}
                </div>
                <div className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: '#fef3c7', color: '#b45309' }}>
                  Live
                </div>
              </div>
            )}
          </div>

          {/* SCORE BY CATEGORY */}
          {result.components.length > 0 && (
            <div className="px-10 py-8 border-b border-black/6">
              <div className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#CC0000' }}>
                Score Breakdown
              </div>
              <h3 className="font-display text-2xl font-bold mb-6" style={{ color: '#003087' }}>
                Score by category
              </h3>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
                <div className="space-y-4">
                  {result.components.map((c) => {
                    const pct = (c.score / c.max) * 100
                    const barColor = pct > 70 ? '#ef4444' : pct > 45 ? '#f59e0b' : '#22c55e'
                    return (
                      <div key={c.label}>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm font-medium" style={{ color: '#1f2937' }}>{c.label}</span>
                          <span className="text-sm" style={{ color: '#6b7280' }}>{c.score} / {c.max} pts</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: '#e5e7eb' }}>
                          <div className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* DRIVERS + GOALS */}
          <div className="px-10 py-8 border-b border-black/6">
            <div className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#CC0000' }}>
              Transparency
            </div>
            <h3 className="font-display text-2xl font-bold mb-6" style={{ color: '#003087' }}>
              What drove your score
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {result.drivers.length > 0
                ? <ScoreDrivers drivers={result.drivers} />
                : <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">No score drivers available.</div>
              }
              {result.goals.length > 0
                ? <ActiveGoals goals={result.goals} completedGoals={completedGoals} onComplete={handleCompleteGoal} goalMessages={goalMessages} />
                : <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">No recommendations available.</div>
              }
            </div>
          </div>

          {/* FOOTER */}
          <div className="px-10 py-8 flex flex-col items-center gap-4">
            <button
              onClick={() => navigate('/assessment')}
              className="text-sm font-semibold underline underline-offset-4 transition-colors"
              style={{ color: '#003087' }}
            >
              Retake Assessment
            </button>
            <p className="text-xs text-center" style={{ color: '#9ca3af' }}>
              Agent Jake is a prototype built for WeHack 2026 · Not official insurance advice
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}