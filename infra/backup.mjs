import { DatabaseSync, backup } from "node:sqlite";
import fs from "node:fs/promises";
const root = process.env.KUBEQUEST_DATA || "/var/lib/kubequest";
const dir = root + "/backups";
await fs.mkdir(dir, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(root + "/kubequest.sqlite", { readOnly: true });
const target =
  dir +
  "/progress-" +
  new Date().toISOString().replace(/[:.]/g, "-") +
  ".sqlite";
await backup(db, target);
db.close();
await fs.chmod(target, 0o600);
const check = new DatabaseSync(target, { readOnly: true });
if (check.prepare("PRAGMA integrity_check").get().integrity_check !== "ok")
  throw Error("Backup integrity check failed");
check.close();
const files = (await fs.readdir(dir))
  .filter((x) => /^progress-.*\.sqlite$/.test(x))
  .sort()
  .reverse();
for (const f of files.slice(14)) await fs.unlink(dir + "/" + f);
console.log("Progress backup verified.");
