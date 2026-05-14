/**
 * Workspace persistido em localStorage.
 * Continua usando a mesma key que o legacy ('preceptorjus_workspace') para
 * permitir migração transparente de quem usava a v1.
 */

import type { StudyMode } from "@/lib/api";

const STORAGE_KEY = "preceptorjus_workspace";

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

export function loadWorkspace(): Workspace {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      studies: Array.isArray(parsed.studies) ? parsed.studies : [],
      exams: Array.isArray(parsed.exams) ? parsed.exams : [],
      feedbacks: Array.isArray(parsed.feedbacks) ? parsed.feedbacks : [],
    };
  } catch {
    return { studies: [], exams: [], feedbacks: [] };
  }
}

export function saveWorkspace(ws: Workspace): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ws));
}

export function upsertStudy(ws: Workspace, study: SavedStudy): Workspace {
  const filtered = ws.studies.filter((s) => s.topic !== study.topic);
  return { ...ws, studies: [study, ...filtered].slice(0, 30) };
}

export function updateStudy(ws: Workspace, id: string, updater: (s: SavedStudy) => SavedStudy): Workspace {
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
