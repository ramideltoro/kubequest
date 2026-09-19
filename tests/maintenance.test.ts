import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { SignJWT } from "jose";
import { buildApp } from "../server/index.ts";
import { Lab } from "../server/lab.ts";
test("Maintenance blocks new starts and resets but preserves current session inspection", async () => {
  const dir = mkdtempSync(tmpdir() + "/kubequest-maintenance-");
  const marker = dir + "/marker";
  writeFileSync(marker, "deploy");
  const env = {
    PUBLIC_ORIGIN: "https://kubequest.example.test",
    AUTH_GOOGLE_ID: "test-client",
    AUTH_GOOGLE_SECRET: "test-secret",
    SESSION_SECRET: "x".repeat(48),
    DB_PATH: ":memory:",
    DEPLOYMENT_MARKER: marker,
  };
  const lab = new Lab();
  const { app } = await buildApp(env, lab);
  const jwt = await new SignJWT({ email: "rami.deltoro@gmail.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("owner")
    .setIssuer(env.PUBLIC_ORIGIN)
    .setAudience("kubequest")
    .setIssuedAt()
    .setExpirationTime("1m")
    .sign(new TextEncoder().encode(env.SESSION_SECRET));
  const headers = {
    cookie: "__Host-kubequest=" + jwt,
    origin: env.PUBLIC_ORIGIN,
  };
  try {
    for (const route of ["start", "reset"]) {
      const r = await app.inject({
        method: "POST",
        url: "/api/private/session/" + route,
        headers,
        payload: { missionId: "lost-in-routing", mode: "guided" },
      });
      assert.equal(r.statusCode, 503);
      assert.equal(r.headers["retry-after"], "30");
    }
    assert.equal(
      (await app.inject({ url: "/api/private/session", headers })).statusCode,
      200,
    );
    assert.equal(lab.session, null);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
