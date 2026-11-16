import type { ReactNode } from "react";

/** Cadre présentationnel : logo et navigation. */
export function AppSidebar({ brand, navigation }: { brand: ReactNode; navigation: ReactNode }) {
  return (
    <>
      <div className="kit-sidebar-brand">{brand}</div>
      <div className="kit-sidebar-nav">{navigation}</div>
    </>
  );
}
