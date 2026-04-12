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

/**
 * @param {string} address
 * @returns {Promise<Record<string, unknown>>}
 */
export async function getLocationData(address) {
  const trimmed = String(address).trim()
  if (!trimmed) throw new Error('Address is empty.')

  const url = `${apiBase()}/location-data?address=${encodeURIComponent(trimmed)}`
  const res = await fetch(url)
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
