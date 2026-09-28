import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import modules from "../content/ckad-curriculum.json";
import exerciseIndex from "../content/ckad-index.json";
import { useCurriculumProgress } from "./curriculum-progress";

function Content({ children }: { children: string }) {
  return (
    <div className="exercise-markdown">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          pre: ({ children }) => <pre tabIndex={0}>{children}</pre>,
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
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
        Each lesson follows concept → worked example → guided practice →
        independent challenge → verification. Practice in your own disposable
        cluster; progress is self-reported on this device.
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
export function CurriculumRoute() {
  const { id } = useParams();
  return <CurriculumLesson key={id} id={id || ""} />;
}
function CurriculumLesson({ id }: { id: string }) {
  const lesson = modules.find((m) => m.id === id);
  const { progress, setStatus } = useCurriculumProgress();
  const [message, setMessage] = useState("");
  const [revealed, setRevealed] = useState(false);
  if (!lesson)
    return (
      <main className="page">
        <h1>Lesson not found</h1>
        <Link to="/ckad/curriculum">Browse guided practice</Link>
      </main>
    );
  const position = modules.indexOf(lesson);
  function mark(status?: "practiced" | "review") {
    setMessage(
      setStatus(id, status)
        ? "Progress saved on this device."
        : "Could not save progress. Browser storage may be unavailable.",
    );
  }
  return (
    <main className="page exercise-detail curriculum-detail">
      <Link className="text-link" to="/ckad/curriculum">
        ← Guided practice
      </Link>
      <span className="eyebrow">
        LESSON {position + 1} OF {modules.length} · {lesson.skill}
      </span>
      <h1>{lesson.title}</h1>
      <p className="lede">{lesson.objective}</p>
      <p>
        {lesson.domain} · About {lesson.minutes} minutes
      </p>
      <section className="deeper">
        <h2>Before you start</h2>
        <p>{lesson.requirements}</p>
        <p>
          Use a fresh practice namespace or working directory with the names
          shown below. Commands assume a POSIX shell.
        </p>
        <h3>Builds on</h3>
        <ul>
          {lesson.prerequisites.map((id) => (
            <li key={id}>
              <Link to={`/ckad/exercises/${id}`}>
                {exerciseIndex.exercises.find((e) => e.id === id)?.title}
              </Link>
            </li>
          ))}
        </ul>
        <p>{lesson.gap}</p>
      </section>
      <section>
        <h2>1. Understand the concept</h2>
        <Content>{lesson.concept}</Content>
      </section>
      <section>
        <h2>2. Work through an example</h2>
        <Content>{lesson.example}</Content>
      </section>
      <section>
        <h2>3. Practice with guidance</h2>
        <Content>{lesson.guided}</Content>
      </section>
      <section className="deeper">
        <h2>4. Try it independently</h2>
        <Content>{lesson.challenge}</Content>
        {lesson.hints.map((hint, i) => (
          <details key={i}>
            <summary>Hint {i + 1}</summary>
            <Content>{hint}</Content>
          </details>
        ))}
      </section>
      <section>
        <h2>5. Verify your result</h2>
        <Content>{lesson.verification}</Content>
        <p>
          Run these checks yourself. KubeQuest does not execute or grade this
          lesson.
        </p>
      </section>
      <section>
        <h2>6. Compare and understand</h2>
        <button
          className="button secondary"
          aria-expanded={revealed}
          aria-controls="curriculum-solution"
          onClick={() => setRevealed(!revealed)}
        >
          {revealed ? "Hide explained solution" : "Reveal explained solution"}
        </button>
        {revealed && (
          <div id="curriculum-solution">
            <Content>{lesson.solution}</Content>
            <h3>Common mistakes</h3>
            <Content>{lesson.mistakes}</Content>
          </div>
        )}
      </section>
      <section>
        <h2>Clean up</h2>
        <Content>{lesson.cleanup}</Content>
      </section>
      <section className="deeper">
        <h2>Your practice record</h2>
        <p>
          Mark practiced after attempting the challenge and checking the result.
        </p>
        <div className="curriculum-actions">
          <button
            className="button primary"
            aria-pressed={progress[id] === "practiced"}
            onClick={() => mark("practiced")}
          >
            Mark practiced
          </button>
          <button
            className="button secondary"
            aria-pressed={progress[id] === "review"}
            onClick={() => mark("review")}
          >
            Review later
          </button>
          <button className="text-button" onClick={() => mark()}>
            Reset progress
          </button>
        </div>
        <p role="status">{message}</p>
      </section>
      <section className="exercise-attribution">
        <h2>Sources and further reading</h2>
        <p>
          Adapted from <a href={lesson.source}>the pinned community source</a>{" "}
          by {lesson.author}.{" "}
          <a href={lesson.licensePath}>{lesson.license} license</a>.
        </p>
        <p>{lesson.changes}</p>
        <p>
          <a href={lesson.docs}>Official Kubernetes documentation</a>
        </p>
      </section>
      <nav className="curriculum-actions" aria-label="Curriculum lessons">
        {position > 0 && (
          <Link
            className="button secondary"
            to={`/ckad/curriculum/${modules[position - 1].id}`}
          >
            ← Previous lesson
          </Link>
        )}
        {position < modules.length - 1 && (
          <Link
            className="button primary"
            to={`/ckad/curriculum/${modules[position + 1].id}`}
          >
            Next lesson →
          </Link>
        )}
      </nav>
    </main>
  );
}
