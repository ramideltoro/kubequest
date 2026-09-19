# KubeQuest implementation and documentation

The wiki is maintained in https://github.com/ramideltoro/kubequest-wiki and hosted at https://ramideltoro.github.io/kubequest-wiki/. It must stay aligned with this application.

For changes to src/, server/, content/, infra/ or .github/workflows/:
1. Update the affected authored wiki pages and UML diagrams in kubequest-wiki. Do not satisfy this with a timestamp-only edit.
2. Commit and push the reviewed wiki changes, then record the full wiki commit and a meaningful summary in this repository's wiki-review.json.
3. Run npm run docs:check, the appropriate application tests and build. CI rejects a missing review update.

Dependency-only changes automatically update the generated locked-version reference. Every successful main deployment and rollback must run the wiki synchronization and wait for GitHub Pages release.json to match the deployed application commit. Do not remove, skip, or make that step continue-on-error. Keep production deployments serialized through the shared kubequest-production concurrency group.

Do not add authored wiki copies back to this repository or put secrets into either repository. Preserve public lesson access and owner-only real labs. Runtime secrets stay on the server or in scoped GitHub environment secrets.
