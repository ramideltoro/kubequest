# API and data

The backend serves JSON over same-origin HTTPS and terminal/resource streams over authenticated WebSockets. Public application routes are React routes, served from the same origin by Fastify.

## HTTP surface

| Method and path | Access | Purpose |
| --- | --- | --- |
| `GET /healthz` | Public | Service identity, release revision, auth configuration, lab readiness and Kubernetes version |
| `GET /api/me` | Public | Current identity and feature availability; no private credentials |
| `GET /auth/google` | Public | Begin Google sign-in |
| `GET /auth/google/callback` | Valid OAuth transaction | Complete verified identity exchange |
| `POST /auth/logout` | Session/same-origin policy | Clear the session cookie |
| `GET /api/private/session` | Owner | Current session status or null |
| `POST /api/private/session/start` | Owner + matching Origin | Start a known mission in a valid mode |
| `POST /api/private/session/reset` | Owner + matching Origin + current ID | Rebuild the current mission |
| `POST /api/private/session/stop` | Owner + matching Origin + current ID | Stop and discard the current VM |
| `POST /api/private/session/keepalive` | Owner + matching Origin + current ID | Renew inactivity deadline |
| `POST /api/private/apply` | Owner + matching Origin + ready ID | Apply a YAML manifest of at most 64 KB |
| `POST /api/private/grade` | Owner + matching Origin + current ID | Run authored checks and store an attempt |
| `GET /api/private/progress` | Owner | Read private completion and attempt history |
| `POST /api/private/progress` | Owner + matching Origin | Save a known beginner lesson completion |
| `POST /api/private/tutor` | Owner + matching Origin + eligible session | Ask the optional local tutor |

A start body is `{"missionId":"lost-in-routing","mode":"guided"}`. Session-dependent requests include `sessionId`. Apply additionally includes `yaml`; tutor includes `question`. Treat returned session IDs as identifiers, not authorization tokens: the signed cookie remains mandatory.

Common responses are 401 for missing/invalid identity, 403 for an incorrect Origin, 400 for invalid input, 409 for stale or unavailable session state, 429 for request limits, and 503 for a deployment maintenance window. Errors should be displayed without revealing internal credentials or command infrastructure.

## WebSocket surface

| Path | Messages |
| --- | --- |
| `/api/private/terminal?sessionId=…` | Browser sends JSON `input` or `resize`; backend streams terminal text |
| `/api/private/resources?sessionId=…` | Backend sends JSON resource snapshots or temporary-unavailable messages |

Terminal input is capped at 8,192 characters per message. Resize dimensions are bounded by the backend. Connections are checked at upgrade and rechecked during use; a session change, expiry, or invalid identity closes access. Resource summaries are safe teaching evidence, not full raw Kubernetes Secret objects.

## Data model

![Class diagram: lesson and mission content, Lab, Session, Attempt and Progress](diagrams/class.svg)

SQLite runs in WAL mode. The `attempts` table stores an integer ID, mission ID, mode, completion timestamp, elapsed seconds, and authored results encoded as JSON. The `progress` table stores a stable lesson ID and completion timestamp. These records survive application updates and lab resets because the database is outside the release directory.

Session state is in memory; VM disks and process records are disposable files in the lab directory. The browser's `kubequest-progress` localStorage key stores anonymous completed lesson IDs. The application does not persist tutor chats or terminal transcripts.

![Object diagram: illustrative broken Service routing attempt](diagrams/object.svg)

## Versioning

Lesson and mission IDs are durable keys. Avoid renaming them after users have saved progress. Source definitions and validator changes are versioned with Git commits. `/healthz` reports the full deployment revision from `RELEASE.json`, allowing CI to verify that the public hostname serves the intended build. Schema-changing releases need an explicit migration and rollback plan; the current pipeline does not silently rewrite schema history.
