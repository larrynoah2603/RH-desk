"use client";

import { Icon } from "@/components/ui/icons";
import { activityIcon, activityTone } from "@/lib/activity-routes";
import { formatRelative } from "@/lib/domain/labels";
import type { Activity, Locale } from "@/lib/domain/types";
import { resolveActivityMessage } from "@/lib/domain/activity";

export function ActivityList({ items, locale, limit, onSelect }: { items: Activity[]; locale: Locale; limit?: number; onSelect?: (activity: Activity) => void }) {
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <ol className="kit-timeline">
      {shown.map((item) => {
        const text = resolveActivityMessage(item.message, locale);
        const content = (
          <>
            <p className="kit-timeline-title">{text}</p>
            <p className="kit-timeline-meta"><time dateTime={item.at}>{formatRelative(item.at, locale)}</time></p>
          </>
        );
        return (
          <li key={item.id} className={`kit-timeline-item kit-timeline-${activityTone(item.type)}`}>
            <span className="kit-timeline-marker"><Icon name={activityIcon(item.type)} /></span>
            <div className="kit-timeline-content">
              {onSelect ? (
                <button type="button" className="kit-activity-button" onClick={() => onSelect(item)}>{content}</button>
              ) : content}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
