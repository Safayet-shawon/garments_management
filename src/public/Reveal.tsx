import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Fades content in once it scrolls into view. Content is visible without JS and for reduced-motion users (see index.css). */
export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect() } }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} className={`reveal ${seen ? 'reveal-in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>
}

export const SectionHead = ({ eyebrow, title, text, center = true }: { eyebrow: string; title: string; text?: string; center?: boolean }) => (
  <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
    <div className="text-xs font-semibold uppercase tracking-[.3em] text-gold-600">{eyebrow}</div>
    <h2 className="mt-3 font-display text-3xl font-bold text-slate-900 sm:text-4xl">{title}</h2>
    {text && <p className="mt-4 text-base leading-relaxed text-slate-600">{text}</p>}
  </div>
)
