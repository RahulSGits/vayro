'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type Ctx = { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void; ready: boolean };

const ThemeContext = createContext<Ctx>({
  theme: 'dark', setTheme: () => {}, toggle: () => {}, ready: false,
});

export const STORAGE_KEY = 'vayro.theme';

/**
 * Inlined before paint so the correct palette is committed on first frame.
 * Dark is the brand default; an explicit choice always wins.
 */
export const themeScript = `(function(){try{
  var s=localStorage.getItem('${STORAGE_KEY}');
  var t=s==='light'||s==='dark'?s:'dark';
  document.documentElement.setAttribute('data-theme',t);
}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const attr = document.documentElement.getAttribute('data-theme');
    setThemeState(attr === 'light' ? 'light' : 'dark');
    setReady(true);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    const root = document.documentElement;
    root.classList.add('theme-switching');
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode */ }
    setThemeState(next);
    window.setTimeout(() => root.classList.remove('theme-switching'), 400);
  }, []);

  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle, ready }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
