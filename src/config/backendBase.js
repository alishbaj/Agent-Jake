/**
 * FastAPI base URL in the browser.
 * Set VITE_BACKEND_URL in the project root .env (e.g. http://127.0.0.1:8000).
 * VITE_API_BASE is still accepted for backwards compatibility.
 */
export function backendBaseUrl() {
  return String(
    import.meta.env.VITE_BACKEND_URL ?? import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8000'
  ).replace(/\/$/, '')
}
