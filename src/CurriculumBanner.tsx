import { Link } from "react-router-dom";
export function CurriculumBanner() {
  return (
    <section className="exercise-banner">
      <div>
        <span className="eyebrow">GUIDED SKILL BUILDING</span>
        <h2>Fill four practical gaps.</h2>
        <p>
          Kustomize, RBAC, startup probes and JSONPath. Learn the idea, practice
          with guidance, then solve a new challenge.
        </p>
      </div>
      <Link className="button primary" to="/ckad/curriculum">
        Explore guided practice
      </Link>
    </section>
  );
}
