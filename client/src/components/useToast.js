import { useEffect, useRef, useState } from 'react';

/** [message, show] — message auto-clears after 2.5s. */
export function useToast() {
  const [msg, setMsg] = useState('');
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = (m) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 2500);
  };
  return [msg, show];
}
