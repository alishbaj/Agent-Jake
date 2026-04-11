import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const LocationSessionContext = createContext(null)

export function LocationSessionProvider({ children }) {
  const [locationPayload, setLocationPayload] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(false)

  const clearLocation = useCallback(() => {
    setLocationPayload(null)
    setLoadError(null)
    setLoading(false)
  }, [])

  const value = useMemo(
    () => ({
      locationPayload,
      setLocationPayload,
      loadError,
      setLoadError,
      loading,
      setLoading,
      clearLocation,
    }),
    [locationPayload, loadError, loading, clearLocation]
  )

  return <LocationSessionContext.Provider value={value}>{children}</LocationSessionContext.Provider>
}

export function useLocationSession() {
  const ctx = useContext(LocationSessionContext)
  if (!ctx) throw new Error('useLocationSession must be used within LocationSessionProvider')
  return ctx
}
