"use client";

import { usePrefs } from "@/lib/i18n";

export function DensityToggle() {
  const { density, setDensity, t } = usePrefs();
  return (
    <div className="kit-preference-segments" role="group" aria-label={t.topbar.densityHint}>
      <button type="button" className="kit-preference-option" aria-pressed={density === "normal"} onClick={() => setDensity("normal")}>{t.topbar.densityNormal}</button>
      <button type="button" className="kit-preference-option" aria-pressed={density === "compact"} onClick={() => setDensity("compact")}>{t.topbar.densityCompact}</button>
    </div>
  );
}
