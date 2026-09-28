import { lazy, Suspense } from "react";
import { Link, useParams } from "react-router-dom";
import modules from "../content/ckad-curriculum.json";
import { useCurriculumProgress } from "./curriculum-progress";

export function Curriculum() {
  const { progress } = useCurriculumProgress();
  return (
    <main className="page catalog curriculum-catalog">
      <Link className="text-link" to="/ckad/exercises">
        ← Exercise library
      </Link>
      <span className="eyebrow">CKAD · GUIDED PRACTICE</span>
      <h1>Build on what you know.</h1>
      <p className="lede">
        Four focused lessons that extend the existing library. Follow this order
        or choose the skill you need.
      </p>
      <p>
        Each lesson now opens as a complete mission: situation, objectives,
        interactive diagram, public solution video and an independently prepared
        lab. Sign in with the authorized account to practice and run the checks.
      </p>
      <p>
        Community practice adapted into a curriculum, with source links and
        explained solutions. These are not verified live-exam questions.
      </p>
      <p role="status">
        {Object.values(progress).filter((s) => s === "practiced").length} /{" "}
        {modules.length} lessons practiced
      </p>
      <div className="exercise-list">
        {modules.map((m, i) => (
          <Link
            className="exercise-card curriculum-card"
            key={m.id}
            to={`/ckad/curriculum/${m.id}`}
          >
            <span className="domain-label">
              {i + 1} · {m.domain} · About {m.minutes} min
            </span>
            <h2>{m.title}</h2>
            <p>
              <strong>{m.skill}.</strong> {m.objective}
            </p>
            <span>
              {progress[m.id] === "practiced"
                ? "✓ Practiced"
                : progress[m.id] === "review"
                  ? "Review later"
                  : "Start lesson →"}
            </span>
          </Link>
        ))}
      </div>
      <section className="deeper">
        <h2>Why only these four?</h2>
        <p>
          Pods, Jobs, storage, configuration, Helm, rollouts, canaries,
          Services, Ingress and NetworkPolicy already have exercises. Those
          remain in the <Link to="/ckad/exercises">152-exercise library</Link>.
          These lessons add distinct practice objectives and reuse that library
          for prerequisites.
        </p>
      </section>
    </main>
  );
}
const GuidedMission = lazy(() =>
  import("./Lab").then((m) => ({ default: m.MissionPage })),
);
export function CurriculumRoute() {
  const { id } = useParams();
  return (
    <Suspense fallback={<main className="page">Loading lab…</main>}>
      <GuidedMission key={id} id={id || ""} />
    </Suspense>
  );
}
