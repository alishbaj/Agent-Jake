import { useState, useCallback, useRef, useMemo } from 'react'
import { useConversation } from '@elevenlabs/react'
import { sourceInfo } from '@elevenlabs/client/internal'
import { backendBaseUrl } from '../config/backendBase.js'
import { submitFromTranscript } from '../api/riskApi.js'

const ELEVENLABS_AGENT_ID =
  import.meta.env.VITE_ELEVENLABS_AGENT_ID ?? 'agent_8301knz2c6kaefdb9q8c41y7cc9e'

const CONNECTION_TYPE =
  import.meta.env.VITE_ELEVENLABS_CONNECTION === 'webrtc' ? 'webrtc' : 'websocket'

const WS_AUTHORIZATION = import.meta.env.VITE_ELEVENLABS_API_KEY

export function useElevenLabs({ onMessage, onStatusChange, onComplete, onStartFailed }) {
  const propertyDataRef = useRef(null)
  const transcriptRef = useRef([])
  const [status, setStatus] = useState('idle')
  const [connectionError, setConnectionError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [assessmentError, setAssessmentError] = useState(null)
  const wasConnectedRef = useRef(false)

  const clearConnectionError = useCallback(() => setConnectionError(null), [])

  const clientTools = useMemo(
    () => ({
      set_property_address: async ({ address }) => {
        const raw = String(address ?? '').trim()
        if (!raw) throw new Error('No address provided')
        const url = `${backendBaseUrl()}/location-data?address=${encodeURIComponent(raw)}`
        const res = await fetch(url)
        const text = await res.text()
        let json
        try {
          json = text ? JSON.parse(text) : null
        } catch {
          throw new Error('Invalid JSON from location-data')
        }
        if (!res.ok) {
          const detail = json?.detail != null ? String(json.detail) : `HTTP ${res.status}`
          throw new Error(detail)
        }
        propertyDataRef.current = json
        return 'success'
      },
      answer_property_question: async ({ category }) => {
        const data = propertyDataRef.current
        if (!data || typeof data !== 'object') return ''
        const cat = String(category ?? '').trim().toLowerCase()
        const pd = (data.property_details ?? {})
        const flood = (data.flood_zone ?? {})
        const fire = (data.fire_station ?? {})
        const wx = (data.weather_alerts ?? {})
        const census = (data.census ?? {})
        switch (cat) {
          case 'square_footage': {
            const v = pd.square_footage_living
            return v != null && v !== '' ? String(v) : ''
          }
          case 'flood': {
            const risk = flood.risk_level != null && flood.risk_level !== '' ? String(flood.risk_level) : ''
            const zone = flood.flood_zone != null && flood.flood_zone !== '' ? String(flood.flood_zone) : ''
            return [risk, zone].filter(Boolean).join(' ').trim()
          }
          case 'fire_station': {
            const n = fire.name != null ? String(fire.name) : ''
            const d = fire.distance != null ? String(fire.distance) : ''
            return [n, d].filter(Boolean).join(' ').trim()
          }
          case 'weather': {
            const v = wx.risk_level
            return v != null && v !== '' ? String(v) : ''
          }
          case 'year_built': {
            const v = pd.year_built
            return v != null && v !== '' ? String(v) : ''
          }
          case 'bedrooms': {
            const v = pd.bedrooms
            return v != null && v !== '' ? String(v) : ''
          }
          case 'bathrooms': {
            const v = pd.bathrooms_full
            return v != null && v !== '' ? String(v) : ''
          }
          case 'property_type': {
            const v = pd.property_type
            return v != null && v !== '' ? String(v) : ''
          }
          case 'neighborhood': {
            const v = census.median_year_built
            return v != null && v !== '' ? String(v) : ''
          }
          case 'address': {
            const v = data.formatted_address
            return v != null && v !== '' ? String(v) : ''
          }
          default:
            return ''
        }
      },
    }),
    []
  )

  const { startSession: connectSession, endSession: hangUp } = useConversation({
    clientTools,
    onConnect: () => {
      wasConnectedRef.current = true
      // Reset transcript on every new session
      transcriptRef.current = []
      setConnectionError(null)
      setAssessmentError(null)
      setStatus('active')
      onStatusChange?.('active')
    },
    onDisconnect: async () => {
      const hadSession = wasConnectedRef.current
      wasConnectedRef.current = false

      if (!hadSession) {
        setStatus('idle')
        onStatusChange?.('idle')
        onStartFailed?.()
        return
      }

      // Build transcript string from everything collected during conversation
      const transcript = transcriptRef.current
        .map(msg => `${msg.role === 'agent' ? 'Jake' : 'User'}: ${msg.text}`)
        .join('\n')

      if (!transcript.trim()) {
        // Nothing was said — end cleanly with no results
        setStatus('ended')
        onStatusChange?.('ended')
        onComplete?.(null)
        return
      }

      // Extract email from transcript if present
      const emailMatch = transcript.match(
        /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/
      )
      const email = emailMatch ? emailMatch[0] : ''

      // Show processing state while backend runs
      setStatus('processing')
      onStatusChange?.('processing')
      setIsProcessing(true)

      try {
        const results = await submitFromTranscript(transcript, email)
        setIsProcessing(false)
        setStatus('ended')
        onStatusChange?.('ended')
        // Pass real results to AssessmentPage — this is what unlocks the results button
        onComplete?.(results)
      } catch (err) {
        console.error('[ElevenLabs] Assessment failed:', err)
        setIsProcessing(false)
        setAssessmentError(err.message || 'Assessment failed')
        setStatus('ended')
        onStatusChange?.('ended')
        onComplete?.(null)
      }
    },
    onMessage: (payload) => {
      const msg = {
        role: payload.role === 'agent' ? 'agent' : 'user',
        text: payload.message,
      }
      // Accumulate into transcript ref AND forward to AssessmentPage for display
      transcriptRef.current.push(msg)
      onMessage?.(msg)
    },
    onError: (message) => {
      console.error('[ElevenLabs]', message)
      setConnectionError(typeof message === 'string' ? message : 'Connection error')
      const hadSession = wasConnectedRef.current
      wasConnectedRef.current = false
      if (!hadSession) {
        setStatus('idle')
        onStatusChange?.('idle')
        onStartFailed?.()
        return
      }
      setStatus('ended')
      onStatusChange?.('ended')
      onComplete?.(null)
    },
    onModeChange: ({ mode }) => {
      onStatusChange?.(mode === 'speaking' ? 'speaking' : 'listening')
    },
  })

  const fetchTokenViaDevProxy = useCallback(async () => {
    const { name, version } = sourceInfo
    const base = `${window.location.origin}/elevenlabs-api`
    const params = new URLSearchParams({
      agent_id: ELEVENLABS_AGENT_ID,
      source: name,
      version,
    })
    const res = await fetch(`${base}/v1/convai/conversation/token?${params}`)
    if (!res.ok) {
      const hint =
        res.status === 401
          ? ' Add ELEVENLABS_API_KEY to .env for this dev server (used only by the Vite proxy), or use connection type websocket.'
          : ''
      throw new Error(`Token request failed (${res.status}).${hint}`)
    }
    const data = await res.json()
    if (!data?.token) throw new Error('No conversation token from API')
    return data.token
  }, [])

  const startSession = useCallback(async () => {
    setConnectionError(null)
    setAssessmentError(null)
    setStatus('connecting')
    onStatusChange?.('connecting')
    try {
      if (CONNECTION_TYPE === 'webrtc' && import.meta.env.DEV) {
        const token = await fetchTokenViaDevProxy()
        connectSession({
          conversationToken: token,
          connectionType: 'webrtc',
        })
        return
      }
      const opts = {
        agentId: ELEVENLABS_AGENT_ID,
        connectionType: CONNECTION_TYPE,
      }
      if (WS_AUTHORIZATION) opts.authorization = WS_AUTHORIZATION
      connectSession(opts)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start session'
      console.error('[ElevenLabs]', e)
      setConnectionError(msg)
      setStatus('idle')
      onStatusChange?.('idle')
      onStartFailed?.()
    }
  }, [connectSession, fetchTokenViaDevProxy, onStartFailed, onStatusChange])

  const endSession = useCallback(() => {
    hangUp()
  }, [hangUp])

  return {
    status,
    startSession,
    endSession,
    connectionError,
    clearConnectionError,
    isProcessing,
    assessmentError,
  }
}