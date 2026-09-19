# CKAD practice missions

Each mission combines a realistic failure, a broken starting manifest, terminal and YAML access, live resource evidence, progressive hints, authored checks, and an explained repair. Mission definitions are in `content/missions.ts`; setup and evaluation are in `server/scenarios.ts`.

| Mission | Incident and expected repair | Behavioral evidence |
| --- | --- | --- |
| The case of the missing endpoints | Service selector still uses the old application label; restore matching without replacing the workload | HTTP request through the Service succeeds |
| Running is not ready | Readiness checks the wrong path; repair readiness and add liveness | Ready replicas and working Service response |
| Configuration and Secrets | Application settings and password references are incorrect | Expected runtime values are consumed through the required references |
| Rollout recovery | A bad release is unavailable; recover a healthy rolling update | Healthy replicas, expected image and availability behavior |
| Multi-container handoff | Initialization and serving containers do not share the intended files | Served content contains the initialized output |
| Jobs and persistent storage | A report job needs a persistent destination | Completed job and report readable from another Pod |
| Workload security and resources | Workload needs non-root execution, safe security settings, requests and limits | Running process UID and resource/security configuration |
| NetworkPolicy and Ingress | Restore intended ingress and internal access while denying an unrelated client | HTTP through ingress, permitted client succeeds, denied client fails |

The mission catalog is the authority for the exact task requirements and current names. Validators accept meaningful alternatives such as named ports or equivalent resource quantities where these preserve the requirements. A plausible-looking manifest is insufficient when the application behavior remains broken.

## Curriculum coverage

The eight missions span all five CKAD domain groups: Application Design and Build, Application Deployment, Application Observability and Maintenance, Application Environment/Configuration/Security, and Services/Networking. This breadth does **not** imply complete coverage of every objective. The catalog lists covered and outstanding topics, including image-building work and broader deployment/tooling tasks that are not fully taught by these incidents.

See the [official CKAD curriculum](https://training.linuxfoundation.org/certification/certified-kubernetes-application-developer-ckad/) and the current domain mapping in `content/missions.ts`. Review the official information before an exam because weights and versions may change.

## Grading contract

1. A new mission must fail its complete validation before the learner changes anything.
2. The authored solution must satisfy every configuration and behavior check.
3. An alternative implementation must pass when it meets the same requirements.
4. A superficial fix must fail: examples include deleting required probes, hardcoding a required Secret value, allowing all ingress traffic, or leaving API-token mounting enabled.
5. A grade records the checks, percentage, mode, duration and timestamp in SQLite. The AI tutor has no role in determining this result.

Initial live validation exercised all eight missions, their authored solutions, alternatives and incomplete fixes. The [validation page](Validation.md) distinguishes this real-cluster qualification from the fast checks run on each commit.

## Walkthroughs

Each mission includes an MP4, English WebVTT captions, and a complete text transcript in `public/demos/`. These are labeled condensed replays of actual successful lab output, not footage of another user's private session. Recordings should be regenerated whenever setup, expected output or the explained solution changes.

The browser terminal is available only to the authorized owner. Anonymous visitors see **Only authorized users can use live labs** alongside the real-exercise walkthrough.
