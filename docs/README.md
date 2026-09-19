# KubeQuest documentation

All authored guides, UML diagrams, operations notes and release references are maintained in **[ramideltoro/kubequest-wiki](https://github.com/ramideltoro/kubequest-wiki)** and hosted on **[GitHub Pages](https://ramideltoro.github.io/kubequest-wiki/)**.

Update that repository when changing KubeQuest. Record a reviewed wiki commit in `wiki-review.json` for application, infrastructure, curriculum, UI or workflow changes. CI enforces that review and validates the separate wiki. Every successful deployment and rollback pushes a code-derived release reference and waits for the hosted wiki to match the live commit.

The publication key is scoped to the wiki repository. Generated reference updates preserve authored pages and diagrams. See the [delivery guide](https://ramideltoro.github.io/kubequest-wiki/CI-CD/) for the pipeline and recovery procedures.
