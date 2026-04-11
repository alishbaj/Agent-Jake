// ─────────────────────────────────────────────────────────────────────────────
// useElevenLabs.js
//
// HOW TO INTEGRATE YOUR REAL ELEVENLABS AGENT:
// 1. Run: npm install @11labs/react
// 2. Replace YOUR_AGENT_ID_HERE with your actual agent ID
// 3. Uncomment the REAL INTEGRATION block below
// 4. Delete the STUB simulation block
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react'

const ELEVENLABS_AGENT_ID = 'YOUR_AGENT_ID_HERE'

export function useElevenLabs({ onMessage, onStatusChange, onComplete }) {
  const [status, setStatus] = useState('idle')
  const sessionRef = useRef(null)

  const updateStatus = useCallback((s) => {
    setStatus(s)
    onStatusChange?.(s)
  }, [onStatusChange])

  // ── START SESSION ──────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    updateStatus('connecting')

    // ── STUB — remove this when you plug in real ElevenLabs ───────────────
    if (ELEVENLABS_AGENT_ID === 'YOUR_AGENT_ID_HERE') {
      console.log('[ElevenLabs] STUB mode — replace ELEVENLABS_AGENT_ID to use real agent')
      await simulateConversation({ onMessage, updateStatus, onComplete })
      return
    }
    // ── END STUB ────────────────────────────────────────────────────────────

    // ── REAL ELEVENLABS INTEGRATION ─────────────────────────────────────────
    // Uncomment this block when you have your agent ID ready:
    //
    // import { Conversation } from '@11labs/react'
    //
    // const conversation = await Conversation.startSession({
    //   agentId: ELEVENLABS_AGENT_ID,
    //   onMessage: ({ message, source }) => {
    //     onMessage?.({
    //       role: source === 'ai' ? 'agent' : 'user',
    //       text: message,
    //     })
    //   },
    //   onModeChange: ({ mode }) => {
    //     if (mode.mode === 'listening') updateStatus('listening')
    //     if (mode.mode === 'speaking')  updateStatus('speaking')
    //   },
    //   onDisconnect: () => {
    //     updateStatus('ended')
    //     onComplete?.()
    //   },
    // })
    //
    // sessionRef.current = conversation
    // updateStatus('active')
    // ── END REAL INTEGRATION ────────────────────────────────────────────────

  }, [onMessage, updateStatus, onComplete])

  // ── END SESSION ────────────────────────────────────────────────────────────
  const endSession = useCallback(async () => {
    if (sessionRef.current) {
      await sessionRef.current.endSession()
      sessionRef.current = null
    }
    updateStatus('ended')
    onComplete?.()
  }, [updateStatus, onComplete])

  return { status, startSession, endSession }
}

// ─────────────────────────────────────────────────────────────────────────────
// STUB: Simulates the full Agent Jake conversation for UI testing
// Delete this entire function when switching to real ElevenLabs
// ─────────────────────────────────────────────────────────────────────────────
async function simulateConversation({ onMessage, updateStatus, onComplete }) {
  const script = [
    {
      role: 'agent',
      text: "Hi! I'm Agent Jake, your AI home insurance advisor. I'll ask you a few quick questions about your property to calculate your personalized risk score. What's your home address and ZIP code?",
      state: 'speaking',
      pause: 4000,
    },
    {
      role: 'user',
      text: '456 Oak Avenue, ZIP 75080',
      state: 'listening',
      pause: 2000,
    },
    {
      role: 'agent',
      text: "Got it — I'm looking up flood zone data and fire station proximity for that address now. What year was your home built, and what type of roof do you have?",
      state: 'speaking',
      pause: 4000,
    },
    {
      role: 'user',
      text: 'Built in 1987, asphalt shingle roof replaced in 2009.',
      state: 'listening',
      pause: 2000,
    },
    {
      role: 'agent',
      text: 'Thanks. Has your electrical system been updated in the last 20 years, and do you know what type of pipes your home has?',
      state: 'speaking',
      pause: 3500,
    },
    {
      role: 'user',
      text: "No, the electrical hasn't been updated. And I think we have galvanized steel pipes.",
      state: 'listening',
      pause: 2000,
    },
    {
      role: 'agent',
      text: "I see — those are important factors. Do you have a security system? And are there any swimming pools or trampolines on the property?",
      state: 'speaking',
      pause: 3500,
    },
    {
      role: 'user',
      text: 'No security system. No pool or trampoline.',
      state: 'listening',
      pause: 2000,
    },
    {
      role: 'agent',
      text: 'Last question — any insurance claims in the last 5 years?',
      state: 'speaking',
      pause: 2500,
    },
    {
      role: 'user',
      text: 'None.',
      state: 'listening',
      pause: 1500,
    },
    {
      role: 'agent',
      text: "Perfect. I have everything I need. Let me calculate your risk score now — analyzing your flood zone, fire station distance, weather alerts, and all your property details.",
      state: 'thinking',
      pause: 3000,
    },
  ]

  updateStatus('active')

  for (const line of script) {
    updateStatus(line.state)
    onMessage?.({ role: line.role, text: line.text })
    await sleep(line.pause)
  }

  updateStatus('ended')
  onComplete?.()
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}