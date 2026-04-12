import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import VoiceOrb from '../components/VoiceOrb'
import TranscriptPanel from '../components/TranscriptPanel'
import { useElevenLabs } from '../hooks/useElevenLabs'
import { submitAssessment } from '../api/riskApi'

const USER_WANTS_TO_STOP =
  /\b(stop|quit|cancel|end(\s+the)?\s+assessment|i\s*'?m\s+done|no\s+more\s+questions|that'?s\s+enough)\b/i

// All 11 questions in order — matches the intake fields exactly
const CHAT_QUESTIONS = [
  {
    field: 'address',
    question: "Hi! I'm Agent Jake, your AI home insurance advisor. Let's get started. What is the full address of the property you'd like to assess? Please include street, city, and state.",
    placeholder: 'e.g. 123 Main St, Dallas, TX 75201',
  },
  {
    field: 'year_built',
    question: "What year was the home built? Even a rough estimate like the 1990s is fine.",
    placeholder: 'e.g. 1998',
  },
  {
    field: 'construction_type',
    question: "What type of construction is the home? Choose one: Wood frame, Brick or masonry, Concrete block, or Unknown.",
    placeholder: 'e.g. Wood frame',
  },
  {
    field: 'roof_type',
    question: "What type of roof does the home have? Options: Asphalt shingle, Metal, Tile or clay, Flat, Wood shake, or Unknown.",
    placeholder: 'e.g. Asphalt shingle',
  },
  {
    field: 'roof_age_range',
    question: "How old is the current roof? Options: Under 5 years, 5-10 years, 10-15 years, 15-20 years, Over 20 years, or Unknown.",
    placeholder: 'e.g. 10-15 years',
  },
  {
    field: 'has_security_system',
    question: "Does the home have a monitored security system? Answer: Yes, No, or Unmonitored alarm only.",
    placeholder: 'e.g. Yes',
  },
  {
    field: 'smoke_detectors',
    question: "Are smoke detectors installed on every floor? Options: Yes every floor, Some floors only, No, or Not sure.",
    placeholder: 'e.g. Yes every floor',
  },
  {
    field: 'flood_storm_mitigation',
    question: "Does the home have a sump pump or storm shutters? Options: Sump pump only, Storm shutters only, Both, Neither, or Not applicable.",
    placeholder: 'e.g. Neither',
  },
  {
    field: 'prior_claims_count',
    question: "Have any insurance claims been filed on this property in the last 3 years? Options: None, 1 claim, 2 claims, or 3 or more.",
    placeholder: 'e.g. None',
  },
  {
    field: 'credit_tier',
    question: "Last question — how would you describe your credit history? Options: Excellent, Good, Fair, Poor, or Prefer not to say. This is completely self-reported and never verified.",
    placeholder: 'e.g. Good',
  },
  {
    field: 'email',
    question: "Almost done! What's your email address? We'll use it to save your results so you can return to your dashboard later.",
    placeholder: 'e.g. you@example.com',
  },
]

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
  const [assessmentResult, setAssessmentResult] = useState(null)

  // Chat quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [chatAnswers, setChatAnswers] = useState({})
  const [isChatSubmitting, setIsChatSubmitting] = useState(false)
  const [chatError, setChatError] = useState(null)

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

  const handleComplete = useCallback((results) => {
    setIsComplete(true)
    setAgentMode('idle')
    if (results) setAssessmentResult(results)
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

  const { status, startSession, endSession, isProcessing, assessmentError } = useElevenLabs({
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
    setCurrentQuestionIndex(0)
    setChatAnswers({})
    // Show the first question as the opening agent message
    setMessages([{
      role: 'agent',
      text: CHAT_QUESTIONS[0].question,
    }])
  }

  async function handleSendChat(e) {
    e.preventDefault()
    const answer = chatInput.trim()
    if (!answer || isChatSubmitting) return

    // Add user message to transcript
    const userMsg = { role: 'user', text: answer }
    setMessages((prev) => [...prev, userMsg])
    setChatInput('')

    if (USER_WANTS_TO_STOP.test(answer)) {
      setIsComplete(true)
      setAgentMode('idle')
      setChatMode(false)
      return
    }

    // Save the answer for the current question
    const currentQ = CHAT_QUESTIONS[currentQuestionIndex]
    const updatedAnswers = { ...chatAnswers, [currentQ.field]: answer }
    setChatAnswers(updatedAnswers)

    const nextIndex = currentQuestionIndex + 1

    if (nextIndex < CHAT_QUESTIONS.length) {
      // More questions — show next one
      setCurrentQuestionIndex(nextIndex)
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          role: 'agent',
          text: CHAT_QUESTIONS[nextIndex].question,
        }])
      }, 400)
    } else {
      // All questions answered — submit to backend
      setIsChatSubmitting(true)
      setChatError(null)
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          role: 'agent',
          text: "Perfect — thank you! I'm calculating your personalized risk score now. This will just take a moment...",
        }])
      }, 400)

      try {
        // Parse year_built as integer if provided
        const yearBuilt = updatedAnswers.year_built
          ? parseInt(updatedAnswers.year_built, 10) || null
          : null

        const payload = {
          address: updatedAnswers.address || '',
          year_built: yearBuilt,
          construction_type: updatedAnswers.construction_type || '',
          roof_type: updatedAnswers.roof_type || '',
          roof_age_range: updatedAnswers.roof_age_range || '',
          square_footage_range: '',
          has_security_system: updatedAnswers.has_security_system || 'No',
          smoke_detectors: updatedAnswers.smoke_detectors || 'Not sure',
          has_water_sensors: 'Not sure',
          has_fire_extinguisher: 'Not sure',
          flood_storm_mitigation: updatedAnswers.flood_storm_mitigation || 'Neither',
          prior_claims_count: updatedAnswers.prior_claims_count || 'None',
          prior_claims_type: 'N/A',
          credit_tier: updatedAnswers.credit_tier || 'Prefer not to say',
          email: updatedAnswers.email || '',
        }

        const results = await submitAssessment(payload)
        setAssessmentResult(results)
        setIsComplete(true)
        setIsChatSubmitting(false)
      } catch (err) {
        console.error('Chat assessment failed:', err)
        setChatError(err.message || 'Something went wrong. Please try again.')
        setIsChatSubmitting(false)
      }
    }
  }

  function handleViewResults() {
    navigate('/results', { state: { result: assessmentResult } })
  }

  const currentPlaceholder = chatMode && currentQuestionIndex < CHAT_QUESTIONS.length
    ? CHAT_QUESTIONS[currentQuestionIndex].placeholder
    : 'Type your answer...'

  const allQuestionsAnswered = currentQuestionIndex >= CHAT_QUESTIONS.length

  return (
    <div className="min-h-screen bg-[#1B3A6B] font-body flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16 pb-8 px-4 sm:px-6 flex flex-col">
        <div className="w-full max-w-[680px] mx-auto flex-1 rounded-3xl bg-[#f5f4eb] shadow-2xl border border-white/30 flex flex-col min-h-0 cream-card-enter">
          <div className="flex flex-col items-center flex-1 p-10 overflow-y-auto">
            <div className={`flex flex-col items-center transition-all duration-700 ease-out ${hasStarted ? 'mt-1' : 'mt-4'}`}>
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
                    or click here to begin a chat instead
                  </button>
                </div>
              )}

              {hasStarted && !isComplete && !chatMode && (
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

              {/* Voice processing spinner */}
              {isProcessing && (
                <div className="flex flex-col items-center gap-2 mt-5">
                  <div className="w-5 h-5 border-2 border-[#CC0000] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[#1B3A6B]/70 font-medium">Generating your risk score...</p>
                </div>
              )}

              {/* Chat submitting spinner */}
              {isChatSubmitting && (
                <div className="flex flex-col items-center gap-2 mt-5">
                  <div className="w-5 h-5 border-2 border-[#CC0000] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[#1B3A6B]/70 font-medium">Analyzing your property...</p>
                </div>
              )}

              {/* Error state */}
              {(assessmentError || chatError) && (
                <div className="mt-4 text-sm text-red-600 text-center max-w-xs">
                  {assessmentError || chatError}
                </div>
              )}

              {/* Progress indicator for chat */}
              {chatMode && !isComplete && !isChatSubmitting && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs text-[#1B3A6B]/50 font-medium">
                    Question {Math.min(currentQuestionIndex + 1, CHAT_QUESTIONS.length)} of {CHAT_QUESTIONS.length}
                  </span>
                  <div className="w-24 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#CC0000] rounded-full transition-all duration-300"
                      style={{ width: `${((currentQuestionIndex) / CHAT_QUESTIONS.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Complete state */}
              {isComplete && !isProcessing && !isChatSubmitting && (
                <div className="flex flex-col items-center gap-3 mt-5">
                  <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Assessment Complete!
                  </div>
                  {assessmentResult ? (
                    <button
                      type="button"
                      onClick={handleViewResults}
                      className="btn-press bg-[#CC0000] hover:bg-sf-red-dark text-white font-bold px-8 py-3.5 rounded-xl shadow-md hover:shadow-lg border border-[#a30000]/30"
                    >
                      View My Risk Score →
                    </button>
                  ) : (
                    <p className="text-sm text-[#1B3A6B]/60 text-center max-w-xs">
                      Results could not be generated. Please retake the assessment.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Transcript */}
            {hasStarted && (
              <div className="w-full mt-6">
                <TranscriptPanel messages={messages} variant="light" />
              </div>
            )}

            {/* Chat input — only show if chat mode, not complete, not submitting */}
            {chatMode && !isComplete && !isChatSubmitting && (
              <form onSubmit={handleSendChat} className="w-full mt-4 flex gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={currentPlaceholder}
                  autoFocus
                  className="flex-1 bg-white border border-[#1B3A6B]/15 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/20 focus:border-[#1B3A6B]/35 transition-shadow duration-300"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="btn-press bg-[#CC0000] hover:bg-sf-red-dark text-white font-bold px-5 py-3 rounded-xl text-sm shrink-0 shadow-md border border-[#a30000]/30 disabled:opacity-50 disabled:cursor-not-allowed"
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