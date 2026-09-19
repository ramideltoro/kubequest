# Authentication and security

Public learning never requires sign-in. Every private API and WebSocket first verifies a signed owner session. The only authorized Google identity is the configured exact owner email in `server/auth.ts`; changing the visible sign-in UI cannot grant access.

## Google sign-in

![Sequence diagram: Google OAuth and protected requests](diagrams/sequence-auth.svg)

The backend uses authorization-code flow with PKCE, signed state, and a nonce. It verifies the ID token's signature, issuer, audience, nonce, verified email and authorized-party claim. Callback state is consumed so it cannot be replayed. The callback is `https://kubequest.ramideltoro.com/auth/google/callback`.

A successful login sets a Secure, HttpOnly, SameSite session cookie scoped to the public origin. Private mutations and WebSocket upgrades require the matching Origin as well as a valid identity. Expired or wrong-audience tokens fail closed. No development-login bypass exists.

Keep the Google client secret and session secret in the root-readable runtime environment file, outside source control and build artifacts. Preserve existing redirect URIs used by other applications if the shared Google client is maintained.

## Browser protections

- A restrictive Content Security Policy serves scripts, fonts, images, media and connections from the application. Inline style support is retained for the editor and interface libraries.
- `X-Frame-Options: DENY`, `frame-ancestors 'none'`, content-type protection and referrer policy are applied by Fastify.
- API and authentication responses are not cached. API request buckets limit bursts.
- Request size, YAML length, terminal message size and resize bounds are enforced.
- The wiki renders authored Markdown without enabling raw HTML execution. Diagram assets are generated from reviewed local source.

## Lab boundary

The guest uses a fresh disk overlay from the prepared template. The runtime has no host filesystem mount and cannot initiate outbound host, LAN, internet or metadata connections. Guest SSH forwarding is disabled. The learner has Kubernetes privileges inside the disposable VM; these are not host privileges. Only the backend possesses the guest SSH key and pinned host-key record.

A single-owner pilot is not a substitute for a hardened public multi-tenant execution platform. Keep live access private. NetworkPolicies inside the exercise teach application isolation; the outer VM network restriction remains in force even when a learner changes cluster policies.

## Deployment boundary

GitHub runs tests on hosted disposable runners, including public pull requests. Production secrets are available only to the deployment job on `main` through the production environment. Third-party actions are pinned to full commit SHAs; the Cloudflare binary is versioned and checksum-verified.

The server's dedicated deployment key has a forced command, no PTY, and no port/agent forwarding. It can request only `deploy <full SHA>` or `rollback <full SHA>`. A narrow sudo entry launches a root-owned helper. Archive paths and entry types are checked, dependencies are installed without lifecycle scripts as the deployment user, and releases become root-owned before activation.

Cloudflare's existing machine-access credential is reused for the established SSH route; the KubeQuest SSH key is separate. Rotate those secrets through the normal credential-management process when needed. No passwords are changed by this pipeline.

## Data minimization

Anonymous progress stays in the browser. Private attempts and completion records are saved in SQLite. Terminal transcripts and tutor conversations are not persisted by the application. Scenario Secrets contain disposable examples only. Tutor evidence excludes Secret values and arbitrary configuration text.
