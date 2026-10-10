import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

export function useFetch(path) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const load = useCallback(async () => {
    try {
      const data = await api.get(path);
      setState({ data, loading: false, error: null });
    } catch (e) {
      setState({ data: null, loading: false, error: e.message });
    }
  }, [path]);
  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    load();
  }, [load]);
  return { ...state, reload: load };
}

export const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

/** Runs an API call, shows a toast, reloads data. */
export function useAction(reload) {
  const toast = useToast();
  return useCallback(
    async (fn, okMsg) => {
      try {
        const r = await fn();
        if (okMsg) toast(okMsg);
        await reload?.();
        return r;
      } catch (e) {
        toast(e.message, 'error');
        return null;
      }
    },
    [reload, toast],
  );
}
