"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { WorkspacePages, type WorkspacePage } from "@/components/workspace-pages";

const MODULES = ["dashboard", "jobs", "candidates", "pipeline", "interviews", "reviews", "offers", "reports", "settings"] as const;

export default function WorkspaceModulePage() {
  const params = useParams<{ module: string }>();
  const moduleName = params.module;
  if (!MODULES.some((name) => name === moduleName)) {
    return (
      <main id="main-content" className="rh-page">
        <h1>Page introuvable</h1>
        <p>Ce module n’existe pas.</p>
        <Link href="/dashboard">Retour au tableau de bord</Link>
      </main>
    );
  }
  return <WorkspacePages page={moduleName as WorkspacePage} />;
}
