import { useEffect, useState } from 'react'

const TIER_COLORS = {
  low:      { text: 'text-green-400',  ring: '#22c55e', bg: 'from-green-900/30 to-transparent' },
  moderate: { text: 'text-amber-400',  ring: '#f59e0b', bg: 'from-amber-900/30 to-transparent' },
  high:     { text: 'text-red-500',    ring: '#ef4444', bg: 'from-red-900/30 to-transparent'   },
}

function getTier(score) {
  if (score <= 35) return 'low'
  if (score <= 65) return 'moderate'
  return 'high'
}

export default function ScoreHero({ score, originalScore, tier, tierLabel, tierSub, components }) {
  const [displayed, setDisplayed] = useState(0)
  const resolvedTier = getTier(score)
  const colors = TIER_COLORS[resolvedTier]
  const circumference = 2 * Math.PI * 42
  const progress = (score / 100) * circumference

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
    <div className={`rounded-2xl bg-gradient-to-br ${colors.bg} border border-white/8 p-8`}
      style={{ background: 'rgba(255,255,255,0.03)' }}>

      <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">

        {/* Score circle */}
        <div className="relative flex-shrink-0">
          <svg className="w-44 h-44 -rotate-90" viewBox="0 0 100 100">
            {/* Track */}
            <circle cx="50" cy="50" r="42" fill="none"
              stroke="rgba(255,255,255,0.06)" strokeWidth="7"/>
            {/* Progress */}
            <circle cx="50" cy="50" r="42" fill="none"
              stroke={colors.ring}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (displayed / 100) * circumference}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.05s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-display text-5xl font-black ${colors.text}`}>
              {displayed}
            </span>
            <span className="text-white/40 text-xs font-semibold tracking-widest uppercase mt-1">
              out of 100
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex-1 text-center lg:text-left">
          <div className="text-xs font-bold tracking-widest uppercase text-white/30 mb-2">
            Your Risk Score
          </div>
          <h1 className={`font-display text-4xl font-black mb-1 ${colors.text}`}>
            {tierLabel}
          </h1>
          <p className="text-white/50 text-sm mb-6">{tierSub}</p>

          {/* Score was updated notice */}
          {score !== originalScore && (
            <div className="inline-flex items-center gap-2 bg-green-900/30 border border-green-500/20 rounded-full px-3 py-1.5 mb-4">
              <span className="text-green-400 text-xs font-bold">
                ↓ {originalScore - score} points saved by completing goals
              </span>
            </div>
          )}

          {/* Component bars */}
          <div className="space-y-3">
            {components.map((c) => {
              const pct = (c.score / c.max) * 100
              return (
                <div key={c.label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-white/50 font-medium">{c.label}</span>
                    <span className="text-xs text-white/40">{c.score}/{c.max} pts</span>
                  </div>
                  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${pct}%`,
                        background: pct > 70 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#22c55e',
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