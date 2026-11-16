"use client";

import { Icon } from "@/components/ui/icons";
import { usePrefs } from "@/lib/i18n";

/** Bascule rapide clair/sombre (l'option Auto reste disponible dans les préférences). */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme, t } = usePrefs();
  const next = resolvedTheme === "dark" ? "light" : "dark";
  const label = theme === "auto" ? `${t.topbar.themeHint} : ${t.topbar.themeAuto}` : next === "dark" ? t.topbar.themeDark : t.topbar.themeLight;
  return (
    <button type="button" onClick={() => setTheme(next)} className="kit-icon-btn" aria-label={label} title={label}>
      <Icon name={resolvedTheme === "dark" ? "sun" : "moon"} />
    </button>
  );
}

export function ThemeSegmented() {
  const { theme, setTheme, t } = usePrefs();
  return (
    <div className="kit-preference-segments" role="group" aria-label={t.topbar.themeHint}>
      {([
        ["auto", t.topbar.themeAuto],
        ["light", t.topbar.themeLight],
        ["dark", t.topbar.themeDark],
      ] as const).map(([value, label]) => (
        <button key={value} type="button" className="kit-preference-option" aria-pressed={theme === value} onClick={() => setTheme(value)}>
          {label}
        </button>
      ))}
    </div>
  );
}
