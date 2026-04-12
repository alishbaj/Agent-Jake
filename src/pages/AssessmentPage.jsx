import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import VoiceOrb from '../components/VoiceOrb'
import TranscriptPanel from '../components/TranscriptPanel'
import { useElevenLabs } from '../hooks/useElevenLabs'
import { MOCK_RESULT } from './ResultsPage'

/** User asked to stop / end — voice transcripts or chat text */
const USER_WANTS_TO_STOP =
  /\b(stop|quit|cancel|end(\s+the)?\s+assessment|i\s*'?m\s+done|no\s+more\s+questions|that'?s\s+enough)\b/i

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

  const chatModeRef = useRef(false)
  const sessionStatusRef = useRef('idle')
  const endSessionRef = useRef(() => {})

  const handleStatusChange = useCallback((s) => {
    if (s === 'listening') setAgentMode('listening')
    else if (s === 'speaking') setAgentMode('speaking')
    else if (s === 'thinking') setAgentMode('thinking')
    else if (s === 'active') setAgentMode('listening')
    else setAgentMode('idle')
  }, [])

  const handleComplete = useCallback(() => {
    setIsComplete(true)
    setAgentMode('idle')
  }, [])

  const handleMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg])
    if (msg.role !== 'user' || typeof msg.text !== 'string') return
    if (!USER_WANTS_TO_STOP.test(msg.text)) return
    if (!chatModeRef.current && sessionStatusRef.current === 'active') {
      endSessionRef.current()
    } else if (chatModeRef.current) {
      setIsComplete(true)
      setAgentMode('idle')
      setChatMode(false)
    }
  }, [])

  const { status, startSession, endSession } = useElevenLabs({
    onMessage: handleMessage,
    onStatusChange: handleStatusChange,
    onComplete: handleComplete,
  })

  chatModeRef.current = chatMode
  sessionStatusRef.current = status
  endSessionRef.current = endSession

  const finishAssessment = useCallback(() => {
    if (!chatMode && status === 'active') {
      endSession()
      return
    }
    setIsComplete(true)
    setAgentMode('idle')
    setChatMode(false)
  }, [chatMode, status, endSession])

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

    if (USER_WANTS_TO_STOP.test(userMsg.text)) {
      setIsComplete(true)
      setAgentMode('idle')
      setChatMode(false)
      return
    }

    // Simulate agent response — replace with real API call when ready
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        role: 'agent',
        text: "Got it, thank you. What year was your home built and what type of roof do you have?",
      }])
    }, 1200)
  }

  function handleViewResults() {
    navigate('/results', { state: { result: MOCK_RESULT } })
  }

  return (
    <div className="min-h-screen bg-[#1B3A6B] font-body flex flex-col">
      <Navbar />

      <main className="flex-1 pt-16 pb-8 px-4 sm:px-6 flex flex-col">
        <div className="w-full max-w-[680px] mx-auto flex-1 rounded-3xl bg-[#f5f4eb] shadow-2xl border border-white/30 flex flex-col min-h-0 cream-card-enter">
          <div className="flex flex-col items-center flex-1 p-10 overflow-y-auto">
            {/* ── ORB — shifts up after start ── */}
            <div
              className={`flex flex-col items-center transition-all duration-700 ease-out ${
                hasStarted ? 'mt-1' : 'mt-4'
              }`}
            >
              <VoiceOrb state={orbState} started={hasStarted} lightSurround />

              {!hasStarted && (
                <p className="text-[#1B3A6B]/60 text-sm font-semibold tracking-wide mt-4">
                  Ready to begin
                </p>
              )}

              {!hasStarted && (
                <div className="flex flex-col items-center gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleStart}
                    className="btn-press flex items-center gap-3 bg-[#CC0000] hover:bg-sf-red-dark text-white font-bold px-8 py-4 rounded-xl shadow-md hover:shadow-lg border border-[#a30000]/30 text-base"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                    </svg>
                    Start Voice Assessment
                  </button>

                  <button
                    type="button"
                    onClick={handleStartChat}
                    className="text-[#1B3A6B]/55 hover:text-[#1B3A6B] text-sm underline underline-offset-4 transition-colors duration-300"
                  >
                    or click here to begin a chat
                  </button>
                </div>
              )}

              {hasStarted && !isComplete && (
                <button
                  type="button"
                  onClick={finishAssessment}
                  className="btn-press mt-5 flex items-center gap-2 border border-[#1B3A6B]/20 text-[#1B3A6B]/80 hover:text-[#1B3A6B] hover:border-[#1B3A6B]/35 bg-white/70 font-semibold px-5 py-2 rounded-xl text-sm shadow-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h12v12H6z" />
                  </svg>
                  End Assessment
                </button>
              )}

              {isComplete && (
                <div className="flex flex-col items-center gap-3 mt-5">
                  <div className="flex items-center gap-2 text-sf-green font-semibold text-sm drop-shadow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Assessment Complete!
                  </div>
                  <button
                    type="button"
                    onClick={handleViewResults}
                    className="btn-press bg-[#CC0000] hover:bg-sf-red-dark text-white font-bold px-8 py-3.5 rounded-xl shadow-md hover:shadow-lg border border-[#a30000]/30"
                  >
                    View My Risk Score →
                  </button>
                </div>
              )}
            </div>

            {hasStarted && (
              <div className="w-full mt-6">
                <TranscriptPanel messages={messages} variant="light" />
              </div>
            )}

            {chatMode && !isComplete && (
              <form
                onSubmit={handleSendChat}
                className="w-full mt-4 flex gap-3 transition-all duration-300"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type your answer..."
                  className="flex-1 bg-white border border-[#1B3A6B]/15 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20 focus:border-[#1B3A6B]/35 transition-shadow duration-300"
                />
                <button
                  type="submit"
                  className="btn-press bg-[#CC0000] hover:bg-sf-red-dark text-white font-bold px-5 py-3 rounded-xl text-sm shrink-0 shadow-md border border-[#a30000]/30"
                >
                  Send
                </button>
              </form>
            )}

            {hasStarted && (
              <p className="text-center text-xs text-gray-400 mt-6">
                Your data is not stored · WeHack 2026 prototype
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}