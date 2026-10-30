import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Tab } from '../components/Sidebar';

const LS_KEY = 'streamdaemon-ui-preferences';
const LEGACY_SIDEBAR_KEY = 'streamforger-sidebar-collapsed';
const MAX_FAVORITES = 5;

export interface UiPreferences {
  favorites: Tab[];
  collapsedSections: string[];
  sidebarCollapsed: boolean;
}

const DEFAULT_PREFERENCES: UiPreferences = {
  favorites: ['chat', 'dashboard', 'obs'],
  collapsedSections: [],
  sidebarCollapsed: false,
};

function normalize(raw: Partial<UiPreferences>): UiPreferences {
  return {
    favorites: Array.isArray(raw.favorites)
      ? raw.favorites.slice(0, MAX_FAVORITES)
      : DEFAULT_PREFERENCES.favorites,
    collapsedSections: Array.isArray(raw.collapsedSections) ? raw.collapsedSections : [],
    sidebarCollapsed:
      typeof raw.sidebarCollapsed === 'boolean' ? raw.sidebarCollapsed : false,
  };
}

function loadPreferences(): UiPreferences {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return normalize(JSON.parse(raw) as Partial<UiPreferences>);
    // Migrate the legacy collapse flag
    const legacy = localStorage.getItem(LEGACY_SIDEBAR_KEY);
    if (legacy !== null) {
      return { ...DEFAULT_PREFERENCES, sidebarCollapsed: legacy === 'true' };
    }
  } catch {}
  return { ...DEFAULT_PREFERENCES };
}

interface UiPreferencesValue {
  favorites: Tab[];
  collapsedSections: string[];
  sidebarCollapsed: boolean;
  toggleFavorite: (tab: Tab) => void;
  toggleSection: (sectionId: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  exportPreferences: () => string;
  importPreferences: (json: string) => boolean;
  resetPreferences: () => void;
  isFavorite: (tab: Tab) => boolean;
  isSectionCollapsed: (sectionId: string) => boolean;
}

const UiPreferencesContext = createContext<UiPreferencesValue | null>(null);

export function UiPreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UiPreferences>(loadPreferences);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(prefs));
    } catch {}
  }, [prefs]);

  const toggleFavorite = useCallback((tab: Tab) => {
    setPrefs((prev) => {
      if (prev.favorites.includes(tab)) {
        return { ...prev, favorites: prev.favorites.filter((f) => f !== tab) };
      }
      if (prev.favorites.length >= MAX_FAVORITES) {
        // Keep the most recent ones
        return { ...prev, favorites: [...prev.favorites.slice(1), tab] };
      }
      return { ...prev, favorites: [...prev.favorites, tab] };
    });
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    setPrefs((prev) => ({
      ...prev,
      collapsedSections: prev.collapsedSections.includes(sectionId)
        ? prev.collapsedSections.filter((s) => s !== sectionId)
        : [...prev.collapsedSections, sectionId],
    }));
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setPrefs((prev) => ({ ...prev, sidebarCollapsed: collapsed }));
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setPrefs((prev) => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  }, []);

  const exportPreferences = useCallback(() => JSON.stringify(prefs, null, 2), [prefs]);

  const importPreferences = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json) as Partial<UiPreferences>;
      if (typeof parsed !== 'object' || parsed === null) return false;
      setPrefs(normalize(parsed));
      return true;
    } catch {
      return false;
    }
  }, []);

  const resetPreferences = useCallback(() => {
    setPrefs({ ...DEFAULT_PREFERENCES });
  }, []);

  const value = useMemo<UiPreferencesValue>(
    () => ({
      ...prefs,
      toggleFavorite,
      toggleSection,
      setSidebarCollapsed,
      toggleSidebarCollapsed,
      exportPreferences,
      importPreferences,
      resetPreferences,
      isFavorite: (tab: Tab) => prefs.favorites.includes(tab),
      isSectionCollapsed: (sectionId: string) =>
        prefs.collapsedSections.includes(sectionId),
    }),
    [
      prefs,
      toggleFavorite,
      toggleSection,
      setSidebarCollapsed,
      toggleSidebarCollapsed,
      exportPreferences,
      importPreferences,
      resetPreferences,
    ],
  );

  return (
    <UiPreferencesContext.Provider value={value}>{children}</UiPreferencesContext.Provider>
  );
}

export function useUiPreferences(): UiPreferencesValue {
  const ctx = useContext(UiPreferencesContext);
  if (!ctx) {
    throw new Error('useUiPreferences must be used within a UiPreferencesProvider');
  }
  return ctx;
}
