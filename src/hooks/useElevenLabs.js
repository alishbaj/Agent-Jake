import { useState, useCallback, useRef, useMemo } from 'react'
import { useConversation } from '@elevenlabs/react'
import { sourceInfo } from '@elevenlabs/client/internal'
import { backendBaseUrl } from '../config/backendBase.js'

/** Override with VITE_ELEVENLABS_AGENT_ID in .env */
const ELEVENLABS_AGENT_ID =
  import.meta.env.VITE_ELEVENLABS_AGENT_ID ?? 'agent_8301knz2c6kaefdb9q8c41y7cc9e'

/**
 * websocket — connects directly (works for typical public agents).
 * webrtc — lower latency; in dev, token is fetched via /elevenlabs-api proxy so ELEVENLABS_API_KEY applies.
 * In production, use a backend token endpoint or keep websocket unless the agent allows unauthenticated token fetch.
 */
const CONNECTION_TYPE =
  import.meta.env.VITE_ELEVENLABS_CONNECTION === 'webrtc' ? 'webrtc' : 'websocket'

/** Optional: only for WebSocket auth (subprotocol). Prefer server-side secrets in production. */
const WS_AUTHORIZATION = import.meta.env.VITE_ELEVENLABS_API_KEY

export function useElevenLabs({ onMessage, onStatusChange, onComplete, onStartFailed }) {
  const propertyDataRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [connectionError, setConnectionError] = useState(null)
  const wasConnectedRef = useRef(false)

  const clearConnectionError = useCallback(() => setConnectionError(null), [])

  /** SDK routes agent client tools through `clientTools` (no separate onToolCall in CALLBACK_KEYS). */
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
        const pd = /** @type {Record<string, unknown>} */ (data.property_details ?? {})
        const flood = /** @type {Record<string, unknown>} */ (data.flood_zone ?? {})
        const fire = /** @type {Record<string, unknown>} */ (data.fire_station ?? {})
        const wx = /** @type {Record<string, unknown>} */ (data.weather_alerts ?? {})
        const census = /** @type {Record<string, unknown>} */ (data.census ?? {})

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
      setConnectionError(null)
      setStatus('active')
      onStatusChange?.('active')
    },
    onDisconnect: () => {
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
      onComplete?.()
    },
    onMessage: (payload) => {
      onMessage?.({
        role: payload.role === 'agent' ? 'agent' : 'user',
        text: payload.message,
      })
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
      onComplete?.()
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

  return { status, startSession, endSession, connectionError, clearConnectionError }
}