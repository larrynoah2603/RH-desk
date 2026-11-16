"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Density, Locale, ThemePreference } from "@/lib/domain/types";
import { fill, message } from "./messages";
import { translations, type Dictionary } from "./translations";

export const LOCALE_KEY = "people-desk:locale";
export const THEME_KEY = "people-desk:theme";
export const DENSITY_KEY = "people-desk:density";

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "fr";
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "fr";
}

export function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writePref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: keep in-memory only */
  }
}

export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference !== "auto") return preference;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyDocument(locale: Locale, theme: ThemePreference, density: Density) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(theme);
  root.dataset.themePreference = theme;
  root.dataset.density = density;
  root.lang = locale;
}

type PrefsValue = {
  locale: Locale;
  theme: ThemePreference;
  density: Density;
  resolvedTheme: "light" | "dark";
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemePreference) => void;
  setDensity: (density: Density) => void;
  t: Dictionary;
  tr: (key: string, params?: Record<string, string | number>) => string;
};

const PrefsContext = createContext<PrefsValue | null>(null);

const LOCALES = ["fr", "en"] as const;
const THEMES = ["auto", "light", "dark"] as const;
const DENSITIES = ["normal", "compact"] as const;

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [theme, setThemeState] = useState<ThemePreference>("auto");
  const [density, setDensityState] = useState<Density>("normal");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const initialLocale = readPref(LOCALE_KEY, LOCALES, detectLocale());
    const initialTheme = readPref(THEME_KEY, THEMES, "auto");
    const initialDensity = readPref(DENSITY_KEY, DENSITIES, "normal");
    setLocaleState(initialLocale);
    setThemeState(initialTheme);
    setDensityState(initialDensity);
    setResolvedTheme(resolveTheme(initialTheme));
    applyDocument(initialLocale, initialTheme, initialDensity);
  }, []);

  useEffect(() => {
    if (theme !== "auto" || typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setResolvedTheme(media.matches ? "dark" : "light");
      applyDocument(readPref(LOCALE_KEY, LOCALES, "fr"), "auto", readPref(DENSITY_KEY, DENSITIES, "normal"));
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    writePref(LOCALE_KEY, next);
    applyDocument(next, readPref(THEME_KEY, THEMES, "auto"), readPref(DENSITY_KEY, DENSITIES, "normal"));
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    setResolvedTheme(resolveTheme(next));
    writePref(THEME_KEY, next);
    applyDocument(readPref(LOCALE_KEY, LOCALES, "fr"), next, readPref(DENSITY_KEY, DENSITIES, "normal"));
  }, []);

  const setDensity = useCallback((next: Density) => {
    setDensityState(next);
    writePref(DENSITY_KEY, next);
    applyDocument(readPref(LOCALE_KEY, LOCALES, "fr"), readPref(THEME_KEY, THEMES, "auto"), next);
  }, []);

  const value = useMemo<PrefsValue>(
    () => ({
      locale,
      theme,
      density,
      resolvedTheme,
      setLocale,
      setTheme,
      setDensity,
      t: translations[locale],
      tr: (key: string, params?: Record<string, string | number>) => message(locale, key, params),
    }),
    [locale, theme, density, resolvedTheme, setLocale, setTheme, setDensity],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  const value = useContext(PrefsContext);
  if (!value) throw new Error("usePrefs must be used within PrefsProvider");
  return value;
}

export function useT(): Dictionary {
  return usePrefs().t;
}

export { fill, translations };
export type { Dictionary };
