import { createContext, useContext } from "react";
export type Me = {
  user: { email: string; sub: string } | null;
  authConfigured: boolean;
  labAvailable: boolean;
};
export const Identity = createContext<Me>({
  user: null,
  authConfigured: false,
  labAvailable: false,
});
export const useIdentity = () => useContext(Identity);
export async function api(path: string, body?: unknown) {
  const r = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw Error(j.error || "Request failed");
  return j;
}
export function completedLessons(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem("kubequest-progress") || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
export function completeLesson(id: string) {
  try {
    localStorage.setItem(
      "kubequest-progress",
      JSON.stringify([...new Set([...completedLessons(), id])]),
    );
  } catch {}
}
