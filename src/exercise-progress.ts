import { useSyncExternalStore } from "react";
import index from "../content/ckad-index.json";
export type ExerciseStatus = "practiced" | "review";
const key = "kubequest-exercises-v1";
const validIds = new Set(index.exercises.map((e) => e.id));
let cachedRaw: string | null | undefined;
let cached: Record<string, ExerciseStatus> = {};
export function parseProgress(
  raw: string | null,
): Record<string, ExerciseStatus> {
  try {
    const value = JSON.parse(raw || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([id, status]) =>
          validIds.has(id) && (status === "practiced" || status === "review"),
      ),
    ) as Record<string, ExerciseStatus>;
  } catch {
    return {};
  }
}
function snapshot() {
  let raw = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    /* Storage may be unavailable. */
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parseProgress(raw);
  }
  return cached;
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("kubequest-exercise-progress", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("kubequest-exercise-progress", callback);
  };
}
export function useExerciseProgress() {
  const progress = useSyncExternalStore(subscribe, snapshot);
  function setStatus(id: string, status?: ExerciseStatus) {
    const next = { ...snapshot() };
    if (status) next[id] = status;
    else delete next[id];
    try {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event("kubequest-exercise-progress"));
      return true;
    } catch {
      return false;
    }
  }
  return { progress, setStatus };
}
