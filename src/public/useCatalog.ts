import { useCallback, useEffect, useState } from 'react'
import { api, type PublicProduct } from '../api'

export function useCatalog() {
  const [data, setData] = useState<{ products: PublicProduct[]; countries: { code: string; name: string }[] } | null>(null)
  const [error, setError] = useState(false)
  const load = useCallback(() => {
    setError(false)
    let on = true
    api.catalog((d) => on && setData(d)).then((d) => on && setData(d)).catch(() => on && setError(true))
    return () => { on = false }
  }, [])
  useEffect(() => load(), [load])
  return { data, error, retry: load }
}
