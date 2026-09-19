export type WikiReview = { revision: string; summary: string };
export function requiresWikiReview(paths: string[]): boolean;
export function validateWikiReview(current: WikiReview, previous: WikiReview | null, paths: string[]): boolean;
