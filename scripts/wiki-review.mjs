export function requiresWikiReview(paths) {
  return paths.some((p) =>
    /^(src\/|server\/|content\/|infra\/|\.github\/workflows\/)/.test(p),
  );
}
export function validateWikiReview(current, previous, paths) {
  if (!/^[a-f0-9]{40}$/.test(current?.revision || ""))
    throw Error("wiki-review.json must name a full reviewed wiki commit");
  if (typeof current.summary !== "string" || current.summary.trim().length < 30)
    throw Error(
      "Describe the reviewed documentation changes in wiki-review.json",
    );
  if (requiresWikiReview(paths) && current.revision === previous?.revision)
    throw Error(
      "Application changes require updated authored documentation in kubequest-wiki and a new wiki-review.json revision.",
    );
  return requiresWikiReview(paths);
}
