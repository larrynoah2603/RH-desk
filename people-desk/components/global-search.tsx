"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { STAGE_LABELS, label } from "@/lib/domain/labels";
import { usePrefs } from "@/lib/i18n";
import { useWorkspaceData } from "@/lib/storage/store";

type Hit = { id: string; href: string; kind: "job" | "candidate"; title: string; meta: string };

export function GlobalSearch() {
  const { locale, t } = usePrefs();
  const data = useWorkspaceData();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsId = useId();
  const term = query.trim().toLowerCase();

  const hits = useMemo<Hit[]>(() => {
    if (term.length < 2) return [];
    const jobTitle = new Map(data.jobs.map((job) => [job.id, job.title]));
    const jobs: Hit[] = data.jobs
      .filter((job) => `${job.title} ${job.department} ${job.location} ${job.skills.join(" ")}`.toLowerCase().includes(term))
      .slice(0, 4)
      .map((job) => ({ id: job.id, href: "/jobs", kind: "job", title: job.title, meta: `${job.department} · ${job.location}` }));
    const candidates: Hit[] = data.candidates
      .filter((candidate) => `${candidate.name} ${candidate.email} ${candidate.skills.join(" ")}`.toLowerCase().includes(term))
      .slice(0, 6)
      .map((candidate) => ({ id: candidate.id, href: "/candidates", kind: "candidate", title: candidate.name, meta: `${jobTitle.get(candidate.jobId) ?? ""} · ${label(STAGE_LABELS, candidate.stage, locale)}` }));
    return [...jobs, ...candidates];
  }, [data.candidates, data.jobs, locale, term]);

  const hasPanel = open && term.length >= 2;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setExpanded(true);
        setOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function go(hit: Hit) {
    setOpen(false);
    setExpanded(false);
    setQuery("");
    router.push(hit.href as Parameters<typeof router.push>[0]);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const hit = hits[selected] ?? hits[0];
    if (hit) go(hit);
  }

  return (
    <div ref={ref} className="kit-search">
      <form onSubmit={submit} className={`kit-search-form${expanded ? " kit-search-open" : ""}`} role="search">
        <button type="button" className="kit-search-trigger" onClick={() => { setExpanded(true); setOpen(true); window.setTimeout(() => inputRef.current?.focus(), 0); }} aria-label={t.topbar.openSearch}>
          <Icon name="search" />
        </button>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setSelected(0); setExpanded(true); setOpen(true); }}
          onFocus={() => setExpanded(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setSelected((index) => Math.min(index + 1, Math.max(0, hits.length - 1))); }
            if (event.key === "ArrowUp") { event.preventDefault(); setSelected((index) => Math.max(0, index - 1)); }
            if (event.key === "Escape") { setOpen(false); setQuery(""); }
          }}
          placeholder={t.topbar.search}
          aria-label={t.topbar.search}
          aria-controls={hasPanel ? resultsId : undefined}
          aria-expanded={hasPanel}
        />
        {expanded ? (
          <button type="button" className="kit-search-clear" onClick={() => { setOpen(false); setExpanded(false); setQuery(""); }} aria-label={t.common.close}><Icon name="x" /></button>
        ) : <kbd className="kit-kbd kit-hide-mobile">{t.topbar.searchShortcut}</kbd>}
      </form>
      {hasPanel ? (
        <div id={resultsId} className="kit-popover kit-popover-full kit-popover-pad" role="listbox" aria-label={t.topbar.searchResults}>
          {!hits.length ? <p role="status" className="kit-search-message">{t.topbar.noSearchResults}</p> : null}
          {(["job", "candidate"] as const).map((kind) => {
            const group = hits.filter((hit) => hit.kind === kind);
            if (!group.length) return null;
            return (
              <div key={kind}>
                <p className="kit-search-section">{kind === "job" ? t.topbar.jobs : t.topbar.candidates}</p>
                {group.map((hit) => {
                  const index = hits.indexOf(hit);
                  return (
                    <button key={`${kind}-${hit.id}`} type="button" role="option" aria-selected={index === selected} className="kit-search-hit" onMouseEnter={() => setSelected(index)} onClick={() => go(hit)}>
                      <span className="kit-search-kind"><Icon name={kind === "job" ? "briefcase" : "user"} /></span>
                      <span className="kit-search-hit-text">
                        <span className="kit-search-title">{hit.title}</span>
                        <span className="kit-search-meta">{hit.meta}</span>
                      </span>
                      <span className="kit-search-open-hint">{t.common.open}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
