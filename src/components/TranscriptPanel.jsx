import { useEffect, useRef } from 'react'

export default function TranscriptPanel({ messages }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) return null

  return (
    <div className="w-full max-w-xl mx-auto mt-8 space-y-3 max-h-64 overflow-y-auto px-1">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`transcript-msg flex gap-3 ${
            msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          {/* Avatar */}
          <div
            className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
              msg.role === 'agent'
                ? 'bg-sf-blue text-white overflow-hidden'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {msg.role === 'agent' ? (
              <img
                src="/agent-jake.png"
                alt="Jake"
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.parentElement.textContent = 'J'
                }}
              />
            ) : (
              'You'
            )}
          </div>

          {/* Bubble */}
          <div
            className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'agent'
                ? 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-tl-none'
                : 'bg-sf-blue text-white rounded-tr-none'
            }`}
          >
            {msg.text}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}