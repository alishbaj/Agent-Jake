export default function WeatherAlert({ weather }) {
  const isWarning = weather.severity === 'warning'

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        isWarning
          ? 'border-amber-200 bg-amber-50/90'
          : 'border-sf-blue/15 bg-sf-blue/[0.06]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 mt-0.5 p-2 rounded-xl ${
            isWarning ? 'bg-amber-100 text-amber-700' : 'bg-sf-blue/10 text-sf-blue'
          }`}
        >
          {isWarning ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
              />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={`text-xs font-bold tracking-widest uppercase mb-1 ${
              isWarning ? 'text-amber-800/80' : 'text-sf-blue/80'
            }`}
          >
            {isWarning ? 'Active Weather Alert' : 'Weather Info'}
          </div>
          <p className="text-gray-900 text-sm font-semibold leading-snug mb-2">{weather.alert}</p>
          <p className="text-gray-600 text-xs leading-relaxed">{weather.seasonal}</p>
        </div>
        <div
          className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
            isWarning ? 'bg-amber-200/80 text-amber-900' : 'bg-sf-blue/15 text-sf-blue'
          }`}
        >
          Live
        </div>
      </div>
    </div>
  )
}
