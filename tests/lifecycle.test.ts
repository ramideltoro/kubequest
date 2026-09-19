import test from "node:test";
import assert from "node:assert/strict";
import { Lab } from "../server/lab.ts";
test("Startup cleans orphans and idle expiry stops a session; activity extends it", async (t) => {
  t.mock.timers.enable({ apis: ["Date", "setInterval"], now: 1000 });
  class ControlledLab extends Lab {
    destroyed = 0;
    get available() {
      return true;
    }
    async destroy() {
      this.destroyed++;
    }
  }
  const lab = new ControlledLab();
  await lab.initialize();
  assert.equal(lab.destroyed, 1);
  lab.session = {
    id: "test",
    missionId: "lost-in-routing",
    mode: "guided",
    status: "ready",
    startedAt: 1000,
    lastActivity: 1000,
    expiresAt: 1000 + 30 * 60 * 1000,
    deadline: null,
    message: "",
  };
  t.mock.timers.tick(29 * 60 * 1000);
  assert.ok(lab.session);
  lab.touch();
  const extended = lab.session!.expiresAt;
  assert.equal(extended, Date.now() + 30 * 60 * 1000);
  t.mock.timers.tick(29 * 60 * 1000);
  assert.ok(lab.session);
  t.mock.timers.tick(61000);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(lab.session, null);
  assert.equal(lab.destroyed, 2);
  if (lab.timer) clearInterval(lab.timer);
});
