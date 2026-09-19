# Live lab lifecycle

One live session is allowed at a time. The VM is capped at 4 vCPUs and 8 GiB RAM and boots a prepared K3s `v1.35.8+k3s1` template. The outer service limit is 12 GiB and 500% CPU to leave headroom for the portal and existing host services.

## Start and practice

![Sequence diagram: start a mission, connect a terminal, apply changes and grade](diagrams/sequence-lab.svg)

A valid start identifies the mission and mode. The controller creates a new qcow2 overlay, boots QEMU with restricted user networking, waits for the guest and Kubernetes networking, then applies the mission's broken setup in namespace `quest`. Status progresses from `starting` to `ready`, or `error` if setup fails.

The terminal opens a student shell through backend SSH. The YAML editor submits a bounded manifest to `kubectl apply -n quest -f -`. A resource WebSocket sends updated snapshots approximately every five seconds. The browser never receives an SSH private key, VM host password, or production kubeconfig.

## State transitions

![State-machine diagram: start, ready, submitted, reset, expiry and cleanup](diagrams/state-machine.svg)

The diagram includes conceptual `Idle` and `Stopping` states; the persisted TypeScript session statuses are `starting`, `ready`, `submitted`, and `error`. Idle means `lab.session` is null. Reset stops the current guest and builds a fresh overlay for the same mission and mode. It discards all ungraded workload edits.

A WebSocket reconnection reuses the active VM and session ID. A stale ID cannot mutate a replacement session. Resource polling is observation only and does not extend the session lifetime.

## Inactivity and timing

![Timing diagram: warning after 28 idle minutes and expiry at 30, with renewal by activity](diagrams/timing.svg)

Terminal input, manifest application, grading/tutor activity and explicit keepalive renew the 30-minute idle expiry. The UI warns two minutes before expiration. Merely leaving the tab open or receiving resource snapshots does not renew it. The expiry timer checks periodically, so cleanup can occur shortly after the deadline rather than at an exact millisecond.

Timed-mode deadlines are separate from inactivity. Timed attempts lock help until submission and stop terminal modification when their deadline arrives. The authored grader records the result; assistance can then explain what was missed.

## Restarts and deployments

On startup, the controller removes orphaned VM state and disposable overlays before accepting new sessions. An unexpected process or server restart therefore discards active lab work, while saved attempts remain in SQLite.

Normal CI/CD deployment first creates a maintenance marker to block new starts, checks the authenticated session status, and refuses to restart if a lab is active. The running lab stays available. After it is stopped, rerun the deployment. A crashed deployment helper can leave a maintenance marker; see [operations](Operations.md) for safe recovery.

## Images and storage

Application images, ingress, storage helpers and system components are preloaded. External image pulls are unavailable during practice. The Jobs/storage mission uses the guest's local-path provisioner, so data persists across Pod replacement within that VM. A lab reset destroys the entire overlay, including this practice storage.
