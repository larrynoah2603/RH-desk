"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown } from "@/components/ui/dropdown";
import { Icon } from "@/components/ui/icons";
import { ThemeSegmented } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { DensityToggle } from "@/components/density-toggle";
import { usePrefs } from "@/lib/i18n";
import { useWorkspaceData } from "@/lib/storage/store";

export function ProfileMenu() {
  const { t } = usePrefs();
  const data = useWorkspaceData();
  const name = data.settings.hiringLead;
  const email = data.settings.contactEmail;
  return (
    <Dropdown
      triggerLabel={t.topbar.profile}
      triggerClassName="kit-user-trigger"
      panelClassName="kit-popover-menu"
      role="dialog"
      triggerContent={
        <>
          <Avatar name={name} status />
          <span className="kit-user-trigger-text">
            <span className="kit-user-trigger-name">{name}</span>
            <span className="kit-user-trigger-sub">{data.settings.companyName}</span>
          </span>
          <span className="kit-user-chevron" aria-hidden="true"><Icon name="chevronDown" /></span>
        </>
      }
    >
      {(close) => (
        <>
          <div className="kit-menu-head">
            <p className="kit-menu-head-name">{name}</p>
            <p className="kit-menu-head-sub">{email}</p>
            <p className="kit-menu-head-sub">{t.topbar.role}</p>
          </div>
          <div className="kit-menu">
            <Link href="/settings" onClick={close} className="kit-menu-item"><Icon name="sliders" />{t.topbar.accountSettings}</Link>
            <div className="kit-menu-sep" role="separator" />
            <div className="kit-profile-preferences" aria-label={t.topbar.preferences}>
              <div className="kit-profile-preference-row"><span className="kit-profile-preference-label">{t.topbar.themeHint}</span><ThemeSegmented /></div>
              <div className="kit-profile-preference-row"><span className="kit-profile-preference-label">{t.topbar.languageHint}</span><LanguageToggle /></div>
              <div className="kit-profile-preference-row"><span className="kit-profile-preference-label">{t.topbar.densityHint}</span><DensityToggle /></div>
            </div>
            <div className="kit-menu-sep" role="separator" />
            <Link href="/" className="kit-menu-item"><Icon name="home" />{t.nav.backToLanding}</Link>
          </div>
        </>
      )}
    </Dropdown>
  );
}
