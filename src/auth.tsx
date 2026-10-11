import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { API_ENABLED, ApiError, api, getToken, setToken, type Health, type Me } from './api'

type Status = 'checking' | 'authed' | 'anon' | 'offline'
interface AuthValue {
  status: Status
  user: Me | null
  health: Health | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}
const Ctx = createContext<AuthValue>(null as unknown as AuthValue)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(API_ENABLED ? 'checking' : 'offline')
  const [user, setUser] = useState<Me | null>(null)
  const [health, setHealth] = useState<Health | null>(null)

  useEffect(() => {
    if (!API_ENABLED) return
    let alive = true
    ;(async () => {
      try {
        const h = await api.health()
        if (!alive) return
        setHealth(h)
        if (!getToken()) { setStatus('anon'); return }
        try { const me = await api.me(); if (alive) { setUser(me); setStatus('authed') } } catch (e) { setToken(null); if (alive) setStatus('anon'); void e }
      } catch {
        if (alive) setStatus('offline') // no API reachable: run the built-in demo data set
      }
    })()
    return () => { alive = false }
  }, [])

  const logout = useCallback(() => { setToken(null); setUser(null); setStatus('anon') }, [])
  useEffect(() => { const h = () => logout(); window.addEventListener('wa:unauthorized', h); return () => window.removeEventListener('wa:unauthorized', h) }, [logout])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const r = await api.login(email, password)
      setToken(r.token); setUser(r.user); setStatus('authed')
    } catch (e) {
      throw e instanceof ApiError ? e : new Error('Could not reach the server')
    }
  }, [])

  const value = useMemo(() => ({ status, user, health, login, logout }), [status, user, health, login, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useAuth = () => useContext(Ctx)
