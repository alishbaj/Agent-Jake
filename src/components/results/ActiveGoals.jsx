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
    <div className="rounded-2xl border border-gray-200/90 bg-white/90 p-6 shadow-sm">
      <div className="flex items-start justify-between mb-5 gap-3">
        <h2 className="font-display text-lg font-bold text-gray-900">Active Goals</h2>
        {totalPossibleSavings > 0 && (
          <div className="text-xs text-green-800 font-bold bg-green-50 border border-green-200/80 rounded-full px-3 py-1 shrink-0">
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
                  ? 'border-green-200 bg-green-50/50'
                  : 'border-gray-200/90 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => handleComplete(goal)}
                  disabled={isComplete}
                  className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-all duration-300 ${
                    isComplete
                      ? 'bg-green-600 border-green-600'
                      : 'border-gray-300 hover:border-sf-blue/50 hover:bg-sf-blue/5'
                  }`}
                >
                  {isComplete && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-semibold leading-snug mb-1 ${
                      isComplete ? 'text-gray-400 line-through' : 'text-gray-900'
                    }`}
                  >
                    {goal.title}
                  </div>
                  <div className="text-xs text-gray-600 leading-snug">{goal.desc}</div>
                  {!isComplete && (
                    <div className="text-xs text-amber-800/80 font-medium mt-1.5">Due: {goal.due}</div>
                  )}
                  {isCelebrating && (
                    <div className="text-xs text-green-700 font-bold mt-1.5 animate-pulse">
                      Score updated — −{goal.points} points
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 text-xs font-black text-green-800 bg-green-100 rounded-full px-2 py-0.5">
                  −{goal.points}pts
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {completedGoals.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {completedGoals.length} of {goals.length} goals completed
          </span>
          <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 rounded-full transition-all duration-500"
              style={{ width: `${(completedGoals.length / goals.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
