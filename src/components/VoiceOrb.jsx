export default function VoiceOrb({ state, started }) {
  const isListening = state === 'listening'
  const isSpeaking = state === 'speaking'
  const isThinking = state === 'thinking'
  const isIdle = state === 'idle'

  return (
    <div className={`relative flex items-center justify-center transition-all duration-700 ${
      started ? 'w-48 h-48' : 'w-64 h-64'
    }`}>

      {/* Pulse rings */}
      {(isListening || isSpeaking) && (
        <>
          <div className="absolute inset-0 rounded-full border-2 border-red-500/30 orb-ring" />
          <div
            className="absolute inset-0 rounded-full border border-red-500/15 orb-ring"
            style={{ animationDelay: '0.9s' }}
          />
        </>
      )}

      {/* Glow ring */}
      <div
        className={`absolute inset-2 rounded-full transition-all duration-700 ${
          isListening
            ? 'bg-red-500/15 scale-110'
            : isSpeaking
            ? 'bg-blue-900/15 scale-105'
            : isThinking
            ? 'bg-yellow-400/10'
            : 'bg-gray-800/50'
        }`}
      />

      {/* Main orb */}
      <div
        className={`relative z-10 w-full h-full rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-500 overflow-hidden ${
          isListening
            ? 'bg-gradient-to-br from-red-600 to-red-800'
            : isSpeaking
            ? 'bg-gradient-to-br from-sf-blue to-sf-blue-mid'
            : isThinking
            ? 'bg-gradient-to-br from-gray-700 to-gray-900'
            : 'bg-gradient-to-br from-gray-800 to-gray-900'
        }`}
      >
        {/* Agent Jake photo */}
        <img
          src="/agent-jake.png"
          alt="Agent Jake"
          className={`absolute inset-0 w-full h-full object-cover rounded-full transition-opacity duration-300 ${
            isSpeaking || isListening ? 'opacity-25' : 'opacity-55'
          }`}
          onError={(e) => { e.target.style.display = 'none' }}
        />

        {/* State overlay */}
        <div className="relative z-10 flex flex-col items-center gap-2">

          {isListening && (
            <>
              <div className="flex gap-2 items-center">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-3 h-3 bg-white rounded-full listen-dot"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
              <span className="text-white/80 text-xs font-semibold tracking-widest uppercase mt-1">
                Listening
              </span>
            </>
          )}

          {isSpeaking && (
            <>
              <div className="flex items-end gap-1 h-8">
                {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6].map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-white rounded-full wave-bar"
                    style={{
                      height: `${h * 28}px`,
                      animationDelay: `${i * 0.12}s`,
                    }}
                  />
                ))}
              </div>
              <span className="text-white/80 text-xs font-semibold tracking-widest uppercase">
                Speaking
              </span>
            </>
          )}

          {isThinking && (
            <>
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-white/70 text-xs font-semibold tracking-widest uppercase mt-1">
                Thinking
              </span>
            </>
          )}

          {isIdle && !started && (
            <span className="text-white/40 text-xs font-semibold tracking-widest uppercase">
              Agent Jake
            </span>
          )}
        </div>
      </div>
    </div>
  )
}