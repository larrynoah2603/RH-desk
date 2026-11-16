"use client";

import Link from "next/link";
import Image from "next/image";
import { useT } from "@/lib/i18n";

export function SidebarBrand() {
  const t = useT();
  return (
    <Link href="/dashboard" className="kit-sidebar-brand-link" aria-label={t.brand.name}>
      <span className="kit-brand-mark" aria-hidden="true">
        <Image src="/brand/people-desk-mark.svg" alt="" width={28} height={28} unoptimized />
      </span>
      <span className="kit-brand-copy">
        <span className="kit-brand-name">{t.brand.name}</span>
        <span className="kit-brand-subtitle">{t.brand.tagline}</span>
      </span>
    </Link>
  );
}
