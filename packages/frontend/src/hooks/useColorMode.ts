import { useState, useEffect } from 'react';

type ColorMode = 'dark' | 'light';

export function useColorMode() {
  const [mode, setMode] = useState<ColorMode>(() => {
    const saved = localStorage.getItem('sf-color-mode');
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem('sf-color-mode', mode);
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const toggleMode = () => setMode((m) => (m === 'light' ? 'dark' : 'light'));

  return { mode, toggleMode, setMode };
}
