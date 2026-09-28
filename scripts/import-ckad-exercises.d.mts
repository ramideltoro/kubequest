export const topics: string[][];
export function splitHeadings(
  markdown: string,
): { level: number; title: string; line: number; lines: string[] }[];
export function cleanWrappers(markdown: string): string;
export function buildLibrary(): typeof import("../content/ckad-exercises.json");
