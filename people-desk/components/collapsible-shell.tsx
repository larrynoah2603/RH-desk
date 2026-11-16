"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useT } from "@/lib/i18n";

const STORAGE_KEY = "people-desk-sidebar-collapsed";

export function CollapsibleShell({ sidebar, topbar, mobileNavigation, children }: { sidebar: React.ReactNode; topbar: React.ReactNode; mobileNavigation?: React.ReactNode; children: React.ReactNode }) {
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    const handleToggle = () => setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
    const handleOpen = () => setMobileOpen(true);
    window.addEventListener("people-desk:toggle-sidebar", handleToggle);
    window.addEventListener("people-desk:open-menu", handleOpen);
    return () => {
      window.removeEventListener("people-desk:toggle-sidebar", handleToggle);
      window.removeEventListener("people-desk:open-menu", handleOpen);
    };
  }, []);

  return (
    <div data-sidebar-collapsed={collapsed ? "true" : "false"} className="kit-app">
      {mobileOpen ? <button type="button" className="kit-backdrop" aria-label={t.nav.closeMenu} onClick={() => setMobileOpen(false)} /> : null}
      <aside
        id="app-sidebar"
        aria-label={t.nav.mainNav}
        onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setMobileOpen(false); }}
        className={`kit-sidebar${mobileOpen ? " kit-sidebar-open" : ""}`}
      >
        {sidebar}
        <button type="button" onClick={() => setMobileOpen(false)} className="kit-icon-btn kit-sidebar-close" aria-label={t.nav.closeMenu}><X /></button>
        <div className="kit-sidebar-foot">
          <button
            type="button"
            onClick={() => {
              setCollapsed((current) => {
                const next = !current;
                try {
                  window.localStorage.setItem(STORAGE_KEY, String(next));
                } catch {
                  /* storage unavailable */
                }
                return next;
              });
            }}
            className="kit-sidebar-collapse-action"
            aria-expanded={!collapsed}
            aria-label={collapsed ? t.nav.expandSidebar : t.nav.toggleSidebar}
            title={collapsed ? t.nav.expandSidebar : t.nav.toggleSidebar}
          >
            {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
            <span className="kit-sidebar-collapse-label">{collapsed ? t.nav.expandSidebar : t.nav.toggleSidebar}</span>
          </button>
        </div>
      </aside>

      <div className="kit-content">
        <header className="kit-topbar">{topbar}</header>
        <main id="main-content" className="kit-main">{children}</main>
        {mobileNavigation}
      </div>
    </div>
  );
}
