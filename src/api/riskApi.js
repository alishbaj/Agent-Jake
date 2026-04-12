import { backendBaseUrl } from '../config/backendBase.js'

function apiBase() {
  return backendBaseUrl()
}

function formatDetail(body) {
  if (!body || typeof body !== 'object') return 'Request failed'
  const d = body.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((e) => (typeof e?.msg === 'string' ? e.msg : JSON.stringify(e))).join('; ')
  if (d != null) return typeof d === 'object' ? JSON.stringify(d) : String(d)
  return 'Request failed'
}

async function parseResponse(res) {
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { detail: text || 'Invalid JSON' }
  }
  if (!res.ok) throw new Error(formatDetail(body) || `HTTP ${res.status}`)
  return body
}

/**
 * @param {string} address
 * @returns {Promise<Record<string, unknown>>}
 */
export async function getLocationData(address) {
  const trimmed = String(address).trim()
  if (!trimmed) throw new Error('Address is empty.')
  const res = await fetch(`${apiBase()}/location-data?address=${encodeURIComponent(trimmed)}`)
  return parseResponse(res)
}

/**
 * Used when Jake finishes — sends raw ElevenLabs transcript to backend.
 * Gemini extracts answers, runs scoring, returns full dashboard data.
 * @param {string} transcript
 * @param {string} email
 * @returns {Promise<Record<string, unknown>>}
 */
export async function submitFromTranscript(transcript, email = '') {
  const res = await fetch(`${apiBase()}/api/assess-from-transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, email })
  })
  return parseResponse(res)
}

/**
 * Used when manual quiz form is submitted directly.
 * @param {Record<string, unknown>} answers
 * @returns {Promise<Record<string, unknown>>}
 */
export async function submitAssessment(answers) {
  const res = await fetch(`${apiBase()}/api/assess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(answers)
  })
  return parseResponse(res)
}

/**
 * Used when user marks a recommendation goal as complete.
 * @param {string} action
 * @param {number} oldScore
 * @param {number} newScore
 * @returns {Promise<{ message: string }>}
 */
export async function completeGoal(action, oldScore, newScore) {
  const res = await fetch(`${apiBase()}/api/goal-complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, old_score: oldScore, new_score: newScore })
  })
  return parseResponse(res)
}