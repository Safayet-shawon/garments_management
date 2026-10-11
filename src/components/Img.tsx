import { memo } from 'react'

interface Props { src: string; alt: string; width: number; height: number; className?: string; priority?: boolean; sizes?: string }

/** Responsive image: WebP at 320/640 px, native lazy loading, async decoding and reserved space (no layout shift). */
export const GarmentImg = memo(function GarmentImg({ src, alt, width, height, className, priority, sizes = '(max-width: 640px) 50vw, 320px' }: Props) {
  const small = src.replace(/-640\.webp$/, '-320.webp')
  return (
    <img
      src={src} srcSet={`${small} 320w, ${src} 640w`} sizes={sizes}
      alt={alt} width={width} height={height} className={className}
      loading={priority ? 'eager' : 'lazy'} decoding="async" {...(priority ? { fetchPriority: 'high' as const } : {})}
    />
  )
})

export const HeroImg = memo(function HeroImg({ alt = '' }: { alt?: string }) {
  return (
    <picture>
      <source type="image/avif" srcSet="/img/hero-800.avif 800w, /img/hero-1600.avif 1600w" sizes="100vw" />
      <source type="image/webp" srcSet="/img/hero-800.webp 800w, /img/hero-1600.webp 1600w" sizes="100vw" />
      <img src="/img/hero-1600.webp" alt={alt} width={1600} height={900} fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover object-right" />
    </picture>
  )
})
