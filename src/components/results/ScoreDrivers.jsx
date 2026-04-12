export default function ScoreDrivers({ drivers }) {
  const raising = drivers.filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta)
  const lowering = drivers.filter((d) => d.delta < 0).sort((a, b) => a.delta - b.delta)

  return (
    <div className="rounded-2xl border border-white/8 p-6"
      style={{ background: 'rgba(255,255,255,0.03)' }}>

      <h2 className="font-display text-lg font-bold text-white mb-5">
        What Drove Your Score
      </h2>

      {/* Raising */}
      <div className="mb-5">
        <div className="text-xs font-bold tracking-widest uppercase text-red-400/70 mb-3">
          ↑ Raising Your Score
        </div>
        <div className="space-y-2">
          {raising.map((d, i) => (
            <DriverRow key={i} driver={d} type="up" />
          ))}
        </div>
      </div>

      {/* Lowering */}
      <div>
        <div className="text-xs font-bold tracking-widest uppercase text-green-400/70 mb-3">
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
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-base w-6 text-center flex-shrink-0">{driver.icon}</span>
      <span className="text-sm text-white/70 flex-1 leading-snug">{driver.label}</span>
      <span className={`text-xs font-black tabular-nums flex-shrink-0 ${
        isUp ? 'text-red-400' : 'text-green-400'
      }`}>
        {isUp ? '+' : ''}{driver.delta}
      </span>
    </div>
  )
}