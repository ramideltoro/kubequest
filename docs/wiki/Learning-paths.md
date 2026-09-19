# Learning paths

## Kubernetes Basics

Every lesson follows **see the problem → explore a diagram → interact → explain what happened → check understanding**. The example is Little Notes, a small application for saving ideas. Lessons take roughly 5–10 minutes; no previous Kubernetes knowledge is assumed.

| Lesson | Plain-language outcome |
| --- | --- |
| Where does an app live? | Follow a request from a browser to an application on a server |
| Pack an app into a container | Distinguish an image from a running container |
| Why Kubernetes? | See how desired state helps with copies and failures, and when Kubernetes is unnecessary |
| Meet the cluster | Distinguish nodes from the control plane |
| Your first Pod | See where containers run and why a bare Pod is not a recovery controller |
| Keep the app running | Change desired replicas and observe replacement after failure |
| Help visitors find it | Match Service selectors to Pod labels and follow routing |
| Change settings and keep data | Separate ConfigMaps, Secrets, temporary files and persistent storage |
| Update safely | Explore readiness, rolling updates and rollback |
| Bring it together | Deploy, scale, break and recover the example application |

![Activity diagram: anonymous lesson flow and progress saving](diagrams/activity.svg)

Technical vocabulary appears with explanations. Optional **Go deeper** panels contain commands and YAML. Analogies identify where the comparison stops being accurate. Browser simulations are explicitly labeled; they are teaching models and do not reproduce every Kubernetes controller or timing detail.

A correct understanding check unlocks lesson completion. The browser stores completed stable IDs in `localStorage` under `kubequest-progress`. Reloading or returning to the same browser restores progress. Clearing site storage removes this anonymous progress. An authorized owner can also save completion on the server. Private progress does not make another visitor's browser data public.

## CKAD Practice

The public catalog shows objectives, curriculum domains, incident briefs, examples, and real-exercise recordings. Starting a live session requires Google authorization.

| Mode | Behavior |
| --- | --- |
| Guided | Progressive hints, reference explanation and optional tutor available during practice |
| Independent | Practice without opening help; assistance remains available when requested |
| Timed | Deadline based on mission duration; assistance remains locked until submission, terminal changes stop at the deadline |

A timed attempt is a practice constraint, not an official exam proctoring system. These original incidents are not exam questions. The initial eight missions cover only part of the curriculum; outstanding objectives appear in the catalog.

![Interaction overview: choose Basics or CKAD, authenticate when needed, and practice](diagrams/interaction-overview.svg)

## Finding content

The footer follows the compact NutsNews layout: circular Home, Search and Site menu shortcuts, a navigation pill, and the copyright line. Search covers the ten lessons and eight missions locally. The Readme gives a short project overview; this wiki provides implementation and operational detail.
