import { useState } from 'react'

export default function ActiveGoals({ goals, completedGoals, onComplete }) {
  const [celebrated, setCelebrated] = useState([])

  function handleComplete(goal) {
    if (completedGoals.includes(goal.id)) return
    setCelebrated((prev) => [...prev, goal.id])
    onComplete(goal)
    setTimeout(() => {
      setCelebrated((prev) => prev.filter((id) => id !== goal.id))
    }, 2000)
  }

  const totalPossibleSavings = goals
    .filter((g) => !completedGoals.includes(g.id))
    .reduce((sum, g) => sum + g.points, 0)

  return (
    <div className="rounded-2xl border border-white/8 p-6"
      style={{ background: 'rgba(255,255,255,0.03)' }}>

      <div className="flex items-start justify-between mb-5">
        <h2 className="font-display text-lg font-bold text-white">
          Active Goals
        </h2>
        {totalPossibleSavings > 0 && (
          <div className="text-xs text-green-400 font-bold bg-green-900/20 border border-green-500/20 rounded-full px-3 py-1">
            Save up to {totalPossibleSavings} pts
          </div>
        )}
      </div>

      <div className="space-y-3">
        {goals.map((goal) => {
          const isComplete = completedGoals.includes(goal.id)
          const isCelebrating = celebrated.includes(goal.id)

          return (
            <div
              key={goal.id}
              className={`rounded-xl p-4 border transition-all duration-500 ${
                isComplete
                  ? 'border-green-500/20 bg-green-900/10'
                  : 'border-white/8 bg-white/3'
              }`}
              style={!isComplete ? { background: 'rgba(255,255,255,0.02)' } : {}}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                  onClick={() => handleComplete(goal)}
                  disabled={isComplete}
                  className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-all duration-300 ${
                    isComplete
                      ? 'bg-green-500 border-green-500'
                      : 'border-white/20 hover:border-white/50'
                  }`}
                >
                  {isComplete && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold leading-snug mb-1 ${
                    isComplete ? 'text-white/40 line-through' : 'text-white/85'
                  }`}>
                    {goal.title}
                  </div>
                  <div className="text-xs text-white/35 leading-snug">
                    {goal.desc}
                  </div>
                  {!isComplete && (
                    <div className="text-xs text-amber-400/60 font-medium mt-1.5">
                      Due: {goal.due}
                    </div>
                  )}
                  {isCelebrating && (
                    <div className="text-xs text-green-400 font-bold mt-1.5 animate-pulse">
                      ✓ Score updated! −{goal.points} points
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 text-xs font-black text-green-400 bg-green-900/20 rounded-full px-2 py-0.5">
                  −{goal.points}pts
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {completedGoals.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
          <span className="text-xs text-white/30">
            {completedGoals.length} of {goals.length} goals completed
          </span>
          <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedGoals.length / goals.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}