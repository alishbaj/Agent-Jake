import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ScoreDrivers from '../components/results/ScoreDrivers'
import WeatherAlert from '../components/results/WeatherAlert'
import ActiveGoals from '../components/results/ActiveGoals'

// Mock data — replace with real data from your backend (exported for assessment → results handoff)
export const MOCK_RESULT = {
  score: 64,
  tier: 'moderate',
  tierLabel: 'Moderate Risk',
  tierSub: 'Standard — average homeowner profile',
  address: '456 Oak Avenue, Richardson TX 75080',
  drivers: [
    { delta: +18, label: 'Roof age over 15 years', category: 'property' },
    { delta: +12, label: 'Located in hail belt (Texas)', category: 'weather' },
    { delta: +8, label: 'FEMA Flood Zone AE', category: 'location' },
    { delta: +7, label: 'Electrical system not updated', category: 'property' },
    { delta: +5, label: 'Galvanized plumbing', category: 'property' },
    { delta: -10, label: 'Security system present', category: 'behavior' },
    { delta: -6, label: 'Excellent credit tier', category: 'financial' },
    { delta: -4, label: 'No prior claims (5 years)', category: 'behavior' },
    { delta: -4, label: 'Primary residence', category: 'behavior' },
    { delta: -2, label: 'Smoke & CO detectors', category: 'behavior' },
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

const TIER_COLORS = {
  low: { text: 'text-green-700', ring: '#15803d', sub: 'text-gray-600' },
  moderate: { text: 'text-amber-700', ring: '#b45309', sub: 'text-gray-600' },
  high: { text: 'text-red-600', ring: '#dc2626', sub: 'text-gray-600' },
}

function getTier(score) {
  if (score <= 35) return 'low'
  if (score <= 65) return 'moderate'
  return 'high'
}

function ScrollFadeSection({ sectionIndex, gate, onAdvance, children }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  const shownRef = useRef(false)

  useEffect(() => {
    if (gate !== sectionIndex || shownRef.current) return
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || shownRef.current) return
        shownRef.current = true
        setShown(true)
        window.setTimeout(() => onAdvance(), 100)
      },
      { threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [gate, sectionIndex, onAdvance])

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out motion-reduce:transition-none ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      {children}
    </div>
  )
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
    const interval = window.setInterval(() => {
      setStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev))
    }, 320)
    return () => window.clearInterval(interval)
  }, [steps.length])

  return (
    <div className="min-h-screen bg-[#1B3A6B] flex flex-col font-body">
      <Navbar />
      <div className="flex-1 flex flex-col min-h-[calc(100vh-4rem)] pt-16">
        <div className="flex-1 w-full bg-[#f5f4eb] flex items-center justify-center px-6 sm:px-10 py-10 sm:py-14 cream-card-enter border-t border-white/20 shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.15)]">
          <div className="w-full max-w-lg flex flex-col items-center gap-8">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(27,58,107,0.12)" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
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
                <span className="text-[#1B3A6B]/70 text-sm font-semibold">Scoring</span>
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="font-display text-2xl font-bold text-[#1B3A6B]">
                Calculating Your Risk Score
              </h2>
              <p className="text-gray-600 text-sm">Analyzing your property across 5 risk categories</p>
            </div>
            <div className="space-y-2 w-full max-w-xs">
              {steps.map((s, i) => (
                <div
                  key={s}
                  className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                    i <= step ? 'text-gray-700' : 'text-gray-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${
                      i < step
                        ? 'bg-green-600'
                        : i === step
                          ? 'bg-[#CC0000] animate-pulse'
                          : 'bg-gray-200'
                    }`}
                  >
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
    </div>
  )
}

function RiskScoreCircle({
  score,
  displayed,
  cardRef,
  scrollY,
  introProg,
}) {
  const rawT = Math.min(1, Math.max(0, (scrollY - 50) / 150))
  const size = 280 - 160 * rawT
  const cardW = cardRef.current?.offsetWidth ?? 800
  const pad = 12
  const leftPx = (1 - rawT) * ((cardW - size) / 2) + rawT * pad
  const topPx = (1 - rawT) * 48 + rawT * pad

  const resolvedTier = getTier(score)
  const colors = TIER_COLORS[resolvedTier]
  const circumference = 2 * Math.PI * 42
  const introOpacity = introProg
  const introScale = 0.8 + 0.2 * introProg

  return (
    <div
      className="pointer-events-none z-20"
      style={{
        position: 'absolute',
        left: leftPx,
        top: topPx,
        width: size,
        height: size,
        transition: 'left 80ms linear, top 80ms linear, width 80ms linear, height 80ms linear',
      }}
    >
      <div
        className="w-full h-full"
        style={{
          opacity: introOpacity,
          transform: `scale(${introScale})`,
          transformOrigin: 'center center',
          transition: 'opacity 800ms ease-out, transform 800ms ease-out',
        }}
      >
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(27,58,107,0.1)" strokeWidth="7" />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={colors.ring}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (displayed / 100) * circumference}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.05s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-display font-black ${colors.text}`} style={{ fontSize: size * 0.26 }}>
            {displayed}
          </span>
          <span className="text-gray-500 text-[10px] sm:text-xs font-semibold tracking-widest uppercase mt-0.5">
            out of 100
          </span>
        </div>
      </div>
    </div>
  )
}

