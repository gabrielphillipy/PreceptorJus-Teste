/**
 * Workspace persistido em localStorage (fonte de verdade imediata)
 * e sincronizado em background com o Supabase via /api/workspace.
 *
 * Continua usando a mesma key que o legacy ('preceptorjus_workspace') para
 * permitir migração transparente de quem usava a v1.
 */

import type { StudyMode } from "@/lib/api";

const STORAGE_KEY = "preceptorjus_workspace";
const DEVICE_KEY  = "preceptorjus_device_id";

export interface SavedStudy {
  id: string;
  topic: string;
  text: string;
  mode: StudyMode | "";
  modeLabel: string;
  favorite: boolean;
  excerpt: string;
  date: string;
}

export interface SavedExam {
  id: string;
  topic: string;
  difficulty: string;
  correct: number;
  total: number;
  date: string;
}

export interface SavedFeedback {
  id: string;
  type: string;
  message: string;
  contact: string;
  page: string;
  date: string;
}

export interface Workspace {
  studies: SavedStudy[];
  exams: SavedExam[];
  feedbacks: SavedFeedback[];
}

// ── Device identity (anônima, sem auth) ───────────────────────────────────

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

// ── LocalStorage ───────────────────────────────────────────────────────────

export function loadWorkspace(): Workspace {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      studies:   Array.isArray(parsed.studies)   ? parsed.studies   : [],
      exams:     Array.isArray(parsed.exams)      ? parsed.exams     : [],
      feedbacks: Array.isArray(parsed.feedbacks)  ? parsed.feedbacks : [],
    };
  } catch {
    return { studies: [], exams: [], feedbacks: [] };
  }
}

export function saveWorkspace(ws: Workspace): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ws));
}

// ── Mutadores locais ───────────────────────────────────────────────────────

export function upsertStudy(ws: Workspace, study: SavedStudy): Workspace {
  const filtered = ws.studies.filter((s) => s.topic !== study.topic);
  return { ...ws, studies: [study, ...filtered].slice(0, 30) };
}

export function updateStudy(
  ws: Workspace,
  id: string,
  updater: (s: SavedStudy) => SavedStudy,
): Workspace {
  return { ...ws, studies: ws.studies.map((s) => (s.id === id ? updater({ ...s }) : s)) };
}

export function removeStudy(ws: Workspace, id: string): Workspace {
  return { ...ws, studies: ws.studies.filter((s) => s.id !== id) };
}

export function addExam(ws: Workspace, exam: SavedExam): Workspace {
  return { ...ws, exams: [exam, ...ws.exams].slice(0, 30) };
}

export function addFeedback(ws: Workspace, feedback: SavedFeedback): Workspace {
  return { ...ws, feedbacks: [feedback, ...ws.feedbacks].slice(0, 50) };
}

// ── Sync remoto (best-effort, não bloqueia a UI) ───────────────────────────

async function postAction(action: string, payload: unknown): Promise<void> {
  try {
    await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, device_id: getDeviceId(), payload }),
    });
  } catch {
    // Sem conectividade: localStorage é suficiente, tentará na próxima vez.
  }
}

export function syncStudy(study: SavedStudy): void {
  postAction("upsert_study", study);
}

export function syncStudyDelete(id: string): void {
  postAction("delete_study", { id });
}

export function syncExam(exam: SavedExam): void {
  postAction("add_exam", exam);
}

export function syncFeedback(feedback: SavedFeedback): void {
  postAction("add_feedback", feedback);
}

// ── Carga inicial do Supabase ──────────────────────────────────────────────

export async function fetchRemoteWorkspace(): Promise<Pick<Workspace, "studies" | "exams"> | null> {
  try {
    const resp = await fetch(`/api/workspace?device_id=${getDeviceId()}`);
    if (!resp.ok) return null;
    return resp.json() as Promise<Pick<Workspace, "studies" | "exams">>;
  } catch {
    return null;
  }
}
