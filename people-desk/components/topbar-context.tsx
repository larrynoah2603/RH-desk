"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Icon } from "@/components/ui/icons";
import { getRouteMeta } from "@/components/layout/route-meta";
import { usePrefs } from "@/lib/i18n";

export function TopbarContext() {
  const { locale, t } = usePrefs();
  const pathname = usePathname();
  const { title } = getRouteMeta(pathname, locale);
  return (
    <>
      <button type="button" className="kit-icon-btn kit-topbar-menu" onClick={() => window.dispatchEvent(new CustomEvent("people-desk:open-menu"))} aria-label={t.nav.openMenu}>
        <Icon name="menu" />
      </button>
      <div className="kit-pagehead">
        <Breadcrumbs />
        <h1 className="kit-page-title">{title}</h1>
      </div>
    </>
  );
}
