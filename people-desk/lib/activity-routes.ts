import type { Activity } from "@/lib/domain/types";

/** Destination business d'une entrée d'activité (présentation uniquement). */
export function activityHref(activity: Activity): string {
  const [, section] = activity.type.split(".");
  switch (section) {
    case "job":
      return "/jobs";
    case "candidate":
    case "note":
      return "/candidates";
    case "interview":
      return "/interviews";
    case "review":
      return "/reviews";
    case "offer":
      return "/offers";
    case "data":
    case "settings":
      return "/settings";
    default:
      return "/dashboard";
  }
}

export type ActivityTone = "info" | "success" | "warning" | "danger" | "neutral";

export function activityTone(type: string): ActivityTone {
  if (type.endsWith(".deleted") || type.endsWith(".cancelled") || type.endsWith(".rejected")) return "danger";
  if (type.endsWith(".hired") || type.endsWith(".done") || type.endsWith(".accepted")) return "success";
  if (type.endsWith(".paused") || type.endsWith(".archived") || type.endsWith(".imported")) return "warning";
  if (type === "activity.note.added") return "neutral";
  return "info";
}

export function activityIcon(type: string): "briefcase" | "users" | "calendar" | "star" | "file" | "note" | "database" | "sliders" {
  const [, section] = type.split(".");
  switch (section) {
    case "job":
      return "briefcase";
    case "candidate":
      return "users";
    case "interview":
      return "calendar";
    case "review":
      return "star";
    case "offer":
      return "file";
    case "data":
      return "database";
    case "settings":
      return "sliders";
    default:
      return "note";
  }
}
