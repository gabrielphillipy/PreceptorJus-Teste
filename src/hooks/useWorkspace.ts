import { useCallback, useEffect, useState } from "react";

import {
  type SavedStudy,
  type SavedExam,
  type SavedFeedback,
  type Workspace,
  addExam,
  addFeedback,
  fetchRemoteWorkspace,
  loadWorkspace,
  removeStudy,
  saveWorkspace,
  syncExam,
  syncFeedback,
  syncStudy,
  syncStudyDelete,
  updateStudy,
  upsertStudy,
} from "@/lib/workspace";

// ── Estado em módulo (sobrevive a remontagens sem re-fetch) ────────────────

let cached: Workspace | null = null;
let syncedFromRemote = false;
const listeners = new Set<() => void>();

function read(): Workspace {
  if (!cached) cached = loadWorkspace();
  return cached;
}

function commit(next: Workspace) {
  cached = next;
  saveWorkspace(next);
  listeners.forEach((cb) => cb());
}

// ── Merge ao receber dados do Supabase ─────────────────────────────────────

function mergeRemote(remote: Pick<Workspace, "studies" | "exams">) {
  const local = read();

  const localStudyIds = new Set(local.studies.map((s) => s.id));
  const newStudies = remote.studies.filter((s) => !localStudyIds.has(s.id));

  const localExamIds = new Set(local.exams.map((e) => e.id));
  const newExams = remote.exams.filter((e) => !localExamIds.has(e.id));

  if (newStudies.length === 0 && newExams.length === 0) return;

  commit({
    ...local,
    studies: [...local.studies, ...newStudies].slice(0, 30),
    exams:   [...local.exams,   ...newExams].slice(0, 30),
  });
}

// ── Hook principal ─────────────────────────────────────────────────────────

/**
 * Hook simples (sem Context) — fonte de verdade em memória + localStorage,
 * com sync em background para o Supabase.
 */
export function useWorkspace() {
  const [, force] = useState(0);

  useEffect(() => {
    const cb = () => force((n) => n + 1);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  // Carrega dados do Supabase uma única vez por sessão de página.
  useEffect(() => {
    if (syncedFromRemote) return;
    syncedFromRemote = true;
    fetchRemoteWorkspace().then((remote) => {
      if (remote) mergeRemote(remote);
    });
  }, []);

  const ws = read();

  const saveStudy = useCallback((study: SavedStudy) => {
    commit(upsertStudy(read(), study));
    syncStudy(study);
  }, []);

  const editStudy = useCallback(
    (id: string, updater: (s: SavedStudy) => SavedStudy) => {
      const next = updateStudy(read(), id, updater);
      commit(next);
      const updated = next.studies.find((s) => s.id === id);
      if (updated) syncStudy(updated);
    },
    [],
  );

  const deleteStudy = useCallback((id: string) => {
    commit(removeStudy(read(), id));
    syncStudyDelete(id);
  }, []);

  const saveExam = useCallback((exam: SavedExam) => {
    commit(addExam(read(), exam));
    syncExam(exam);
  }, []);

  const saveFeedback = useCallback((fb: SavedFeedback) => {
    commit(addFeedback(read(), fb));
    syncFeedback(fb);
  }, []);

  return {
    studies:      ws.studies,
    exams:        ws.exams,
    feedbacks:    ws.feedbacks,
    saveStudy,
    editStudy,
    deleteStudy,
    saveExam,
    saveFeedback,
  };
}

export function useStudyStats() {
  const { studies, exams } = useWorkspace();
  const totalAnswers = exams.reduce((acc, e) => acc + Number(e.total  || 0), 0);
  const totalCorrect = exams.reduce((acc, e) => acc + Number(e.correct || 0), 0);
  const accuracy = totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
  return {
    studies:     studies.length,
    exams:       exams.length,
    accuracy,
    latestStudy: studies[0],
  };
}
