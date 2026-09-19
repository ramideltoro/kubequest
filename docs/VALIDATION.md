# Pilot verification — 19 September 2026

This release is a pilot with eight original missions, not complete CKAD exam coverage. The Linux Foundation's [CKAD page](https://training.linuxfoundation.org/certification/certified-kubernetes-application-developer-ckad/) and [candidate instructions](https://docs.linuxfoundation.org/tc-docs/certification/tips-cka-and-ckad) were checked on this date and list Kubernetes 1.35. The lab pins K3s `v1.35.8+k3s1`. Future exam changes require a reviewed image/content update.

## Automated and browser checks

- TypeScript compilation and Vite production build pass.
- Twelve unit/security/lifecycle tests pass. These cover verified exact-owner identity, wrong/expired identities, unauthorized direct APIs and WebSockets, origin protection, OAuth state and PKCE, stale session IDs, timed tutor denial, automatic timed submission, startup cleanup, and 30-minute idle expiry with activity extension.
- All ten beginner lessons were completed anonymously in a browser, including incorrect-answer feedback, interactive exercises, correct answers, and completion. Reload restored all ten completion records.
- Service-selector failure/repair and temporary-versus-persistent storage were exercised separately.
- Eighteen responsive route checks at 390, 768, and 1440 pixels passed without horizontal overflow, broken images, or browser exceptions. Mobile and desktop screenshots were inspected.
- Automated WCAG 2 A/AA and WCAG 2.1 AA checks found zero violations on eight public routes after contrast fixes. Reduced motion was enabled during this check. Keyboard focus and arrow-key lesson tabs are implemented. This automated audit does not replace testing with people using assistive technology.
- All twenty technology/resource artwork files match their recorded official-source SHA256. Source and license records are served locally. SVG artwork was not recolored or redrawn.
- Dependency audit reports zero known vulnerabilities at release time.

## Real Kubernetes mission validation

Each exercise was booted in its own disposable guest. Each starting state failed the complete grade, each authored repair passed all four checks, an incomplete repair failed, and a valid alternative passed.

| Mission | Initial passing checks | After authored repair | Alternative exercised |
| --- | --- | --- | --- |
| Service routing | 2/4 | 4/4 | Named target port resolving to port 80 |
| Probes/debugging | 0/4 | 4/4 | Named HTTP probe ports |
| Configuration/Secrets | 0/4 | 4/4 | Explicit non-optional key references |
| Rollout recovery | 0/4 | 4/4 | Fully qualified image and zero-percent unavailable |
| Multi-container handoff | 0/4 | 4/4 | Different shared-volume name |
| Jobs/storage | 2/4 | 4/4 | Different PVC volume/mount name |
| Workload security/resources | 0/4 | 4/4 | Pod-level non-root identity and equivalent resource quantities |
| NetworkPolicy/Ingress | 1/4 | 4/4 | Additive policies split by permitted source |

Behavioral checks make HTTP requests, test allowed and denied traffic from separate Pods, read the persistent report from another Pod, and inspect the running process UID. Superficial fixes such as removing readiness checks, hardcoding the password, opening all network ingress, or retaining automatic API token mounting fail.

The storage helper image is preloaded along with application images. Runtime VM networking blocked connections to the host application, host observability port, LAN router, metadata address, and public internet. SSH forwarding is disabled and the VM uses restricted user networking.

## Recordings

All eight public MP4 walkthroughs are condensed replays of actual successful terminal output from these tests. They are labeled accordingly, have English captions and complete text transcripts, and explain why the repair works. They contain only disposable practice data. No private user session is recorded.

## Operational checks

Operational test results and resource observations are recorded in the release handoff after production verification. The documented limits are one 4-vCPU/8-GiB guest, a 12-GiB/5-CPU service ceiling, and one bounded local Qwen request at a time. Local backups protect against application mistakes, not physical server loss.

### Backend and resource results

The deployed API passed authenticated start, single-session enforcement, actual terminal command execution, resource-stream reconnect, YAML apply, behavioral grading, progress persistence, fresh-VM reset, stale-request rejection, stop, and service-restart orphan cleanup. Google Cloud accepted the registered KubeQuest callback after it was added to the existing client without removing other callbacks.

The local `qwen2.5:7b` tutor returned an actual response in 29 seconds, including model loading. During a 60-second sample alongside the existing services, the Qwen process reached approximately 4.8 GiB resident memory, the VM approximately 2 GiB, and total host memory use approximately 8.5 GiB of 58.8 GiB. More than 50 GiB remained available in the sample. Existing Ollama, NutsNews AI, fantasy Qwen, and observability services stayed active. These are deployment observations, not a sustained-load benchmark; only one lab and one tutoring request are permitted.

An online SQLite backup was restored to a separate file. Its integrity check passed and attempts/progress record counts matched the live database. The daily systemd timer keeps fourteen local snapshots. Production recovery instructions retain the original database before a restore.
