import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import VoiceOrb from '../components/VoiceOrb'
import TranscriptPanel from '../components/TranscriptPanel'
import { useElevenLabs } from '../hooks/useElevenLabs'

function toOrbState(sessionStatus, agentMode) {
  if (sessionStatus === 'idle' || sessionStatus === 'connecting') return 'idle'
  if (sessionStatus === 'ended') return 'idle'
  return agentMode
}

export default function AssessmentPage() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [agentMode, setAgentMode] = useState('idle')
  const [isComplete, setIsComplete] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  const handleMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg])
  }, [])

  const handleStatusChange = useCallback((status) => {
    if (status === 'listening') setAgentMode('listening')
    else if (status === 'speaking') setAgentMode('speaking')
    else if (status === 'thinking') setAgentMode('thinking')
    else if (status === 'active') setAgentMode('listening')
    else setAgentMode('idle')
  }, [])

  const handleComplete = useCallback(() => {
    setIsComplete(true)
    setAgentMode('idle')
  }, [])

  const { status, startSession, endSession } = useElevenLabs({
    onMessage: handleMessage,
    onStatusChange: handleStatusChange,
    onComplete: handleComplete,
  })

  const orbState = toOrbState(status, agentMode)

  async function handleStart() {
    setHasStarted(true)
    await startSession()
  }

  function handleViewResults() {
    navigate('/')
  }

  const statusLabel = {
    idle: hasStarted ? 'Session ended' : 'Ready to begin',
    connecting: 'Connecting to Agent Jake...',
    active: 'Session active',
    ended: 'Assessment complete',
  }[status] ?? ''

  return (
    <div className="min-h-screen bg-gray-950 font-body flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-between pt-20 pb-10 px-6">

        {/* ── TOP — Header & progress ── */}
        <div className="w-full max-w-2xl text-center pt-8">

          {/* Step pills */}
          <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
            {['Property Info', 'Safety & Systems', 'Lifestyle', 'Results'].map((step, i) => {
              const filled = isComplete ? true : status === 'active' && i === 0
              return (
                <div key={step} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${
                    filled
                      ? 'bg-sf-red/20 text-sf-red border border-sf-red/30'
                      : 'bg-white/5 text-white/30 border border-white/5'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${filled ? 'bg-sf-red' : 'bg-white/20'}`} />
                    {step}
                  </div>
                  {i < 3 && <div className="w-4 h-px bg-white/10" />}
                </div>
              )
            })}
          </div>

          {/* Pre-start heading */}
          {!hasStarted && (
            <div className="mb-6">
              <h1 className="font-display text-3xl font-bold text-white mb-3">
                Your Voice Assessment
              </h1>
              <p className="text-gray-400 text-base leading-relaxed max-w-md mx-auto">
                Agent Jake will guide you through a short conversation.
                Speak naturally — he'll ask about your home and analyze
                your risk in real time.
              </p>
            </div>
          )}

          {/* Live caption — last thing agent said */}
          {hasStarted && messages.length > 0 && !isComplete && (
            <div className="mb-4 min-h-12">
              {(() => {
                const lastAgent = [...messages].reverse().find(m => m.role === 'agent')
                return lastAgent ? (
                  <p className="text-white/70 text-sm leading-relaxed max-w-md mx-auto italic">
                    "{lastAgent.text}"
                  </p>
                ) : null
              })()}
            </div>
          )}
        </div>

        {/* ── CENTER — Orb & buttons ── */}
        <div className="flex flex-col items-center gap-6 my-4">
          <VoiceOrb state={orbState} />

          {/* Status */}
          <div className="text-center">
            <p className={`text-sm font-semibold tracking-wide transition-colors duration-300 ${
              status === 'active' ? 'text-white' : 'text-white/40'
            }`}>
              {statusLabel}
            </p>
            {status === 'connecting' && (
              <p className="text-xs text-white/30 mt-1">Requesting microphone access...</p>
            )}
          </div>

          {/* Start button */}
          {!hasStarted && (
            <button
              onClick={handleStart}
              className="mt-2 flex items-center gap-3 bg-sf-red hover:bg-sf-red-dark text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sf-red/30 text-base"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
              </svg>
              Start Voice Assessment
            </button>
          )}

          {/* End session button */}
          {status === 'active' && (
            <button
              onClick={endSession}
              className="mt-2 flex items-center gap-2 border border-white/20 text-white/60 hover:text-white hover:border-white/40 font-semibold px-6 py-2.5 rounded-xl transition-all duration-200 text-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z"/>
              </svg>
              End Assessment
            </button>
          )}

          {/* Complete state */}
          {isComplete && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-sf-green font-semibold text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Assessment Complete!
              </div>
              <button
                onClick={handleViewResults}
                className="bg-sf-red hover:bg-sf-red-dark text-white font-bold px-8 py-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sf-red/30"
              >
                View My Risk Score →
              </button>
            </div>
          )}
        </div>

        {/* ── BOTTOM — Transcript & info cards ── */}
        <div className="w-full max-w-xl">
          <TranscriptPanel messages={messages} />

          {hasStarted && (
            <p className="text-center text-xs text-white/20 mt-6">
              🔒 Your voice is not recorded or stored · Demo prototype for WeHack 2026
            </p>
          )}

          {!hasStarted && (
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm mx-auto text-center">
              {[
                { icon: '🎙️', label: 'Voice only', sub: 'No typing needed' },
                { icon: '⚡', label: '~3 minutes', sub: 'Quick assessment' },
                { icon: '🔒', label: 'Private', sub: 'Not stored' },
              ].map(({ icon, label, sub }) => (
                <div key={label} className="bg-white/5 rounded-xl p-3">
                  <div className="text-xl mb-1">{icon}</div>
                  <div className="text-white text-xs font-semibold">{label}</div>
                  <div className="text-white/30 text-xs">{sub}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}