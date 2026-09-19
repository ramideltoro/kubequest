# Design and accessibility

KubeQuest uses a dark amber palette: warm charcoal surfaces, readable ivory text, muted warm-gray supporting copy and amber actions. Semantic success and error feedback retain distinct colors and text labels. Technology logos keep their official colors.

## Design tokens

| Token | Color | Role |
| --- | --- | --- |
| Canvas | `#17130D` | Page background |
| Surface | `#221C13` | Panels and cards |
| Raised | `#2D2417` | Selected or elevated surfaces |
| Ink | `#F4ECDF` | Primary text |
| Muted | `#BBAF9A` | Supporting text |
| Amber | `#F3BD62` | Actions, links and focus |
| Line | `#51402A` | Borders |
| Success | `#9AC995` | Successful state |
| Danger | `#F0A68D` | Error state |

These tokens are in `src/style.css`. The terminal and YAML syntax theme use matching surfaces and high-contrast syntax colors. Google's approved sign-in button remains a distinct branded control.

## NutsNews-style footer

The footer adapts the actual NutsNews site structure: a compact fixed dark strip, circular Home/Search/Site menu shortcuts, a rounded navigation group and a centered copyright line linking to Rami Del Toro. KubeQuest links lead to Basics, CKAD, About, Readme, Privacy and Wiki. The site menu also exposes source and deployment links.

Search runs against local lesson and mission content. Its native dialog supports keyboard focus, Escape and a named close button. Site-menu controls expose expanded state. Page spacing reserves room for the fixed footer on desktop and mobile so final lesson controls remain reachable.

## Accessibility behavior

- A skip link, meaningful headings and named navigation regions support orientation.
- Lesson tabs use keyboard navigation and visible focus indicators.
- Native buttons, radio-like quiz choices and labeled controls are operable without a mouse.
- Simulations pair diagram changes with readable explanations; color alone does not convey correctness.
- The interface respects reduced-motion preferences.
- Recordings include English captions and full transcripts.
- Official resource symbols are paired with names, especially in beginner lessons.
- Anonymous local progress restoration does not depend on animation, audio or live-cluster availability.
- Wide wiki tables can scroll within their own container; diagrams scale and can be opened at full size.

## Verification scope

Automated Chromium checks exercise public pages at 390, 768 and 1440 pixels, detect horizontal overflow, run axe WCAG A/AA checks, complete all ten lessons, restore saved progress and operate footer controls. These checks catch many regressions but do not establish complete accessibility conformance. Manual assistive-technology testing remains valuable, especially for the desktop-focused terminal/editor workspace.

![Composite-structure diagram: live-practice workspace parts and their API/WebSocket connections](diagrams/composite-structure.svg)
