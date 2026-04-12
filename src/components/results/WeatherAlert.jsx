export default function WeatherAlert({ weather }) {
  const isWarning = weather.severity === 'warning'

  return (
    <div className={`rounded-2xl border p-5 ${
      isWarning
        ? 'border-amber-500/25 bg-amber-900/10'
        : 'border-blue-500/20 bg-blue-900/10'
    }`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5">
          {isWarning ? '⚡' : '🌤️'}
        </span>
        <div className="flex-1">
          <div className={`text-xs font-bold tracking-widest uppercase mb-1 ${
            isWarning ? 'text-amber-400/70' : 'text-blue-400/70'
          }`}>
            {isWarning ? 'Active Weather Alert' : 'Weather Info'}
          </div>
          <p className="text-white/80 text-sm font-semibold leading-snug mb-2">
            {weather.alert}
          </p>
          <p className="text-white/45 text-xs leading-relaxed">
            {weather.seasonal}
          </p>
        </div>
        <div className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
          isWarning
            ? 'bg-amber-500/15 text-amber-400'
            : 'bg-blue-500/15 text-blue-400'
        }`}>
          Live
        </div>
      </div>
    </div>
  )
}