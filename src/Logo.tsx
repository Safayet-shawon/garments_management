const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ')

export const LogoMark = ({ size = 40, draw = false, className }: { size?: number; draw?: boolean; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="wa-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f3d779" /><stop offset=".55" stopColor="#d9a62e" /><stop offset="1" stopColor="#b8801a" /></linearGradient>
      <linearGradient id="wa-navy" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1f3a8a" /><stop offset="1" stopColor="#0b1432" /></linearGradient>
    </defs>
    <path d="M32 2 L58 17 V47 L32 62 L6 47 V17 Z" fill="url(#wa-navy)" stroke="url(#wa-gold)" strokeWidth="2.2" strokeLinejoin="round" />
    <path className={draw ? 'wa-draw' : undefined} d="M14 21 L23 45 L32 29 L41 45 L50 21" fill="none" stroke="url(#wa-gold)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" pathLength={100} />
    <path d="M16 52 H48" stroke="#f3e3b0" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="3.2 3.2" opacity=".85" />
    <path d="M32 9 L33.6 13.4 L38 15 L33.6 16.6 L32 21 L30.4 16.6 L26 15 L30.4 13.4 Z" fill="url(#wa-gold)" />
  </svg>
)

export const Logo = ({ compact = false, light = false, size = 40 }: { compact?: boolean; light?: boolean; size?: number }) => (
  <div className="flex items-center gap-2.5">
    <LogoMark size={size} className="wa-float shrink-0" />
    {!compact && (
      <div className="leading-none">
        <div className={cx('font-display text-[21px] font-bold tracking-[.16em]', light ? 'text-white' : 'text-slate-900 dark:text-white')}>WINNER</div>
        <div className={`mt-1 text-[9px] font-semibold uppercase tracking-[.46em] ${light ? 'text-gold-400' : 'text-gold-600 dark:text-gold-400'}`}>Apparels</div>
      </div>
    )}
  </div>
)

export const Spinner = ({ size = 28 }: { size?: number }) => (
  <span className="wa-spinner relative inline-block" style={{ width: size, height: size }}>
    <span className="absolute inset-0 rounded-full border-2 border-gold-500/25" />
    <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold-500" />
  </span>
)
