# Validation and release evidence

KubeQuest is a pilot. Test results describe the implementation and environment actually exercised; they are not a claim of complete CKAD coverage, universal accessibility, or production-scale throughput.

## Per-commit CI

The [GitHub workflow](https://github.com/ramideltoro/kubequest/actions) runs locked dependency installation, a high/critical vulnerability gate, unit/security/lifecycle/archive checks, documentation integrity checks, TypeScript/Vite build, and anonymous browser verification. The browser suite completes all ten beginner lessons and confirms restoration of saved progress. It also checks responsive layout, automated WCAG rules and footer interactions. Screenshots are retained as workflow artifacts.

Deployment checks the exact local release SHA, Google configuration and lab-template availability, then verifies the public hostname and rejects anonymous private-API access. These are delivery checks; they do not replace mission-level behavioral qualification.

## Real lab qualification

The initial deployment exercised every mission in a separate disposable VM. The broken initial state failed complete validation; each authored solution passed all four checks; an incomplete repair failed; and a valid alternative passed.

| Scenario | Initial passing checks | After repair | Alternative verified |
| --- | --- | --- | --- |
| Service routing | 2/4 | 4/4 | Named target port resolving to port 80 |
| Probes/debugging | 0/4 | 4/4 | Named HTTP probe ports |
| Configuration/Secrets | 0/4 | 4/4 | Explicit key references |
| Rollout recovery | 0/4 | 4/4 | Qualified image and zero-percent unavailable |
| Multi-container handoff | 0/4 | 4/4 | Alternative shared-volume name |
| Jobs/storage | 2/4 | 4/4 | Alternative PVC volume/mount names |
| Workload security/resources | 0/4 | 4/4 | Pod-level non-root identity and equivalent units |
| NetworkPolicy/Ingress | 1/4 | 4/4 | Additive policies split by allowed source |

Behavior checks include real HTTP, allowed/denied client traffic, persistent report content read by another Pod, and running process UID. Superficial repairs such as deleting probes or opening all ingress are rejected. The eight public walkthroughs were produced from actual successful exercise output.

## Security and lifecycle

Automated coverage includes exact verified-owner identity, wrong/expired sessions, unauthorized direct APIs and WebSockets, origin validation, callback state/PKCE, stale IDs, timed assistance denial, automatic timed submission, startup cleanup, idle expiry and activity renewal. Deployment archive checks reject traversal, absolute paths, symlinks, unexpected files and oversized content.

Initial production verification exercised terminal command execution, resource-stream reconnect, apply, grade, progress, reset, stop and restart cleanup. Isolation checks failed connections from the VM to host application/observability ports, LAN, metadata and public internet. Google sign-in was completed with the authorized account through the registered KubeQuest callback.

## Resource observations

During initial qualification alongside existing services, a local tutor response took approximately 29 seconds including model load. A 60-second sample observed about 4.8 GiB for Qwen, 2 GiB for the VM, and roughly 8.5 GiB total host usage with more than 50 GiB available. Existing AI and observability services stayed active. This short sample is not a sustained-load benchmark.

An online database backup was restored to a separate file, its integrity check passed, and record counts matched. Daily backups keep fourteen local snapshots. Physical host loss requires separate private recovery handling.

## When to repeat expensive checks

Theme, footer and documentation updates use the normal CI/browser gate. Changes to VM construction, networking, auth, controller logic, setup manifests or graders require focused integration checks and, where affected, the complete live mission suite during an idle maintenance window. Keep sensitive maintenance tokens and real runtime evidence out of public artifacts.
