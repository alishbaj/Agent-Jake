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
  const [chatMode, setChatMode] = useState(false)
  const [chatInput, setChatInput] = useState('')

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

  function handleStartChat() {
    setChatMode(true)
    setHasStarted(true)
    setMessages([{
      role: 'agent',
      text: "Hi! I'm Agent Jake, your AI home insurance advisor. Let's start with your home address and ZIP code — what are they?",
    }])
  }

  function handleSendChat(e) {
    e.preventDefault()
    if (!chatInput.trim()) return
    const userMsg = { role: 'user', text: chatInput.trim() }
    setMessages((prev) => [...prev, userMsg])
    setChatInput('')

    // Simulate agent response — replace with real API call when ready
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        role: 'agent',
        text: "Got it, thank you. What year was your home built and what type of roof do you have?",
      }])
    }, 1200)
  }

  function handleViewResults() {
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-950 font-body flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col items-center pt-20 pb-10 px-6">

        {/* ── ORB — shifts up after start ── */}
        <div
          className={`flex flex-col items-center transition-all duration-700 ${
            hasStarted ? 'mt-4' : 'mt-16'
          }`}
        >
          <VoiceOrb state={orbState} started={hasStarted} />

          {/* Status text */}
          {!hasStarted && (
            <p className="text-white/40 text-sm font-semibold tracking-wide mt-4">
              Ready to begin
            </p>
          )}

          {/* Buttons — only before start */}
          {!hasStarted && (
            <div className="flex flex-col items-center gap-3 mt-6">
              <button
                onClick={handleStart}
                className="flex items-center gap-3 bg-sf-red hover:bg-sf-red-dark text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sf-red/30 text-base"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
                Start Voice Assessment
              </button>

              <button
                onClick={handleStartChat}
                className="text-white/40 hover:text-white/70 text-sm underline underline-offset-4 transition-colors duration-200"
              >
                or click here to begin a chat
              </button>
            </div>
          )}

          {/* End session button */}
          {status === 'active' && !chatMode && (
            <button
              onClick={endSession}
              className="mt-4 flex items-center gap-2 border border-white/20 text-white/50 hover:text-white hover:border-white/40 font-semibold px-5 py-2 rounded-xl transition-all duration-200 text-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z"/>
              </svg>
              End Assessment
            </button>
          )}

          {/* Complete */}
          {isComplete && (
            <div className="flex flex-col items-center gap-3 mt-4">
              <div className="flex items-center gap-2 text-green-500 font-semibold text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Assessment Complete!
              </div>
              <button
                onClick={handleViewResults}
                className="bg-sf-red hover:bg-sf-red-dark text-white font-bold px-8 py-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
              >
                View My Risk Score →
              </button>
            </div>
          )}
        </div>

        {/* ── TRANSCRIPT ── */}
        {hasStarted && (
          <div className="w-full max-w-xl mt-6">
            <TranscriptPanel messages={messages} />
          </div>
        )}

        {/* ── CHAT INPUT — only in chat mode ── */}
        {chatMode && !isComplete && (
          <form
            onSubmit={handleSendChat}
            className="w-full max-w-xl mt-4 flex gap-3"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type your answer..."
              className="flex-1 bg-white/8 border border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            />
            <button
              type="submit"
              className="bg-sf-red hover:bg-sf-red-dark text-white font-bold px-5 py-3 rounded-xl transition-colors text-sm"
            >
              Send
            </button>
          </form>
        )}

        {/* Privacy note */}
        {hasStarted && (
          <p className="text-center text-xs text-white/15 mt-6">
            🔒 Your data is not stored · WeHack 2026 prototype
          </p>
        )}

      </main>
    </div>
  )
}