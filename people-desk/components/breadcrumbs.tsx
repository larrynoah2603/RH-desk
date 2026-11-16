"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { useT } from "@/lib/i18n";

export function Breadcrumbs() {
  const t = useT();
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  if (!segment || segment === "dashboard") return null;
  return (
    <nav aria-label={t.common.back}>
      <ol className="kit-crumbs">
        <li><Link href="/dashboard">{t.nav.dashboard}</Link><Icon name="chevronRight" /></li>
        <li><span aria-current="page">{pathname.split("/").filter(Boolean).map((part) => part.replaceAll("-", " ")).join(" / ")}</span></li>
      </ol>
    </nav>
  );
}
