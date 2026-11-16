import { translations, type Dictionary } from "./translations";
import type { Locale } from "@/lib/domain/types";

export function fill(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match));
}

type LeafPaths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : LeafPaths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = LeafPaths<Dictionary>;

/** Résout une clé pointée (« jobs.title ») ou une clé de validation (« job.titleRequired »). */
export function message(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const dict = translations[locale];
  const segments = key.split(".");
  const [group, ...rest] = segments;
  if (rest.length && group in dict) {
    let node: unknown = dict[group as keyof Dictionary];
    for (const segment of rest) {
      if (typeof node !== "object" || node === null) return key;
      node = (node as Record<string, unknown>)[segment];
    }
    if (typeof node === "string") return fill(node, params);
    return key;
  }
  if (group in dict && segments.length === 1) {
    const value = dict[group as keyof Dictionary];
    if (typeof value === "string") return fill(value, params);
  }
  const validation = dict.validation as Record<string, string>;
  if (key in validation) return validation[key];
  return key;
}
