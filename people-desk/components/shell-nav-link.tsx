"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

export function ShellNavLink({ href, children, icon, title, badge }: { href: string; children: React.ReactNode; icon: React.ReactNode; title?: string; badge?: number }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href as Route} aria-current={active ? "page" : undefined} title={title} className="kit-nav-item">
      <span className="kit-nav-icon">{icon}</span>
      <span className="kit-nav-text">
        {children}
        {badge ? <span className="kit-nav-count" aria-label={`${badge}`}>{badge > 99 ? "99+" : badge}</span> : null}
      </span>
    </Link>
  );
}
