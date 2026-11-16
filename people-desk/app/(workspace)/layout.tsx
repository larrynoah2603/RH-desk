import { AppShell } from "@/components/app-shell";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main-content" className="skip-link">Aller au contenu</a>
      <AppShell>{children}</AppShell>
    </>
  );
}
