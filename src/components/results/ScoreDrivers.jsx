export default function ScoreDrivers({ drivers }) {
  const raising = drivers.filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta)
  const lowering = drivers.filter((d) => d.delta < 0).sort((a, b) => a.delta - b.delta)

  return (
    <div className="rounded-2xl border border-gray-200/90 bg-white/90 p-6 shadow-sm">
      <h2 className="font-display text-lg font-bold text-gray-900 mb-5">What Drove Your Score</h2>

      <div className="mb-5">
        <div className="text-xs font-bold tracking-widest uppercase text-red-700/80 mb-3">
          ↑ Raising Your Score
        </div>
        <div className="space-y-2">
          {raising.map((d, i) => (
            <DriverRow key={i} driver={d} type="up" />
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-bold tracking-widest uppercase text-green-800/80 mb-3">
          ↓ Lowering Your Score
        </div>
        <div className="space-y-2">
          {lowering.map((d, i) => (
            <DriverRow key={i} driver={d} type="down" />
          ))}
        </div>
      </div>
    </div>
  )
}

function DriverRow({ driver, type }) {
  const isUp = type === 'up'
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${isUp ? 'bg-red-500' : 'bg-green-600'}`}
        aria-hidden
      />
      <span className="text-sm text-gray-700 flex-1 leading-snug">{driver.label}</span>
      <span
        className={`text-xs font-black tabular-nums flex-shrink-0 ${
          isUp ? 'text-red-600' : 'text-green-700'
        }`}
      >
        {isUp ? '+' : ''}
        {driver.delta}
      </span>
    </div>
  )
}
