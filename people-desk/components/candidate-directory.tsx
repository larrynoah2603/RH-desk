"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpDown, CalendarDays, ChevronLeft, ChevronRight, Mail, MapPin, NotebookPen, Pencil, Trash2, UsersRound, X } from "lucide-react";
import { STAGES, type Candidate, type Locale, type PeopleDeskData, type Stage } from "@/lib/domain/types";
import { SOURCE_LABELS, STAGE_LABELS, formatDate, initials } from "@/lib/domain/labels";
import "./candidate-directory.css";

type Props = {
  data: PeopleDeskData;
  candidates: Candidate[];
  locale: Locale;
  canWrite: boolean;
  onEdit: (candidate: Candidate) => void;
  onRemove: (id: string) => void;
  onStageChange: (id: string, stage: Stage) => void;
  onAddNote: (id: string, text: string) => void;
};

const PAGE_SIZE = 10;
type SortMode = "recent" | "oldest" | "name" | "stage";

export function CandidateDirectory({ data, candidates, locale, canWrite, onEdit, onRemove, onStageChange, onAddNote }: Props) {
  const [sort, setSort] = useState<SortMode>("recent");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const selected = selectedId ? data.candidates.find(candidate => candidate.id === selectedId) : null;
  const ordered = [...candidates].sort((a,b) => {
    switch(sort) {
      case "oldest": return Date.parse(a.createdAt) - Date.parse(b.createdAt);
      case "name": return a.name.localeCompare(b.name, locale);
      case "stage": return STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage) || a.name.localeCompare(b.name, locale);
      default: return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    }
  });
  const maxPage = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const visiblePage = Math.min(page, maxPage);
  const visible = ordered.slice((visiblePage - 1) * PAGE_SIZE, visiblePage * PAGE_SIZE);
  const jobName = (id: string) => data.jobs.find(job=>job.id===id)?.title ?? "Poste non défini";
  const stageName = (stage: Stage) => STAGE_LABELS[stage]?.[locale] ?? stage;
  const close = () => { setSelectedId(null); setNote(""); window.requestAnimationFrame(()=>previousFocus.current?.focus()); };
  const open = (candidate: Candidate, trigger: HTMLElement) => { previousFocus.current=trigger; setSelectedId(candidate.id); setNote(""); };

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (event: KeyboardEvent) => {if(event.key === "Escape"){setSelectedId(null);window.requestAnimationFrame(()=>previousFocus.current?.focus());}};
    window.addEventListener("keydown", onKey);
    const raf = window.requestAnimationFrame(()=>closeRef.current?.focus());
    return () => {window.removeEventListener("keydown", onKey);window.cancelAnimationFrame(raf);};
  }, [selectedId]);

  return (
    <section className="rh-directory" aria-label="Répertoire des candidatures">
      <div className="rh-directory-head">
        <div><span className="rh-directory-count">{candidates.length}</span> candidature{candidates.length>1?"s":""} affichée{candidates.length>1?"s":""}</div>
        <label className="rh-directory-sort"><ArrowUpDown size={15} aria-hidden="true"/><span className="sr-only">Trier les candidats</span><select aria-label="Trier les candidats" value={sort} onChange={event=>{setSort(event.target.value as SortMode);setPage(1);}}>
          <option value="recent">Plus récents</option>
          <option value="oldest">Plus anciens</option>
          <option value="name">Nom A à Z</option>
          <option value="stage">Étape du parcours</option>
        </select></label>
      </div>
      <div className="rh-directory-scroll">
        <table className="rh-directory-table">
          <thead><tr><th scope="col">Candidat</th><th scope="col">Poste concerné</th><th scope="col">Étape actuelle</th><th scope="col">Inscription</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{visible.map(candidate=>(
            <tr key={candidate.id}>
              <td>
                <div className="rh-directory-person">
                  <div className="rh-directory-avatar" aria-hidden="true">{initials(candidate.name)}</div>
                  <div className="rh-directory-person-text"><strong>{candidate.name}</strong><small>{candidate.email}</small></div>
                </div>
              </td>
              <td><span className="rh-directory-role">{jobName(candidate.jobId)}</span>{candidate.location && <small className="rh-directory-sub">{candidate.location}</small>}</td>
              <td><span className={`rh-directory-stage rh-directory-stage-${candidate.stage}`}><span aria-hidden="true"/>{stageName(candidate.stage)}</span></td>
              <td><span className="rh-directory-date">{formatDate(candidate.createdAt,locale)}</span></td>
              <td className="rh-directory-actions"><button type="button" onClick={event=>open(candidate,event.currentTarget)}>Voir la fiche <ChevronRight size={15} aria-hidden="true"/></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {ordered.length === 0 && <div className="rh-directory-empty"><UsersRound size={24} aria-hidden="true"/><p>Aucun candidat ne correspond aux filtres.</p></div>}
      {maxPage > 1 && (
        <nav aria-label="Pagination des candidatures" className="rh-directory-pagination">
          <span>Page {visiblePage} sur {maxPage}</span>
          <div><button type="button" disabled={visiblePage===1} onClick={()=>setPage(p=>Math.max(1,p-1))} aria-label="Page précédente"><ChevronLeft size={17}/></button>
          <button type="button" disabled={visiblePage===maxPage} onClick={()=>setPage(p=>Math.min(maxPage,p+1))} aria-label="Page suivante"><ChevronRight size={17}/></button></div>
        </nav>
      )}
      {selected && (
        <div className="rh-directory-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}>
          <aside className="rh-directory-sheet" role="dialog" aria-modal="true" aria-labelledby="rh-directory-sheet-title" aria-describedby="rh-directory-sheet-description">
            <div className="rh-directory-sheet-top"><span>FICHE CANDIDAT</span><button ref={closeRef} aria-label="Fermer la fiche candidat" onClick={close} type="button"><X size={19}/></button></div>
            <div className="rh-directory-sheet-intro">
              <div className="rh-directory-sheet-avatar" aria-hidden="true">{initials(selected.name)}</div>
              <h2 id="rh-directory-sheet-title">{selected.name}</h2>
              <p id="rh-directory-sheet-description">{jobName(selected.jobId)}</p>
              <span className={`rh-directory-stage rh-directory-stage-${selected.stage}`}><span aria-hidden="true"/>{stageName(selected.stage)}</span>
            </div>
            <div className="rh-directory-sheet-content">
              <section className="rh-directory-details">
                <h3>Coordonnées</h3>
                <a href={`mailto:${selected.email}`}><Mail size={16} aria-hidden="true"/>{selected.email}</a>
                {selected.location && <p><MapPin size={16} aria-hidden="true"/>{selected.location}</p>}
                <p><CalendarDays size={16} aria-hidden="true"/>Candidature : {formatDate(selected.createdAt,locale)}</p>
                <p><strong>Source : </strong>{SOURCE_LABELS[selected.source]?.[locale]??selected.source}</p>
              </section>
              {canWrite && <section><h3>Faire évoluer le dossier</h3>
                <label className="rh-directory-select-label">Étape du recrutement
                  <select aria-label={`Étape de ${selected.name}`} value={selected.stage} onChange={event=>onStageChange(selected.id,event.target.value as Stage)}>
                    {STAGES.map(stage=><option value={stage} key={stage}>{stageName(stage)}</option>)}
                  </select>
                </label>
              </section>}
              {(selected.summary || selected.skills.length > 0) && <section><h3>Profil</h3>{selected.summary && <p className="rh-directory-summary">{selected.summary}</p>}
                {selected.skills.length>0 && <div className="rh-directory-skills">{selected.skills.map((skill,index)=><span key={`${skill}-${index}`}>{skill}</span>)}</div>}
              </section>}
              <section><h3>Historique du recrutement</h3><ol className="rh-directory-history">{[...selected.stageHistory].reverse().map((event,index)=>(
                <li key={`${event.at}-${index}`}><span className="rh-directory-history-dot"/><div><strong>{stageName(event.stage)}</strong><small>{formatDate(event.at,locale)}</small>{event.note&&<p>{event.note}</p>}</div></li>
              ))}</ol></section>
              <section><h3>Notes internes ({selected.notes.length})</h3>
                {selected.notes.length===0?<p className="rh-directory-placeholder">Aucune note ajoutée.</p>:<div className="rh-directory-notes">{[...selected.notes].reverse().map(item=><div key={item.id}><p>{item.text}</p><small>{formatDate(item.at,locale)}</small></div>)}</div>}
                {canWrite && <form onSubmit={e=>{e.preventDefault();if(!note.trim())return;onAddNote(selected.id,note.trim());setNote("");}}>
                  <label htmlFor="candidate-note">Ajouter une note</label>
                  <textarea id="candidate-note" maxLength={2000} placeholder="Compte rendu, suivi, information utile…" value={note} onChange={e=>setNote(e.target.value)} rows={3}/>
                  <button type="submit" disabled={!note.trim()}><NotebookPen size={15} aria-hidden="true"/> Ajouter la note</button>
                </form>}
              </section>
            </div>
            {canWrite && <div className="rh-directory-sheet-foot">
              <button type="button" className="rh-directory-edit" onClick={()=>{close();onEdit(selected);}}><Pencil size={16} aria-hidden="true"/> Modifier</button>
              <button type="button" className="rh-directory-delete" onClick={()=>{close();onRemove(selected.id);}}><Trash2 size={16} aria-hidden="true"/> Supprimer</button>
            </div>}
          </aside>
        </div>
      )}
    </section>
  );
}
