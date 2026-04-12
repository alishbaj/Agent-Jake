import { useEffect, useRef } from 'react'

/**
 * @param {{ messages: Array<{ role: string, text: string }>, variant?: 'dark' | 'light' }} props
 */
export default function TranscriptPanel({ messages, variant = 'dark' }) {
  const bottomRef = useRef(null)
  const containerRef = useRef(null)
  const light = variant === 'light'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) return null

  const fadeFrom = light ? 'from-[#f5f4eb]' : 'from-gray-950'
  const thumb = light ? 'rgba(27,58,107,0.25)' : 'rgba(255,255,255,0.15)'

  return (
    <>
      <style>{`
        .transcript-scroll::-webkit-scrollbar { width: 3px; }
        .transcript-scroll::-webkit-scrollbar-track { background: transparent; }
        .transcript-scroll::-webkit-scrollbar-thumb {
          background: ${thumb};
          border-radius: 10px;
        }
        .transcript-scroll {
          scrollbar-width: thin;
          scrollbar-color: ${thumb} transparent;
        }
      `}</style>

      <div className="relative">
        <div
          className={`absolute top-0 left-0 right-0 h-10 bg-gradient-to-b ${fadeFrom} to-transparent z-10 pointer-events-none`}
        />

        <div
          ref={containerRef}
          className="transcript-scroll overflow-y-auto max-h-72 space-y-3 px-1 pt-6 pb-2"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`transcript-msg flex gap-3 ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                  msg.role === 'agent'
                    ? 'bg-[#1B3A6B] text-white overflow-hidden'
                    : light
                      ? 'bg-[#CC0000]/15 text-[#CC0000]'
                      : 'bg-white/10 text-white/60'
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

              <div
                className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'agent'
                    ? light
                      ? 'bg-white border border-gray-200/80 text-[#1B3A6B] rounded-tl-none shadow-sm'
                      : 'bg-white/8 border border-white/8 text-white/85 rounded-tl-none'
                    : light
                      ? 'bg-[#CC0000] text-white rounded-tr-none shadow-sm'
                      : 'bg-sf-red/80 text-white rounded-tr-none'
                }`}
                style={
                  msg.role === 'agent' && !light ? { background: 'rgba(255,255,255,0.07)' } : {}
                }
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div
          className={`absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t ${fadeFrom} to-transparent pointer-events-none`}
        />
      </div>
    </>
  )
}
