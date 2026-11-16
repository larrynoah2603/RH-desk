"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { IS_REMOTE_MODE, useRemoteStatus, useStore, type AccessRole } from "@/lib/storage/store";
import type { PeopleDeskData } from "@/lib/domain/types";
import { downloadFile, serializeData, todayStamp } from "@/lib/storage/export";
import "./secure-workspace-gate.css";

type Phase = "checking" | "login" | "ready" | "error";
type WorkspaceResponse = {
  data?: PeopleDeskData;
  revision?: number;
  role?: AccessRole;
  userEmail?: string;
  error?: string;
};

export function SecureWorkspaceGate({ children }: { children: ReactNode }) {
  const store = useStore();
  const sync = useRemoteStatus();
  const [phase, setPhase] = useState<Phase>(IS_REMOTE_MODE ? "checking" : "ready");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);
  const loadSequence = useRef(0);

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setPhase("checking");
    try {
      const response = await fetch("/api/workspace", { cache: "no-store", credentials: "same-origin" });
      const body = await response.json().catch(() => ({})) as WorkspaceResponse;
      if (sequence !== loadSequence.current) return;
      if (response.status === 401) { setPhase("login"); setError(""); return; }
      if (!response.ok || !body.data || !Number.isSafeInteger(body.revision) || !body.role) {
        setError(body.error || "L’espace RH n’est pas disponible.");
        setPhase("error");
        return;
      }
      store.hydrateRemote(body.data, body.revision!, body.role);
      setAccount(body.userEmail ?? "");
      setPhase("ready");
      setError("");
    } catch {
      if (sequence !== loadSequence.current) return;
      setError("Impossible de joindre le serveur. Vérifiez la connexion.");
      setPhase("error");
    }
  }, [store]);

  useEffect(() => {
    if (IS_REMOTE_MODE) queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    if (!IS_REMOTE_MODE || phase !== "ready") return;
    const guard = (event: BeforeUnloadEvent) => {
      if (sync.state === "saving" || sync.state === "error") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [phase, sync.state]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) { setError(result.error ?? "Connexion impossible."); return; }
      setPassword("");
      await load();
    } catch {
      setError("Le serveur de connexion est inaccessible.");
    } finally { setBusy(false); }
  }

  async function logout() {
    if ((sync.state === "saving" || sync.state === "error") &&
        !window.confirm("Des modifications ne sont pas synchronisées. Quitter quand même ?")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error("La déconnexion a échoué.");
      loadSequence.current += 1;
      store.disconnectRemote();
      setPhase("login");
      setAccount("");
    } catch {
      setError("La déconnexion n’a pas été confirmée. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  if (!IS_REMOTE_MODE) return <>{children}</>;
  if (phase === "checking") return <div className="rh-auth-page"><p role="status">Connexion sécurisée à l’espace RH…</p></div>;
  if (phase === "login") return (
    <main className="rh-auth-page">
      <form className="rh-auth-card" onSubmit={login} aria-labelledby="rh-auth-title">
        <p className="rh-auth-kicker">PEOPLE DESK · ESPACE PRIVÉ</p>
        <h1 id="rh-auth-title">Connexion à RH Desk</h1>
        <p>Accès réservé aux utilisateurs invités par l’administrateur.</p>
        <label>Adresse e-mail
          <input type="email" autoComplete="username" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>Mot de passe
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p role="alert" className="rh-auth-error">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
      </form>
    </main>
  );
  if (phase === "error") return (
    <main className="rh-auth-page">
      <section className="rh-auth-card" role="alert">
        <h1>Accès indisponible</h1><p>{error}</p>
        <div className="rh-auth-actions">
          <button onClick={() => void load()}>Réessayer</button>
          <button onClick={() => void logout()}>Changer de compte</button>
        </div>
      </section>
    </main>
  );
  return (
    <>
      <div className="rh-secure-toolbar" role="status">
        <span>ESPACE CONNECTÉ · {sync.role === "viewer" ? "Lecture seule" : sync.role === "admin" ? "Administrateur" : "Recruteur"}
          {account ? " · " + account : ""}</span>
        <button type="button" onClick={() => void logout()} disabled={busy}>Déconnexion</button>
      </div>
      {error && <div className="rh-sync-bar rh-sync-error" role="alert">{error}</div>}
      {(sync.state === "saving" || sync.state === "error") && (
        <div className={"rh-sync-bar" + (sync.state === "error" ? " rh-sync-error" : "")} role={sync.state === "error" ? "alert" : "status"}>
          <span>{sync.state === "saving" ? "Enregistrement sur le serveur…" : sync.message}</span>
          {sync.state === "error" && (
            sync.conflict
              ? <div className="rh-sync-recovery">
                  <span>Conflit de version : vos modifications ne sont pas encore sauvegardées sur le serveur.</span>
                  <button type="button" onClick={() => downloadFile("rh-desk-modifications-non-enregistrees-" + todayStamp() + ".json", serializeData(store.getData()), "application/json")}>Sauvegarder mes modifications (JSON)</button>
                  <button type="button" onClick={() => window.location.reload()}>Recharger la version serveur</button>
                </div>
              : <button type="button" onClick={() => store.retryRemote()}>Réessayer la sauvegarde</button>
          )}
        </div>
      )}
      {children}
    </>
  );
}
