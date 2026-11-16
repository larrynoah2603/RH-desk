"use client";

import { GlobalSearch } from "@/components/global-search";
import { NotificationCenter } from "@/components/notification-center";
import { ProfileMenu } from "@/components/profile-menu";
import { ShellNavLink } from "@/components/shell-nav-link";
import { TopbarContext } from "@/components/topbar-context";
import { CollapsibleShell } from "@/components/collapsible-shell";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarBrand } from "@/components/layout/sidebar-brand";
import { TopHeader } from "@/components/layout/top-header";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { Icon, type IconName } from "@/components/ui/icons";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useT } from "@/lib/i18n";
import { IS_REMOTE_MODE, useRemoteStatus, useWorkspaceData } from "@/lib/storage/store";

type NavLink = { href: string; label: string; icon: IconName; group: "main" | "account"; badge?: number };

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useT();
  const data = useWorkspaceData();
  const remoteStatus = useRemoteStatus();
  const today = new Date().toDateString();
  const interviewsToday = data.interviews.filter((interview) => interview.status === "scheduled" && new Date(interview.start).toDateString() === today).length;
  const pendingOffers = data.offers.filter((offer) => offer.status === "draft" || offer.status === "review" || offer.status === "approved").length;
  const screening = data.candidates.filter((candidate) => candidate.stage === "Screening").length;

  const links: NavLink[] = [
    { href: "/dashboard", label: t.nav.dashboard, icon: "dashboard", group: "main" },
    { href: "/jobs", label: t.nav.jobs, icon: "briefcase", group: "main" },
    { href: "/candidates", label: t.nav.candidates, icon: "users", group: "main", badge: screening },
    { href: "/pipeline", label: t.nav.pipeline, icon: "kanban", group: "main" },
    { href: "/interviews", label: t.nav.interviews, icon: "calendar", group: "main", badge: interviewsToday },
    { href: "/reviews", label: t.nav.reviews, icon: "star", group: "main" },
    { href: "/offers", label: t.nav.offers, icon: "file", group: "main", badge: pendingOffers },
    { href: "/reports", label: t.nav.reports, icon: "chart", group: "main" },
    { href: "/settings", label: t.nav.settings, icon: "sliders", group: "account" },
  ];

  const sections: Array<{ id: "main" | "account"; label: string }> = [
    { id: "main", label: t.nav.workspace },
    { id: "account", label: t.nav.account },
  ];

  const sidebar = (
    <AppSidebar
      brand={<SidebarBrand />}
      navigation={
        <nav aria-label={t.nav.mainNav}>
          {sections.map((section) => (
            <section key={section.id} className="kit-nav-section" aria-labelledby={`sidebar-group-${section.id}`}>
              <p id={`sidebar-group-${section.id}`} className="kit-nav-label">{section.label}</p>
              {links.filter((link) => link.group === section.id).map((link) => (
                <ShellNavLink key={link.href} href={link.href} title={link.label} icon={<Icon name={link.icon} />} badge={link.badge}>
                  {link.label}
                </ShellNavLink>
              ))}
            </section>
          ))}
        </nav>
      }
    />
  );

  const topbar = (
    <TopHeader
      context={<TopbarContext />}
      search={<GlobalSearch />}
      actions={
        <>
          <span className="kit-demo-pill" role="status" title={IS_REMOTE_MODE ? (process.env.NEXT_PUBLIC_RH_DESK_STORAGE === "local-server" ? t.topbar.localServerHint : t.topbar.cloudHint) : t.topbar.demoHint}><Icon name="database" />{IS_REMOTE_MODE ? (remoteStatus.state === "saving" ? t.topbar.cloudSaving : remoteStatus.state === "error" ? t.topbar.cloudError : (process.env.NEXT_PUBLIC_RH_DESK_STORAGE === "local-server" ? t.topbar.localServer : t.topbar.cloud)) : t.topbar.demo}</span>
          <NotificationCenter />
          <span className="kit-hotbar-preferences">
            <LanguageToggle />
            <ThemeToggle />
          </span>
          <span className="kit-topbar-divider" aria-hidden="true" />
          <ProfileMenu />
        </>
      }
    />
  );

  const mobileNavigation = (
    <MobileNavigation
      links={[
        { href: "/dashboard", label: t.nav.dashboard, icon: "dashboard" },
        { href: "/candidates", label: t.nav.candidates, icon: "users" },
        { href: "/pipeline", label: t.nav.pipeline, icon: "kanban" },
        { href: "/interviews", label: t.nav.interviews, icon: "calendar", shortLabel: t.nav.interviews.split(" ")[0] ?? t.nav.interviews },
        { href: "/settings", label: t.nav.settings, icon: "sliders" },
      ]}
    />
  );

  return (
    <CollapsibleShell sidebar={sidebar} topbar={topbar} mobileNavigation={mobileNavigation}>
      {children}
    </CollapsibleShell>
  );
}
