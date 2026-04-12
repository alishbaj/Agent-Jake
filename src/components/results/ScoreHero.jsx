import { useEffect, useState } from 'react'

const TIER_COLORS = {
  low: {
    text: 'text-green-700',
    ring: '#15803d',
    sub: 'text-gray-600',
  },
  moderate: {
    text: 'text-amber-700',
    ring: '#b45309',
    sub: 'text-gray-600',
  },
  high: {
    text: 'text-red-600',
    ring: '#dc2626',
    sub: 'text-gray-600',
  },
}

function getTier(score) {
  if (score <= 35) return 'low'
  if (score <= 65) return 'moderate'
  return 'high'
}

export default function ScoreHero({ score, originalScore, tierLabel, tierSub, components }) {
  const [displayed, setDisplayed] = useState(0)
  const resolvedTier = getTier(score)
  const colors = TIER_COLORS[resolvedTier]
  const circumference = 2 * Math.PI * 42

  useEffect(() => {
    let start = 0
    const end = score
    const duration = 1500
    const step = (end / duration) * 16
    const timer = setInterval(() => {
      start += step
      if (start >= end) {
        setDisplayed(end)
        clearInterval(timer)
      } else {
        setDisplayed(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [score])

  return (
    <div className="rounded-2xl border border-gray-200/90 bg-white/90 backdrop-blur-sm p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
        <div className="relative flex-shrink-0">
          <svg className="w-44 h-44 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="rgba(0,48,135,0.08)"
              strokeWidth="7"
            />
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
            <span className={`font-display text-5xl font-black ${colors.text}`}>{displayed}</span>
            <span className="text-gray-500 text-xs font-semibold tracking-widest uppercase mt-1">
              out of 100
            </span>
          </div>
        </div>

        <div className="flex-1 text-center lg:text-left">
          <div className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-2">
            Your Risk Score
          </div>
          <h1 className={`font-display text-4xl font-black mb-1 ${colors.text}`}>{tierLabel}</h1>
          <p className={`text-sm mb-6 ${colors.sub}`}>{tierSub}</p>

          {score !== originalScore && (
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200/80 rounded-full px-3 py-1.5 mb-4">
              <span className="text-green-800 text-xs font-bold">
                ↓ {originalScore - score} points saved by completing goals
              </span>
            </div>
          )}

          <div className="space-y-3">
            {components.map((c) => {
              const pct = (c.score / c.max) * 100
              return (
                <div key={c.label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600 font-medium">{c.label}</span>
                    <span className="text-xs text-gray-500">
                      {c.score}/{c.max} pts
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
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
      </div>
    </div>
  )
}
