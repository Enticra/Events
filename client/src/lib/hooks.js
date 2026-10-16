import { useCallback, useEffect, useState } from 'react';

/** Run an async loader and track { data, loading, error, reload }. */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return run()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => setState({ data: null, loading: false, error }));
  }, [run]);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

/** Set document title and meta description. */
export function useMeta(title, description) {
  useEffect(() => {
    document.title = title ? `${title} | Popcorn Events` : 'Popcorn Events';
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'description';
      document.head.appendChild(tag);
    }
    if (description) tag.content = description;
  }, [title, description]);
}
