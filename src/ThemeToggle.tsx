import { Moon, Sun } from 'lucide-react'
import { useDarkMode } from './appearance'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useDarkMode()
  return (
    <button onClick={() => setDark(!dark)} className={`relative h-8 w-14 shrink-0 rounded-full border border-slate-300/60 bg-slate-100 transition-colors dark:border-white/10 ${className}`} title={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={dark}>
      <span className={`absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full shadow transition-all duration-300 ${dark ? 'left-[30px] bg-gold-500 text-brand-900' : 'left-0.5 bg-white text-gold-600'}`}>{dark ? <Moon size={14} /> : <Sun size={14} />}</span>
    </button>
  )
}
