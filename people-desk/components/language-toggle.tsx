"use client";

import { usePrefs } from "@/lib/i18n";

export function LanguageToggle() {
  const { locale, setLocale, t } = usePrefs();
  return (
    <div className="kit-preference-segments" role="group" aria-label={t.topbar.languageHint}>
      <button type="button" className="kit-preference-option" aria-pressed={locale === "fr"} onClick={() => setLocale("fr")} aria-label={t.topbar.languageFr}>FR</button>
      <button type="button" className="kit-preference-option" aria-pressed={locale === "en"} onClick={() => setLocale("en")} aria-label={t.topbar.languageEn}>EN</button>
    </div>
  );
}
