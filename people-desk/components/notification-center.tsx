"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useDismissable } from "@/components/ui/dropdown";
import { Icon } from "@/components/ui/icons";
import { activityHref, activityIcon, activityTone } from "@/lib/activity-routes";
import { resolveActivityMessage } from "@/lib/domain/activity";
import { formatRelative } from "@/lib/domain/labels";
import type { Activity } from "@/lib/domain/types";
import { usePrefs } from "@/lib/i18n";
import { useToast } from "@/components/toast-provider";
import { useWorkspaceData } from "@/lib/storage/store";

export function NotificationCenter() {
  const { locale, t } = usePrefs();
  const data = useWorkspaceData();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismissable<HTMLDivElement>(open, close);
  const items = data.activity.slice(0, 8);
  const unread = useMemo(() => items.filter((item) => !seenAt || item.at > seenAt).length, [items, seenAt]);

  function toggle() {
    setOpen((current) => {
      const next = !current;
      if (next && data.activity[0]) setSeenAt(data.activity[0].at);
      return next;
    });
  }

  function openActivity(item: Activity) {
    setOpen(false);
    router.push(activityHref(item));
  }

  return (
    <div ref={ref} className="kit-anchor">
      <button type="button" onClick={toggle} className="kit-icon-btn" aria-label={`${t.topbar.notifications}${unread ? `, ${unread} ${t.topbar.newActivity}` : ""}`} aria-expanded={open} aria-haspopup="dialog" title={t.topbar.notifications}>
        <Icon name="bell" />
        {unread ? <span className="kit-bell-badge">{unread > 9 ? "9+" : unread}</span> : null}
      </button>
      {open ? (
        <section className="kit-popover kit-notif" role="dialog" aria-label={t.topbar.notifications}>
          <div className="kit-notif-head">
            <h2 className="kit-notif-title">{t.topbar.notifications}{unread ? <span className="kit-badge kit-badge-info">{unread} {t.topbar.newActivity}</span> : null}</h2>
            <button type="button" disabled={!unread} onClick={() => { if (data.activity[0]) setSeenAt(data.activity[0].at); toast(t.topbar.markAllRead, "info"); }} className="kit-btn kit-btn-ghost kit-btn-sm">
              {t.topbar.markAllRead}
            </button>
          </div>
          <div className="kit-notif-list">
            {!items.length ? <p className="kit-notif-empty">{t.topbar.noNotifications}</p> : null}
            {items.map((item) => (
              <button key={item.id} type="button" onClick={() => openActivity(item)} className={`kit-notif-row kit-notif-${activityTone(item.type) === "danger" ? "breach" : activityTone(item.type) === "warning" ? "warning" : activityTone(item.type) === "success" ? "assigned" : "neutral"} ${item.at > (seenAt ?? "") ? "kit-notif-unread" : "kit-notif-read"}`}>
                <span className="kit-notif-icon"><Icon name={activityIcon(item.type)} /></span>
                <span className="kit-notif-body">
                  <span className="kit-notif-item-title">{resolveActivityMessage(item.message, locale)}</span>
                  <span className="kit-notif-item-meta">{formatRelative(item.at, locale)}</span>
                </span>
                {item.at > (seenAt ?? "") ? <span className="kit-notif-dot" role="img" aria-label={t.topbar.newActivity} /> : null}
              </button>
            ))}
          </div>
          <Link href="/dashboard" onClick={close} className="kit-notif-foot">{t.common.seeAll}</Link>
        </section>
      ) : null}
    </div>
  );
}
