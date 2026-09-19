# Architecture

KubeQuest separates public learning from private cluster operations. The same Fastify service serves the compiled React application and protects all private HTTP and WebSocket routes. Public simulations run entirely in the browser; their controls never send Kubernetes commands.

## Runtime components

![Component diagram: browser modules, Fastify, authentication, lab controller, SQLite, and local tutor](diagrams/component.svg)

| Component | Responsibility | Source |
| --- | --- | --- |
| React/Vite frontend | Lessons, mission workspace, local progress, navigation and wiki | `src/` |
| Reviewed curriculum | Stable lesson/mission IDs, explanations, hints and solutions | `content/` |
| Fastify application | API, WebSockets, rate limits, CSP and SQLite | `server/index.ts` |
| Authentication | Google OAuth, PKCE, state, nonce and signed sessions | `server/auth.ts` |
| Lab controller | One disposable VM, SSH, resource snapshots, lifecycle | `server/lab.ts` |
| Mission grading | Broken initial manifests and authored configuration/behavior checks | `server/scenarios.ts` |
| Ollama | Optional bounded local inference using `qwen2.5:7b` | Existing host service |
| Release helpers | Restricted deployment receiver, archive checks, health and rollback | `infra/deploy-*`, `infra/release-format.mjs` |

## Deployment topology

![Deployment diagram: browser and GitHub runner through Cloudflare to the home server and isolated guest](diagrams/deployment.svg)

The public hostname is `kubequest.ramideltoro.com`. Cloudflare Tunnel forwards it to the portal's loopback listener on port 4340. GitHub-hosted deployment runners use the existing SSH tunnel route, Cloudflare service authentication, and a dedicated SSH key whose forced command only accepts deployment or rollback of a full commit SHA.

The portal runs as the unprivileged `kubequest` system user. Its KVM guest receives 4 vCPUs and 8 GiB RAM. QEMU restricted networking prevents the guest from initiating connections to the host, private network, internet, or metadata services. The backend alone connects to the guest through a loopback SSH forward. No production Kubernetes credentials are used.

Runtime secrets live outside releases in `/etc/kubequest/runtime.env`. SQLite and lab files live in `/var/lib/kubequest`. The active code is selected by the `/opt/kubequest/current` symlink. A source release does not contain runtime credentials, databases, VM disks, or SSH private keys.

## Source boundaries

![Package diagram: frontend, content, backend, assets, documentation, tests, infrastructure and workflows](diagrams/package.svg)

The frontend imports lesson and mission definitions plus public documentation at build time. The backend imports mission definitions and authored validators. AI output cannot change validators, execute commands, or modify lesson content. Deployment helpers are installed separately under `/usr/local/libexec`; publishing application code cannot replace privileged helper code.

## Deliberate limits

- One owner and one active lab; this is not a public multi-tenant shell service.
- A single-node K3s cluster; multi-node scheduling and highly available control planes are outside the pilot.
- Preloaded images and no guest outbound internet access; arbitrary image pulls are unavailable during practice.
- SQLite and local backups on one host; host loss requires a separate recovery copy or rebuild.
- AI tutoring is optional. Authored hints and solutions remain useful when inference is unavailable.

[Diagram sources and the complete UML library](UML-diagrams.md)
