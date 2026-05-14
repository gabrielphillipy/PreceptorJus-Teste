import { useCallback, useEffect, useState } from "react";

import {
  type SavedStudy,
  type SavedExam,
  type SavedFeedback,
  type Workspace,
  addExam,
  addFeedback,
  loadWorkspace,
  removeStudy,
  saveWorkspace,
  updateStudy,
  upsertStudy,
} from "@/lib/workspace";

let cached: Workspace | null = null;
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

/**
 * Hook simples (sem Context) — fonte de verdade em memória + localStorage.
 * Suficiente para o estado atual; migra para Zustand/Query quando crescer.
 */
export function useWorkspace() {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force((n) => n + 1);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const ws = read();

  const saveStudy = useCallback((study: SavedStudy) => commit(upsertStudy(read(), study)), []);
  const editStudy = useCallback(
    (id: string, updater: (s: SavedStudy) => SavedStudy) => commit(updateStudy(read(), id, updater)),
    [],
  );
  const deleteStudy = useCallback((id: string) => commit(removeStudy(read(), id)), []);
  const saveExam = useCallback((exam: SavedExam) => commit(addExam(read(), exam)), []);
  const saveFeedback = useCallback((fb: SavedFeedback) => commit(addFeedback(read(), fb)), []);

  return {
    studies: ws.studies,
    exams: ws.exams,
    feedbacks: ws.feedbacks,
    saveStudy,
    editStudy,
    deleteStudy,
    saveExam,
    saveFeedback,
  };
}

export function useStudyStats() {
  const { studies, exams } = useWorkspace();
  const totalAnswers = exams.reduce((acc, e) => acc + Number(e.total || 0), 0);
  const totalCorrect = exams.reduce((acc, e) => acc + Number(e.correct || 0), 0);
  const accuracy = totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
  return {
    studies: studies.length,
    exams: exams.length,
    accuracy,
    latestStudy: studies[0],
  };
}
