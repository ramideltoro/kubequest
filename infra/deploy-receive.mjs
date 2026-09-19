#!/usr/bin/node
import { spawnSync } from "node:child_process";
const command = process.env.SSH_ORIGINAL_COMMAND || "";
const match = /^(deploy|rollback) ([a-f0-9]{40})$/.exec(command);
if (!match) {
  console.error("Only deploy or rollback with a full commit SHA is allowed.");
  process.exit(64);
}
const result = spawnSync(
  "/usr/bin/sudo",
  ["-n", "/usr/local/libexec/kubequest-deploy", match[1], match[2]],
  { stdio: "inherit", env: { PATH: "/usr/sbin:/usr/bin:/sbin:/bin" } },
);
process.exit(result.status ?? 1);
