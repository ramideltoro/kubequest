import { randomBytes, createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import type { FastifyInstance, FastifyRequest } from "fastify";
export const ownerEmail = "rami.deltoro@gmail.com";
export function allowedGoogleIdentity(p: any, clientId: string, nonce: string) {
  return (
    p.email_verified === true &&
    p.email?.toLowerCase() === ownerEmail &&
    p.nonce === nonce &&
    typeof p.sub === "string" &&
    (!p.azp || p.azp === clientId)
  );
}
export function createAuth(env: NodeJS.ProcessEnv) {
  const origin = env.PUBLIC_ORIGIN || "http://localhost:4340";
  const secure = origin.startsWith("https:");
  const cookie = secure ? "__Host-kubequest" : "kubequest";
  const key = new TextEncoder().encode(env.SESSION_SECRET || "");
  const configured =
    key.length >= 32 && !!env.AUTH_GOOGLE_ID && !!env.AUTH_GOOGLE_SECRET;
  const jwks = createRemoteJWKSet(
    new URL("https://www.googleapis.com/oauth2/v3/certs"),
  );
  const pending = new Map<
    string,
    { nonce: string; verifier: string; browser: string; expires: number }
  >();
  async function identity(req: FastifyRequest) {
    try {
      if (!configured) return null;
      const { payload: p } = await jwtVerify(req.cookies[cookie] || "", key, {
        issuer: origin,
        audience: "kubequest",
        algorithms: ["HS256"],
        maxTokenAge: "12h",
      });
      return p.email === ownerEmail && typeof p.sub === "string"
        ? { email: ownerEmail, sub: p.sub }
        : null;
    } catch {
      return null;
    }
  }
  async function sign(sub: string) {
    return new SignJWT({ email: ownerEmail })
      .setSubject(sub)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(origin)
      .setAudience("kubequest")
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(key);
  }
  const opts = {
    path: "/",
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    maxAge: 43200,
  };
  function register(app: FastifyInstance) {
    app.get("/auth/google", async (req, reply) => {
      if (!configured)
        return reply
          .code(503)
          .send({ error: "Google sign-in is not configured yet." });
      for (const [k, v] of pending)
        if (v.expires < Date.now()) pending.delete(k);
      if (pending.size >= 200)
        return reply.code(429).send({ error: "Please retry shortly." });
      const state = randomBytes(32).toString("base64url"),
        nonce = randomBytes(32).toString("base64url"),
        verifier = randomBytes(32).toString("base64url"),
        browser = randomBytes(32).toString("base64url");
      pending.set(state, {
        nonce,
        verifier,
        browser,
        expires: Date.now() + 600000,
      });
      reply.setCookie(cookie + "-flow", browser, { ...opts, maxAge: 600 });
      return reply.redirect(
        "https://accounts.google.com/o/oauth2/v2/auth?" +
          new URLSearchParams({
            client_id: env.AUTH_GOOGLE_ID!,
            redirect_uri: origin + "/auth/google/callback",
            response_type: "code",
            scope: "openid email",
            state,
            nonce,
            code_challenge: createHash("sha256")
              .update(verifier)
              .digest("base64url"),
            code_challenge_method: "S256",
            prompt: "select_account",
          }),
      );
    });
    app.get("/auth/google/callback", async (req, reply) => {
      const q = req.query as Record<string, string>;
      const f = pending.get(q.state);
      pending.delete(q.state);
      reply.clearCookie(cookie + "-flow", opts);
      try {
        if (
          !f ||
          f.expires < Date.now() ||
          f.browser !== req.cookies[cookie + "-flow"] ||
          !q.code ||
          q.error
        )
          throw Error("Invalid flow");
        const r = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: env.AUTH_GOOGLE_ID!,
            client_secret: env.AUTH_GOOGLE_SECRET!,
            code: q.code,
            code_verifier: f.verifier,
            grant_type: "authorization_code",
            redirect_uri: origin + "/auth/google/callback",
          }),
          signal: AbortSignal.timeout(12000),
        });
        if (!r.ok) throw Error("Token exchange failed");
        const j = (await r.json()) as any;
        const { payload } = await jwtVerify(j.id_token, jwks, {
          issuer: ["https://accounts.google.com", "accounts.google.com"],
          audience: env.AUTH_GOOGLE_ID,
          algorithms: ["RS256"],
          requiredClaims: ["exp", "iat", "sub", "nonce", "email"],
        });
        if (!allowedGoogleIdentity(payload, env.AUTH_GOOGLE_ID!, f.nonce))
          throw Error("Not authorized");
        reply.setCookie(cookie, await sign(payload.sub!), opts);
        return reply.redirect("/ckad?welcome=1");
      } catch {
        return reply.redirect("/signin?error=access");
      }
    });
    app.post("/auth/logout", async (req, reply) => {
      if (req.headers.origin !== origin)
        return reply.code(403).send({ error: "Invalid origin." });
      reply.clearCookie(cookie, opts);
      return { ok: true };
    });
  }
  return { identity, register, configured, origin, cookie };
}
