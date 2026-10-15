import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { PAGES } from '../../shared/site'
import { useAuth } from '../auth'
import { Logo, Spinner } from '../Logo'
import { useSeo } from '../seo'
import { HAS_SITE, SITE_URL } from '../mode'

export default function Login() {
  const page = PAGES['/login']
  useSeo({ title: page.title, description: page.description, path: '/login', index: false })
  const auth = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const from = (loc.state as { from?: string } | null)?.from || '/dashboard'
  const [email, setEmail] = useState(auth.health?.demo ? 'admin@winnerapparels.com' : '')
  const [password, setPassword] = useState(auth.health?.demo ? 'Winner@2026' : '')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (auth.health?.demo) { setEmail((e) => e || 'admin@winnerapparels.com'); setPassword((p) => p || 'Winner@2026') } }, [auth.health])

  if (auth.status === 'authed' || auth.status === 'offline') return <Navigate to={from} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try { await auth.login(email, password); nav(from, { replace: true }) }
    catch (err) { setError(err instanceof Error ? err.message : 'Sign in failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-ink-900 via-brand-900 to-[#16275f] px-4 py-12">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-gold-500/20 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-brand-500/30 blur-3xl" aria-hidden="true" />
      <main className="glass-card relative w-full max-w-md rounded-3xl p-8 text-white">
        {HAS_SITE ? <Link to="/" aria-label="Back to the Winner Apparels website" className="inline-block"><Logo light size={42} /></Link> : <Logo light size={42} />}
        <h1 className="mt-8 font-display text-3xl font-bold">{page.h1}</h1>
        <p className="mt-2 text-sm text-slate-300">Business management for the Winner Apparels team.</p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <div><label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-200">Email</label><input id="email" type="email" required autoComplete="username" className="glass-input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-200">Password</label>
            <div className="relative"><input id="password" type={show ? 'text' : 'password'} required autoComplete="current-password" className="glass-input pr-11" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          {error && <p role="alert" className="rounded-md bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}
          <button type="submit" disabled={busy || auth.status === 'checking'} className="btn-primary btn-lg w-full">{busy ? <><Spinner size={18} />Signing in...</> : <><Lock size={16} />Sign in</>}</button>
        </form>
        {auth.health?.demo && <p className="mt-6 rounded-lg bg-white/10 p-3 text-xs text-slate-300">Demo database: the sign-in details are filled in for you.</p>}
        {HAS_SITE ? <p className="mt-6 text-center text-sm"><Link to="/" className="text-slate-300 hover:text-white">Back to website</Link></p> : SITE_URL ? <p className="mt-6 text-center text-sm"><a href={SITE_URL} className="text-slate-300 hover:text-white">Back to website</a></p> : null}
      </main>
    </div>
  )
}
