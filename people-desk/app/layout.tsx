import type { Metadata, Viewport } from "next";
import { PrefsProvider } from "@/lib/i18n";
import { StoreProvider } from "@/lib/storage/store";
import { ToastProvider } from "@/components/toast-provider";
import { SecureWorkspaceGate } from "@/components/secure-workspace-gate";
import "./globals.css";

export const metadata: Metadata = {
  title: "PEOPLE DESK — Talent operations",
  description: "Un espace de recrutement calme et précis : postes, candidats, pipeline, entretiens, notes et offres.",
  icons: { icon: "/brand/people-desk-mark.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3eee6" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1813" },
  ],
};

const INIT_SCRIPT = `(function(){try{var d=document.documentElement;var t=localStorage.getItem("people-desk:theme")||"auto";var dark=t==="dark"||(t==="auto"&&window.matchMedia("(prefers-color-scheme: dark)").matches);d.dataset.theme=dark?"dark":"light";d.dataset.themePreference=t;var dn=localStorage.getItem("people-desk:density");d.dataset.density=dn==="compact"?"compact":"normal";var l=localStorage.getItem("people-desk:locale");if(!l){l=(navigator.language||"fr").toLowerCase().indexOf("en")===0?"en":"fr";}d.lang=l;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
      </head>
      <body>
        <PrefsProvider>
          <StoreProvider>
            <ToastProvider><SecureWorkspaceGate>{children}</SecureWorkspaceGate></ToastProvider>
          </StoreProvider>
        </PrefsProvider>
      </body>
    </html>
  );
}
