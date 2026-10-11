import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { GarmentImg } from '../components/Img'
import { colorHex } from '../ui'
import type { PublicProduct } from '../api'

export const ProductCard = memo(function ProductCard({ p, priority = false, heading: H = 'h3' }: { p: PublicProduct; priority?: boolean; heading?: 'h2' | 'h3' }) {
  return (
    <Link to={`/collections/${p.slug}`} className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
        <GarmentImg src={p.image} alt={`${p.name} in ${p.colors[0] ?? 'multiple colours'}`} width={640} height={800} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" priority={priority} />
        <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-brand-700 backdrop-blur">{p.category}</span>
        <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white opacity-0 shadow-lg transition group-hover:opacity-100"><ArrowUpRight size={18} /></span>
      </div>
      <div className="p-4">
        <H className="font-semibold text-slate-900">{p.name}</H>
        <div className="mt-2 flex items-center gap-1.5">{p.colors.slice(0, 6).map((c) => <i key={c} title={c} className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: colorHex(c) }} />)}{p.colors.length > 6 && <span className="text-xs text-slate-400">+{p.colors.length - 6}</span>}</div>
        <div className="mt-3 flex justify-between text-xs text-slate-500"><span>MOQ {p.moq} pcs</span><span>{p.leadTimeDays} day lead time</span></div>
      </div>
    </Link>
  )
})

export const ProductSkeleton = () => <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="shimmer aspect-[4/5]" /><div className="space-y-2 p-4"><div className="shimmer h-4 w-2/3 rounded" /><div className="shimmer h-3 w-1/3 rounded" /></div></div>
