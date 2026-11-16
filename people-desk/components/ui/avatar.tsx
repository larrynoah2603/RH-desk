import { initials } from "@/lib/domain/labels";

/** Avatar rond : initiales sur un ton dérivé du nom. */
export function Avatar({ name, size = "md", status = false, className = "", href }: { name: string; size?: "sm" | "md" | "lg" | "xl"; status?: boolean; className?: string; href?: string }) {
  const sizeClass = size === "sm" ? "kit-avatar-sm" : size === "lg" ? " kit-avatar-lg" : size === "xl" ? " kit-avatar-xl" : "";
  const content = <span className={`kit-avatar${sizeClass}${status ? " kit-avatar-status" : ""} ${className}`.trim()} title={name}>{initials(name)}</span>;
  return href ? <a href={href} className="kit-avatar-link" aria-label={name}>{content}</a> : content;
}
