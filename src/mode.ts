// Build-time switch (VITE_APP_MODE): 'all' (default), 'site' (marketing website only) or 'erp' (business app only).
const raw = (import.meta.env.VITE_APP_MODE as string | undefined) ?? 'all'
export const APP_MODE: 'all' | 'site' | 'erp' = raw === 'site' || raw === 'erp' ? raw : 'all'
export const HAS_SITE = APP_MODE !== 'erp'
export const HAS_ERP = APP_MODE !== 'site'
/** Absolute URL of the other half when the website and the business app are deployed separately. */
export const ERP_URL = ((import.meta.env.VITE_ERP_URL as string | undefined) ?? '').replace(/\/$/, '')
export const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) ?? '').replace(/\/$/, '')
