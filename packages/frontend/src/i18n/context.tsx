import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Locale, LocaleSetting } from './types';

const LS_KEY = 'streamforger-locale';

function detectLocale(): Locale {
  const langs = navigator.languages ?? [navigator.language];
  for (const l of langs) {
    if (!l) continue;
    const code = l.split('-')[0];
    if (['es', 'en', 'fr', 'de', 'it'].includes(code)) return code as Locale;
  }
  return 'es';
}

interface TranslationContextValue {
  locale: Locale; // Active locale
  localeSetting: LocaleSetting;
  setLocale: (l: LocaleSetting) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dict: Record<string, unknown>;
}

export const TranslationContext = createContext<TranslationContextValue>(null!);

function resolve(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const p of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[p];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return params[key] != null ? String(params[key]) : `{{${key}}}`;
  });
}

const localeModules: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
  es: () => import('./es.json'),
  en: () => import('./en.json'),
  fr: () => import('./fr.json'),
  de: () => import('./de.json'),
  it: () => import('./it.json'),
};

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [localeSetting, setLocaleSettingState] = useState<LocaleSetting>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored && ['auto', 'es', 'en', 'fr', 'de', 'it'].includes(stored)) {
        return stored as LocaleSetting;
      }
    } catch {}
    return 'auto';
  });

  const locale = localeSetting === 'auto' ? detectLocale() : localeSetting;
  const [dict, setDict] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const base = localeModules[locale]();
    const fallback = locale === 'es' ? Promise.resolve({ default: {} }) : localeModules.es();
    Promise.all([base, fallback]).then(([baseMod, fallbackMod]) => {
      setDict({ ...fallbackMod.default, ...baseMod.default });
    });
  }, [locale]);

  const setLocale = useCallback((l: LocaleSetting) => {
    setLocaleSettingState(l);
    try { localStorage.setItem(LS_KEY, l); } catch {}
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    const val = resolve(dict, key) ?? key;
    return interpolate(val, params);
  }, [dict]);

  return (
    <TranslationContext.Provider value={{ locale, localeSetting, setLocale, t, dict }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}
