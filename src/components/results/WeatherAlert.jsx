export default function WeatherAlert({ weather }) {
  const isWarning = weather?.severity === 'warning'
  if (!weather?.alert) return null

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${isWarning ? 'border-amber-200 bg-amber-50/90' : 'border-blue-200 bg-blue-50/90'}`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-0.5 p-2 rounded-xl ${isWarning ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-bold tracking-widest uppercase mb-1 ${isWarning ? 'text-amber-800/80' : 'text-blue-800/80'}`}>
            Active Weather Alert
          </div>
          <p className="text-gray-900 text-sm font-semibold leading-snug">{weather.alert}</p>
        </div>
        <div className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${isWarning ? 'bg-amber-200/80 text-amber-900' : 'bg-blue-200/80 text-blue-900'}`}>
          Live
        </div>
      </div>
    </div>
  )
}