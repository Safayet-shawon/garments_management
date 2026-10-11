import { useEffect } from 'react'
import { SITE } from '../shared/site'

export interface SeoInput { title: string; description?: string; path?: string; index?: boolean; image?: string; keywords?: string[] }

const setMeta = (attr: 'name' | 'property', key: string, content: string | null) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (content === null) { el?.remove(); return }
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute('content', content)
}

/** Keeps <title>, description, canonical, robots and social tags correct while navigating the single-page app. */
export function useSeo({ title, description, path, index = true, image, keywords }: SeoInput) {
  useEffect(() => {
    document.title = title
    const origin = window.location.origin
    const url = origin + (path ?? window.location.pathname)
    setMeta('name', 'description', description ?? null)
    setMeta('name', 'keywords', keywords?.length ? keywords.join(', ') : null)
    setMeta('name', 'robots', index ? 'index, follow, max-image-preview:large' : 'noindex, nofollow')
    setMeta('property', 'og:site_name', SITE.name)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description ?? null)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:image', image ? origin + image : origin + '/og-image.jpg')
    setMeta('name', 'twitter:card', 'summary_large_image')
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
    link.href = url
    // structured data is rendered by the server for each URL; drop it once the visitor navigates elsewhere
    document.head.querySelectorAll<HTMLScriptElement>('script[data-ssr]').forEach((n) => { if (n.dataset.ssr !== (path ?? window.location.pathname)) n.remove() })
  }, [title, description, path, index, image, keywords])
}
