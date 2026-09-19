# KubeQuest

[![CI and deployment](https://github.com/ramideltoro/kubequest/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/ramideltoro/kubequest/actions/workflows/ci-cd.yml)

**[Open KubeQuest →](https://kubequest.ramideltoro.com)**

Learn Kubernetes by seeing what happens, trying a change, and understanding why it worked. KubeQuest follows one example application, Little Notes, from a first browser request to a recoverable Kubernetes workload.

- **Kubernetes Basics:** ten public, short visual lessons with clickable diagrams, simulations, prediction exercises, plain-language explanations and optional deeper commands. No signup, terminal or cluster required. Progress stays in the browser.
- **CKAD Practice:** eight original incident missions with real Kubernetes, a browser terminal, YAML editor, live resource diagrams, progressive hints, authored behavioral grading and explained solutions. Guided, independent and timed modes are available to the authorized owner.
- **Public walkthroughs:** captioned recordings and transcripts show the actual exercises. Live labs, private progress and the optional local AI tutor require verified owner Google sign-in.
- **Dark amber interface:** official Kubernetes/CNCF artwork, readable labels, mobile layouts, reduced-motion support and a compact NutsNews-style footer with local search.

This is an independent CKAD **pilot**, not complete exam coverage or an official exam simulator. Availability depends on the home server and internet connection.

## Links

| Resource | Link |
| --- | --- |
| Live portal | [kubequest.ramideltoro.com](https://kubequest.ramideltoro.com) |
| Public Readme | [Project overview](https://kubequest.ramideltoro.com/readme) |
| Detailed wiki | [Architecture, operations and learning documentation](https://kubequest.ramideltoro.com/wiki) |
| UML library | [16 diagrams covering all 14 UML categories](https://kubequest.ramideltoro.com/wiki/UML-diagrams) |
| CI/CD | [GitHub Actions](https://github.com/ramideltoro/kubequest/actions) |
| Wiki source | [Versioned Markdown and editable PlantUML](docs/wiki/Home.md) |

## Architecture

TypeScript, React/Vite, Fastify and SQLite run on the existing AI server behind Cloudflare Tunnel. Private labs use one disposable KVM guest capped at 4 vCPUs and 8 GiB RAM, with K3s `v1.35.8+k3s1`, preloaded images, ingress, storage and network-policy support. The guest cannot initiate connections to private infrastructure or the internet. Resets recreate the overlay; 30 minutes of inactivity expires a session.

The optional existing Ollama `qwen2.5:7b` tutor receives bounded reviewed content and sanitized evidence. It cannot run commands or determine grades. Authored help remains available when inference fails. No additional paid service is required.

## Local development

Use Node **22.22.1** or newer compatible Node 22. Public pages work without credentials; private endpoints fail closed.

```sh
npm ci --ignore-scripts
npm test
npm run docs:check
npm run build
npm start
```

Open `http://127.0.0.1:4340`. For frontend development, run `npm run dev` in a second terminal. Copy the variable names in `.env.example` into your local environment only when needed; never commit real values. Production environment loading is performed by systemd.

Browser verification requires Chromium:

```sh
npx playwright install chromium
npm run test:browser
```

The backend must be running before browser checks. `BROWSER_PATH` can select an existing Chromium executable. UML rendering uses a checksum-verified PlantUML jar and Java 21+ via `npm run docs:render`.

## Delivery

Pull requests run tests, security/dependency checks, documentation validation, build, browser interactions and automated accessibility checks on GitHub-hosted runners. Successful `main` builds produce an immutable artifact and deploy over the existing Cloudflare SSH route using a dedicated restricted key.

Deployment refuses to restart an active lab, backs up SQLite, atomically switches releases and verifies the exact commit. Failed local health checks restore the previous release. A separate manual workflow rolls back to an installed commit. The wiki is built and deployed with the portal.

See [CI/CD](docs/wiki/CI-CD.md), [operations/recovery](docs/wiki/Operations.md), [content authoring](docs/wiki/Content-authoring.md) and [validation](docs/wiki/Validation.md).

## Artwork and ownership

Kubernetes symbols come from the [official community icons](https://github.com/kubernetes/community/tree/main/icons); project logos come from [CNCF artwork](https://github.com/cncf/artwork) or their vendors. Original colors/proportions remain intact. Source/license records and hashes are in [public/icons/sources.json](public/icons/sources.json). UI controls use Lucide icons. KubeQuest is a plain text wordmark.

Created by [Rami Del Toro](https://www.ramideltoro.com). Not affiliated with CNCF, Kubernetes, or The Linux Foundation. Third-party artwork retains its respective ownership and licensing terms.