export default function ResultsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [result] = useState(location.state?.result || MOCK_RESULT)
  const [completedGoals, setCompletedGoals] = useState([])
  const [currentScore, setCurrentScore] = useState(result.score)
  const [loading, setLoading] = useState(true)
  const [scrollY, setScrollY] = useState(0)
  const [introProg, setIntroProg] = useState(0)
  const [displayed, setDisplayed] = useState(0)
  const [gate, setGate] = useState(0)
  const [, setLayoutTick] = useState(0)
  const cardRef = useRef(null)

  const advanceGate = useCallback(() => {
    setGate((g) => Math.min(6, g + 1))
  }, [])

  useEffect(() => {
    if (!result.weather && gate === 2) advanceGate()
  }, [gate, result.weather, advanceGate])

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 1600)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY || window.pageYOffset)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (loading) return
    let start = performance.now()
    let frame
    function tick(now) {
      const u = Math.min(1, (now - start) / 800)
      const eased = 1 - (1 - u) ** 3
      setIntroProg(eased)
      if (u < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [loading])

  useEffect(() => {
    if (loading) return
    let start = 0
    const end = currentScore
    const duration = 1500
    const step = (end / duration) * 16
    const timer = window.setInterval(() => {
      start += step
      if (start >= end) {
        setDisplayed(end)
        window.clearInterval(timer)
      } else {
        setDisplayed(Math.floor(start))
      }
    }, 16)
    return () => window.clearInterval(timer)
  }, [currentScore, loading])

  useEffect(() => {
    const onResize = () => {
      setScrollY(window.scrollY || window.pageYOffset)
      setLayoutTick((x) => x + 1)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function handleCompleteGoal(goal) {
    if (completedGoals.includes(goal.id)) return
    setCompletedGoals((prev) => [...prev, goal.id])
    setCurrentScore((prev) => Math.max(0, prev - goal.points))
  }

  const resolvedTier = getTier(currentScore)
  const colors = TIER_COLORS[resolvedTier]

  if (loading) {
    return <ResultsLoading />
  }

  return (
    <div className="min-h-screen bg-[#1B3A6B] font-body flex flex-col">
      <Navbar />

      <main className="flex-1 w-full min-h-[calc(100vh-4rem)] sm:min-h-[calc(100dvh-4rem)] bg-[#f5f4eb] pt-16 cream-card-enter shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] border-t border-white/25">
        <div
          ref={cardRef}
          className="max-w-7xl mx-auto w-full px-5 sm:px-10 lg:px-16 py-10 lg:py-14 pb-24 relative"
        >
          <header className="mb-10 lg:mb-12 border-b border-gray-200/90 pb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#1B3A6B]/55 mb-3">
              Risk assessment report
            </p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-[#1B3A6B] tracking-tight leading-tight">
              Your property risk profile
            </h1>
            <p className="mt-3 text-sm text-gray-600 max-w-2xl leading-relaxed">
              Scores reflect modeled risk factors for this address. Use the breakdown below to see what influenced your result and which actions may help.
            </p>
            <div className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-white/90 border border-gray-200/90 px-4 py-2.5 shadow-sm">
              <svg
                className="w-4 h-4 text-[#1B3A6B] shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-800 tracking-tight">{result.address}</span>
            </div>
          </header>

          <div className="relative min-h-[min(320px,42vw)] mb-10 lg:mb-12">
            <RiskScoreCircle
              score={currentScore}
              displayed={displayed}
              cardRef={cardRef}
              scrollY={scrollY}
              introProg={introProg}
            />
          </div>

          <div className="space-y-10 lg:space-y-12">
            <ScrollFadeSection sectionIndex={0} gate={gate} onAdvance={advanceGate}>
              <div className="text-center lg:text-left max-w-3xl">
                <div className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400 mb-2">
                  Your risk score
                </div>
                <h2 className={`font-display text-4xl sm:text-5xl font-black mb-2 ${colors.text}`}>
                  {result.tierLabel}
                </h2>
                <p className={`text-base ${colors.sub} leading-relaxed`}>{result.tierSub}</p>
                {currentScore !== result.score && (
                  <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/90 rounded-full px-4 py-2 mt-5 shadow-sm">
                    <span className="text-emerald-800 text-sm font-semibold">
                      {result.score - currentScore} points saved by completing goals
                    </span>
                  </div>
                )}
              </div>
            </ScrollFadeSection>

            <ScrollFadeSection sectionIndex={1} gate={gate} onAdvance={advanceGate}>
              <div className="rounded-2xl bg-white/95 border border-gray-200/80 p-6 sm:p-8 shadow-[0_4px_24px_-4px_rgba(27,58,107,0.12)]">
                <h3 className="font-display text-lg font-bold text-[#1B3A6B] mb-6">Score by category</h3>
                <div className="space-y-4">
                  {result.components.map((c) => {
                    const pct = (c.score / c.max) * 100
                    return (
                      <div key={c.label}>
                        <div className="flex justify-between items-baseline gap-4 mb-1.5">
                          <span className="text-sm font-medium text-gray-800">{c.label}</span>
                          <span className="text-xs font-semibold tabular-nums text-gray-500">
                            {c.score} / {c.max} pts
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden ring-1 ring-gray-200/50">
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${pct}%`,
                              background: pct > 70 ? '#dc2626' : pct > 40 ? '#d97706' : '#15803d',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </ScrollFadeSection>

            {result.weather && (
              <ScrollFadeSection sectionIndex={2} gate={gate} onAdvance={advanceGate}>
                <WeatherAlert weather={result.weather} />
              </ScrollFadeSection>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 xl:gap-10 xl:items-start space-y-10 xl:space-y-0">
              <ScrollFadeSection sectionIndex={3} gate={gate} onAdvance={advanceGate}>
                <ScoreDrivers drivers={result.drivers} />
              </ScrollFadeSection>

              <ScrollFadeSection sectionIndex={4} gate={gate} onAdvance={advanceGate}>
                <ActiveGoals
                  goals={result.goals}
                  completedGoals={completedGoals}
                  onComplete={handleCompleteGoal}
                />
              </ScrollFadeSection>
            </div>

            <ScrollFadeSection sectionIndex={5} gate={gate} onAdvance={advanceGate}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-4 border-t border-gray-200/90">
                <button
                  type="button"
                  onClick={() => navigate('/assessment')}
                  className="btn-press order-2 sm:order-1 rounded-xl border-2 border-[#1B3A6B]/20 bg-white px-8 py-3.5 text-sm font-semibold text-[#1B3A6B] hover:border-[#1B3A6B]/40 hover:bg-[#1B3A6B]/[0.04] shadow-sm"
                >
                  Retake assessment
                </button>
                <Link
                  to="/"
                  className="btn-press order-1 sm:order-2 text-center rounded-xl bg-[#1B3A6B] px-8 py-3.5 text-sm font-semibold text-white hover:bg-[#153060] shadow-md border border-[#153060]/30"
                >
                  Back to home
                </Link>
              </div>
            </ScrollFadeSection>
          </div>
        </div>
      </main>
    </div>
  )
}
