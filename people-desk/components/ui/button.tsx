import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export function Button({ variant = "primary", size = "md", className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={`kit-btn kit-btn-${variant} ${size === "sm" ? "kit-btn-sm" : size === "lg" ? "kit-btn-lg" : ""} ${className}`.trim()} {...props} />;
}
