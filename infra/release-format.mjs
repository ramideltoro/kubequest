export function releaseId(value) {
  if (!/^[a-f0-9]{40}$/.test(value || ""))
    throw Error("Expected a full 40-character commit SHA");
  return value;
}
export function validateArchive(names, listing) {
  const entries = names.trim().split("\n");
  if (entries.length > 12000) throw Error("Too many archive entries");
  for (const name of entries) {
    if (
      !/^[A-Za-z0-9_./@+ -]+$/.test(name) ||
      name.startsWith("/") ||
      name.split("/").some((p) => p === ".." || p === ".")
    )
      throw Error("Unsafe archive path");
    if (
      !/^(dist\/|server\/|content\/|infra\/|package\.json$|package-lock\.json$|RELEASE\.json$)/.test(
        name,
      )
    )
      throw Error("Unexpected archive entry");
  }
  for (const required of [
    "dist/index.html",
    "server/index.ts",
    "package.json",
    "package-lock.json",
    "RELEASE.json",
  ])
    if (!entries.includes(required)) throw Error("Incomplete release");
  let total = 0;
  const lines = listing.trim().split("\n");
  if (lines.length !== entries.length) throw Error("Ambiguous archive listing");
  for (const line of lines) {
    const match = line.match(/^([-d])[rwxstST-]{9}\s+\S+\s+(\d+)\s/);
    if (!match) throw Error("Only regular files and directories are permitted");
    total += Number(match[2]);
  }
  if (total > 400 * 1024 * 1024) throw Error("Expanded release exceeds limit");
  return entries;
}
