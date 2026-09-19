# KubeQuest operations

## Deployment architecture

The public hostname `kubequest.ramideltoro.com` routes through the existing Cloudflare Tunnel to `127.0.0.1:4340` on the local AI server. The TypeScript/Fastify service serves the compiled React application, checks Google identity, stores progress in SQLite, and manages one disposable QEMU/KVM guest.

The application is independent of NutsNews and the observability portal. Its systemd unit is `kubequest.service`; releases live in `/opt/kubequest/releases`, with `/opt/kubequest/current` pointing at the active release. Runtime secrets are in `/etc/kubequest/runtime.env`, readable by root. The unit injects them into the application. Do not put secrets in source, static assets, recordings, or logs.

Runtime state lives in `/var/lib/kubequest`. The lab contains an immutable `template.qcow2`, a backend-only SSH identity, pinned guest host keys, and a disposable `session.qcow2`. No production kubeconfig is used. The guest is a single-node K3s cluster pinned to `v1.35.8+k3s1` (Kubernetes 1.35, the CKAD minor version verified at implementation).

## Resource and isolation limits

One active lab is allowed. The guest has 4 virtual CPUs and 8 GiB RAM. The portal service is capped at 12 GiB and 500% CPU in systemd. The VM uses QEMU user networking with `restrict=on` and IPv6 disabled. It cannot initiate connections to the host, LAN, public internet, or metadata services. Only the host-loopback SSH forward is available to the backend. A default route is installed inside the guest so Kubernetes can select a node interface; QEMU still blocks forwarding.

Images and system components are preloaded during template creation. Learners must use the images documented in each mission. Arbitrary internet image pulls are intentionally unavailable in this pilot. The lab is not suitable for untrusted multi-tenant public shell access: only the owner can open it. Kubernetes admin permissions inside the VM never imply host administrator permissions.

The guest SSH server disables TCP forwarding, tunneling, and X11. The private key stays on the host. Source repository code is not mounted into the guest. Only practice-only credentials are used in scenarios.

## Authentication

Google OAuth uses authorization code flow, PKCE, state, a browser-bound flow cookie, and nonce verification. ID tokens require Google's signature, issuer, client audience, verified email, nonce, and an exact match to `rami.deltoro@gmail.com`. Sessions use signed, HttpOnly, Secure, SameSite=Lax cookies with a 12-hour limit. Mutation requests and terminal/resource WebSockets require the configured site Origin.

Required Google Authorized redirect URI:

`https://kubequest.ramideltoro.com/auth/google/callback`

The existing client ID and secret are sourced from the central credentials file during deployment. Keep existing callback URIs for other applications. No external identity provider or paid identity subscription is required.

Public pages, recordings, examples, and browser simulations remain available without login. Private APIs and WebSocket upgrades fail closed without a valid owner session. The browser never receives administrator credentials.

## Start, stop, reset, and recovery

Starting a lab creates a fresh overlay disk, boots the VM, waits for Kubernetes networking and the namespace's service account, then applies the broken mission state. Terminal sessions reconnect to the existing VM. Reset deletes the disposable session and builds a new one from the template.

Thirty minutes without terminal input, manifest application, grading/tutoring activity, or an explicit keepalive expires the session. Page polling and resource observation do not keep a lab alive. A two-minute warning appears in the UI. On application restart, orphaned session state is removed before accepting new labs. A restart discards in-progress lab work; recorded grades survive.

Check service health with `systemctl status kubequest` and `curl http://127.0.0.1:4340/healthz`. Inspect bounded application logs using `journalctl -u kubequest -n 100`. Do not enable request-header logging or dump environment variables. Live lab diagnostics are available to the root maintenance account through the backend SSH identity; never expose that identity to the frontend.

To recover a failed lab, use Reset. To recover the app, restart `kubequest.service`; this also clears any active lab. Rebuild a damaged template using `infra/build-template.sh` only during maintenance with the service stopped. The script downloads and checks the Ubuntu image SHA256, pins K3s, preloads mission images, and creates an independent QCOW2 base. Never edit an in-use base disk.

## Deploy and roll back

1. Run `npm ci`, `npm test`, and `npm run build` locally. Run real-cluster integration checks when mission setups or validators change.
2. Create a new immutable release directory, copying source, lockfile, and `dist`, without development caches or credentials.
3. Run `npm ci --omit=dev` in that release. Preserve the runtime environment file and persistent state.
4. Stop the service, repoint `/opt/kubequest/current` to the new release, and start the service.
5. Verify health, public pages, anonymous access denial, Google redirect, and one disposable lab.

