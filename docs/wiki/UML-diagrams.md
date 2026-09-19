# UML diagram library

This library covers all **14 UML diagram categories** with **16 KubeQuest diagrams**. Sequence diagrams are split into authentication, live practice and delivery because those workflows have different trust boundaries. Each image can be opened at full size, and every diagram includes editable PlantUML source.

These are models of the implementation and its intended boundaries, not live monitoring. The object and timing diagrams use illustrative values. The profile defines documentation vocabulary; it does not introduce runtime classes. The interaction overview uses named interaction steps to connect the detailed diagrams.

## Structural diagrams

### 1. Class

Content types, runtime controller/session and persisted records. [Editable source](diagrams/class.puml).

![Class diagram of the KubeQuest data and runtime model](diagrams/class.svg)

### 2. Object

An illustrative routing mission after setup, before repair. [Editable source](diagrams/object.puml).

![Object diagram showing mismatched Service and Pod labels](diagrams/object.svg)

### 3. Component

Runtime responsibilities and service dependencies. [Editable source](diagrams/component.puml).

![Component diagram of browser, backend, VM and tutor](diagrams/component.svg)

### 4. Composite structure

The parts and interfaces of the live mission workspace. [Editable source](diagrams/composite-structure.puml).

![Composite structure of the mission browser workspace](diagrams/composite-structure.svg)

### 5. Package

Source organization and package dependencies. [Editable source](diagrams/package.puml).

![Package diagram of source, content, infrastructure, tests and documentation](diagrams/package.svg)

### 6. Deployment

Production nodes, publication path and isolated guest. [Editable source](diagrams/deployment.puml).

![Deployment diagram of Cloudflare, GitHub Actions, the home server and KVM](diagrams/deployment.svg)

### 7. Profile

A small documentation profile describing simulation, authorization, disposable state and reviewed content. It is a modeling convention, not additional executable code. [Editable source](diagrams/profile.puml).

![Profile diagram of KubeQuest documentation stereotypes](diagrams/profile.svg)

## Behavioral diagrams

### 8. Use case

What visitors, the authorized owner and maintainers can do. [Editable source](diagrams/use-case.puml).

![Use-case diagram of public learning and private practice](diagrams/use-case.svg)

### 9. Activity

The steps and decisions in completing a beginner lesson. [Editable source](diagrams/activity.puml).

![Activity diagram of the beginner lesson experience](diagrams/activity.svg)

### 10. State machine

Session startup, practice, submission, errors and cleanup. Idle/Stopping are conceptual controller states; session status values are documented on the lab page. [Editable source](diagrams/state-machine.puml).

![State machine of the disposable lab session](diagrams/state-machine.svg)

### 11. Sequence

Message order for the three principal workflows.

**Google authorization.** [Editable source](diagrams/sequence-auth.puml).

![Sequence diagram of Google sign-in and private authorization](diagrams/sequence-auth.svg)

**Live practice and grading.** [Editable source](diagrams/sequence-lab.puml).

![Sequence diagram of VM startup, terminal use and grading](diagrams/sequence-lab.svg)

**CI/CD activation and rollback.** [Editable source](diagrams/sequence-deploy.puml).

![Sequence diagram of release checks, deployment and automatic rollback](diagrams/sequence-deploy.svg)

### 12. Communication

Numbered messages show how the tutor coordinates reviewed context and safe evidence. [Editable source](diagrams/communication.puml).

![Communication diagram of an authorized tutor request](diagrams/communication.svg)

### 13. Interaction overview

The complete learning journey delegates to the more detailed interaction models above. [Editable source](diagrams/interaction-overview.puml).

![Interaction overview of choosing a path and completing practice](diagrams/interaction-overview.svg)

### 14. Timing

An illustrative inactivity timeline showing warning, keepalive and renewed expiry. [Editable source](diagrams/timing.puml).

![Timing diagram of a 30-minute idle session and a keepalive](diagrams/timing.svg)

## Reproducibility

The pinned PlantUML renderer and recorded source/SVG hashes are checked by CI. See [content authoring](Content-authoring.md) for the render commands. The production build publishes the same reviewed SVG and source files under `/wiki-assets/`.
