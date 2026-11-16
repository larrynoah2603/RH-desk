import { translations } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/domain/types";

export type RouteKey = "dashboard" | "jobs" | "candidates" | "pipeline" | "interviews" | "reviews" | "offers" | "reports" | "settings";

const SEGMENT_TO_KEY: Record<string, RouteKey> = {
  dashboard: "dashboard",
  jobs: "jobs",
  candidates: "candidates",
  pipeline: "pipeline",
  interviews: "interviews",
  reviews: "reviews",
  offers: "offers",
  reports: "reports",
  settings: "settings",
};

export function getRouteMeta(pathname: string, locale: Locale): { title: string; key: RouteKey | null } {
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  const key = SEGMENT_TO_KEY[segment] ?? null;
  const t = translations[locale];
  return { title: key ? t.nav[key] : t.brand.name, key };
}