Roll back by stopping the service, repointing `current` to the prior release, and starting it. SQLite schema changes require a compatible backup or an explicit migration; the initial release only creates the attempts and progress tables. Do not roll back over incompatible schema changes without a recovery plan.

The Cloudflare route is additive. Retain every existing tunnel ingress and the final fallback when editing it. To withdraw KubeQuest, remove only its hostname entry and DNS record, then stop the service.

## Backups

The installed daily systemd timer runs `infra/backup.mjs`, using SQLite's online backup API to create a consistent local backup in `/var/lib/kubequest/backups`; retain the latest 14 backups. These backups protect against application mistakes, not loss of the physical server. No off-host backup service or additional cost is introduced. Runtime credentials remain in their existing central source; handle copies privately. The lab template is rebuildable and session disks are disposable.

To restore progress, stop the service, preserve the current database for investigation, replace it from a verified backup, remove stale WAL/SHM files for that database, restore ownership to kubequest, and start the service. Verify `PRAGMA integrity_check` on the restored file before startup.

## Local tutor

The tutor calls the existing loopback Ollama service with `qwen2.5:7b`. It permits one in-flight request, limits context to 4096 tokens and output to 400 tokens, requests four inference threads, and times out after 60 seconds. Idle model residency is two minutes. Only bounded authored content, the question, and sanitized resource metadata are supplied; no Secret contents or terminal transcript are sent. Tutor text is rendered as text, never executable HTML. The tutor has no tools and cannot change the cluster or grade work. Authored hints and explanations remain available if the model is slow, busy, or unavailable.

## Known pilot boundaries

Eight missions cover selected CKAD skills rather than the entire curriculum. Helm, Kustomize, advanced deployment strategies, CRDs/operators, and other gaps are listed on the curriculum page. The single-node lab does not simulate machine-level high availability or multi-node persistent storage. Timed mode removes assistance in the active workspace and enforces its deadline server-side; public educational content remains browsable, so it is a practice aid, not a proctored exam.

## Install on a replacement host

Use an x86-64 Linux host with hardware KVM support, Node.js 22.22 or later, the QEMU/KVM utilities, `cloud-image-utils`, `curl`, and OpenSSH clients. Verify `/dev/kvm` is usable. Install packages from the host distribution; the portal does not need a Docker daemon.

1. Create the system account `kubequest`, add it to the `kvm` group, and create `/opt/kubequest/releases`, `/etc/kubequest`, and `/var/lib/kubequest/lab`. Make `/var/lib/kubequest` owned by kubequest with mode 0700.
2. Generate a dedicated passwordless Ed25519 SSH identity at `/var/lib/kubequest/lab/id_ed25519`, owned by kubequest, mode 0600. The identity is only for the disposable guest. Never reuse a production SSH key.
3. Run `infra/build-template.sh` as kubequest with the portal stopped. Building needs temporary outbound networking to the official Ubuntu image, K3s installer, and image registries. Runtime sessions use restricted networking. The script verifies the Ubuntu SHA256, pins K3s, downloads required images including the local-path storage helper, and records the guest's SSH host key. Keep `known_hosts` with the matching template. On a new host, review this generated key through the trusted local build process.
4. Install a release as described above. Store the values from `.env.example` in `/etc/kubequest/runtime.env` with mode 0600. Use the public HTTPS origin, `/var/lib/kubequest/kubequest.sqlite`, and a cryptographically random session secret of at least 32 bytes. Source Google credentials from the owner's central credential store; do not embed them in scripts or version control.
5. Install `infra/kubequest.service` into `/etc/systemd/system`, then reload systemd and enable/start the service. Install and enable the backup service/timer from the same directory.
6. Add the public hostname to the existing Cloudflare Tunnel with target `http://localhost:4340`, preserving other ingress entries and the final fallback. Configure the matching proxied CNAME. Register the exact HTTPS Google callback. Confirm anonymous access fails for private endpoints before signing in.
7. Keep Ollama bound to loopback, with `qwen2.5:7b` installed. The tutor gracefully falls back to authored hints if it is unavailable. Review resource use with the existing services before allowing live practice.

The VM image and SSH identity are a matched pair. A rebuilt image requires a matching newly verified `known_hosts`; do not disable SSH host verification to resolve a mismatch.
