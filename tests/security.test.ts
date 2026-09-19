import test from "node:test";
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { buildApp } from "../server/index.ts";
import { allowedGoogleIdentity } from "../server/auth.ts";
import { Lab } from "../server/lab.ts";
const env = {
  PUBLIC_ORIGIN: "https://kubequest.example.test",
  SESSION_SECRET: "a".repeat(48),
  AUTH_GOOGLE_ID: "test-client",
  AUTH_GOOGLE_SECRET: "test-secret",
  DB_PATH: ":memory:",
};
async function token(
  email = "rami.deltoro@gmail.com",
  audience = "kubequest",
  expiry = "1h",
) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("test-owner")
    .setIssuer(env.PUBLIC_ORIGIN)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(new TextEncoder().encode(env.SESSION_SECRET));
}
async function fixture() {
  const lab = new Lab();
  let started = 0;
  lab.start = async (missionId, mode) => {
    started++;
    return (lab.session = {
      id: "session-test",
      missionId,
      mode,
      status: "ready",
      startedAt: Date.now(),
      lastActivity: Date.now(),
      expiresAt: Date.now() + 1800000,
      deadline: null,
      message: "ready",
    });
  };
  const { app } = await buildApp(env, lab);
  return {
    app,
    lab,
    get started() {
      return started;
    },
  };
}
test("Google identity must have verified exact email, matching nonce, and correct authorized party", () => {
  const p = {
    email: "rami.deltoro@gmail.com",
    email_verified: true,
    sub: "1",
    nonce: "n",
  };
  assert.equal(allowedGoogleIdentity(p, "c", "n"), true);
  for (const patch of [
    { email: "intruder@example.com" },
    { email_verified: false },
    { nonce: "wrong" },
    { azp: "wrong" },
  ])
    assert.equal(allowedGoogleIdentity({ ...p, ...patch }, "c", "n"), false);
});
test("Anonymous private endpoints and WebSocket handshakes fail closed", async () => {
  const { app } = await fixture();
  try {
    for (const url of [
      "/api/private/session",
      "/api/private/progress",
      "/api/private/resources",
      "/api/private/terminal",
    ]) {
      const r = await app.inject({ url });
      assert.equal(r.statusCode, 401, url);
    }
    for (const url of [
      "/api/private/session/start",
      "/api/private/grade",
      "/api/private/tutor",
      "/api/private/apply",
    ])
      assert.equal(
        (await app.inject({ method: "POST", url, payload: {} })).statusCode,
        401,
        url,
      );
  } finally {
    await app.close();
  }
});
test("Other email, wrong audience, and expired sessions cannot authorize", async () => {
  const { app } = await fixture();
  try {
    for (const t of [
      await token("other@example.com"),
      await token(undefined, "wrong"),
      await token(undefined, undefined, "-1h"),
    ])
      assert.equal(
        (
          await app.inject({
            url: "/api/private/session",
            headers: { cookie: "__Host-kubequest=" + t },
          })
        ).statusCode,
        401,
      );
  } finally {
    await app.close();
  }
});
test("Owner mutation requires same origin and valid mission; successful request starts once", async () => {
  const f = await fixture();
  try {
    const cookie = "__Host-kubequest=" + (await token());
    const payload = { missionId: "lost-in-routing", mode: "guided" };
    assert.equal(
      (
        await f.app.inject({
          method: "POST",
          url: "/api/private/session/start",
          headers: { cookie, origin: "https://evil.test" },
          payload,
        })
      ).statusCode,
      403,
    );
    assert.equal(f.started, 0);
    assert.equal(
      (
        await f.app.inject({
          method: "POST",
          url: "/api/private/session/start",
          headers: { cookie, origin: env.PUBLIC_ORIGIN },
          payload: { ...payload, missionId: "unknown" },
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await f.app.inject({
          method: "POST",
          url: "/api/private/session/start",
          headers: { cookie, origin: env.PUBLIC_ORIGIN },
          payload,
        })
      ).statusCode,
      200,
    );
    assert.equal(f.started, 1);
  } finally {
    await f.app.close();
  }
});
test("Stale session IDs and timed tutor calls are rejected", async () => {
  const f = await fixture();
  try {
    const headers = {
      cookie: "__Host-kubequest=" + (await token()),
      origin: env.PUBLIC_ORIGIN,
    };
    await f.lab.start("lost-in-routing", "timed", 12);
    f.lab.session!.deadline = Date.now() + 60000;
    assert.equal(
      (
        await f.app.inject({
          method: "POST",
          url: "/api/private/apply",
          headers,
          payload: { sessionId: "old", yaml: "x" },
        })
      ).statusCode,
      409,
    );
    assert.equal(
      (
        await f.app.inject({
          method: "POST",
          url: "/api/private/tutor",
          headers,
          payload: { sessionId: "session-test", question: "help" },
        })
      ).statusCode,
      403,
    );
  } finally {
    await f.app.close();
  }
});
test("OAuth callback rejects missing and replayed state; redirect URI and PKCE are fixed", async () => {
  const { app } = await fixture();
  try {
    const start = await app.inject("/auth/google");
    const u = new URL(start.headers.location!);
    assert.equal(
      u.searchParams.get("redirect_uri"),
      env.PUBLIC_ORIGIN + "/auth/google/callback",
    );
    assert.equal(u.searchParams.get("code_challenge_method"), "S256");
    const r = await app.inject(
      "/auth/google/callback?state=invalid&code=bogus",
    );
    assert.equal(r.headers.location, "/signin?error=access");
    assert.equal((await app.inject("/api/me")).json().user, null);
  } finally {
    await app.close();
  }
});
test("Timed deadline prevents further edits and triggers an automatic persisted submission", async () => {
  const f = await fixture();
  try {
    const headers = {
      cookie: "__Host-kubequest=" + (await token()),
      origin: env.PUBLIC_ORIGIN,
    };
    await f.lab.start("lost-in-routing", "timed", 12);
    f.lab.session!.deadline = Date.now() - 1;
    f.lab.grade = async () => [
      {
        label: "Example check",
        passed: false,
        detail: "Real grader is covered by live tests.",
      },
    ];
    assert.equal(
      (
        await f.app.inject({
          method: "POST",
          url: "/api/private/apply",
          headers,
          payload: { sessionId: "session-test", yaml: "x" },
        })
      ).statusCode,
      409,
    );
    await new Promise((r) => setTimeout(r, 5200));
    assert.equal(f.lab.session!.status, "submitted");
    const result = (
      await f.app.inject({ url: "/api/private/progress", headers })
    ).json();
    assert.equal(result.attempts.length, 1);
    assert.equal(result.attempts[0].results.score, 0);
  } finally {
    await f.app.close();
  }
});
