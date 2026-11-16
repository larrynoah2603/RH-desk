"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icons";

type MobileLink = { href: string; label: string; icon: IconName; shortLabel?: string; badge?: number };

export function MobileNavigation({ links }: { links: MobileLink[] }) {
  const pathname = usePathname();
  return (
    <nav className="kit-bottom-nav" aria-label="Navigation mobile">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link key={link.href} href={link.href as Route} className="kit-bottom-link" aria-current={active ? "page" : undefined}>
            <Icon name={link.icon} />
            {link.badge ? <span className="kit-bottom-badge">{link.badge > 9 ? "9+" : link.badge}</span> : null}
            <span>{link.shortLabel ?? link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
