import { useEffect, useState } from 'react'

export type BtnStyle = 'clay' | 'glass' | 'fabric' | 'classic'
export const BTN_STYLES: { id: BtnStyle; label: string; hint: string }[] = [
  { id: 'clay', label: 'Clay', hint: 'Soft, raised 3D buttons' },
  { id: 'glass', label: 'Glass', hint: 'Frosted, translucent buttons' },
  { id: 'fabric', label: 'Fabric', hint: 'Woven texture with stitched edges' },
  { id: 'classic', label: 'Classic', hint: 'Flat and minimal' },
]

const read = (): BtnStyle => { try { const v = localStorage.getItem('wa-btn') as BtnStyle | null; if (v && BTN_STYLES.some((s) => s.id === v)) return v } catch { /* storage blocked */ } return 'clay' }

export function applyButtonStyle(s: BtnStyle) {
  document.documentElement.setAttribute('data-btn', s)
  try { localStorage.setItem('wa-btn', s) } catch { /* ignore */ }
  window.dispatchEvent(new Event('wa:btn'))
}
export function useButtonStyle(): [BtnStyle, (s: BtnStyle) => void] {
  const [s, setS] = useState<BtnStyle>(read)
  useEffect(() => { document.documentElement.setAttribute('data-btn', s) }, [s])
  useEffect(() => { const h = () => setS(read()); window.addEventListener('wa:btn', h); return () => window.removeEventListener('wa:btn', h) }, [])
  return [s, (v) => { setS(v); applyButtonStyle(v) }]
}

export function useDarkMode(): [boolean, (v: boolean) => void] {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try { localStorage.setItem('wa-theme', dark ? 'dark' : 'light') } catch { /* ignore */ }
  }, [dark])
  return [dark, setDark]
}
