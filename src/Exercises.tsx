import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ExternalLink,
} from "lucide-react";
import { CurriculumBanner } from "./CurriculumBanner";
import library from "../content/ckad-exercises.json";
import { useExerciseProgress } from "./exercise-progress";

function Content({ children }: { children: string }) {
  return (
    <div className="exercise-markdown">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          pre: ({ children }) => <pre tabIndex={0}>{children}</pre>,
          table: ({ children }) => <table tabIndex={0}>{children}</table>,
          a: ({ href, children }) => (
            <a
              href={
                href && /^(https?:|#)/.test(href)
                  ? href
                  : `${library.source.repository}/blob/${library.source.revision}/${href || ""}`
              }
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
function Attribution() {
  return (
    <p className="exercise-attribution">
      Adapted from <a href={library.source.repository}>CKAD-exercises</a> by{" "}
      {library.source.author} and contributors.{" "}
      <a href="/licenses/ckad-exercises.txt">MIT license</a> · Snapshot{" "}
      {library.source.importedAt} ·{" "}
      <a href={`${library.source.repository}/tree/${library.source.revision}`}>
        Source revision {library.source.revision.slice(0, 7)}
      </a>
      .
    </p>
  );
}
export function ExerciseLibrary() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const topic = params.get("topic") || "";
  const status = params.get("status") || "";
  const { progress } = useExerciseProgress();
  const selected = library.topics.find((t) => t.id === topic);
  const practiced = Object.values(progress).filter(
    (s) => s === "practiced",
  ).length;
  const filtered = library.exercises.filter(
    (e) =>
      (!topic || e.topic === topic) &&
      (!status || (progress[e.id] || "new") === status) &&
      `${e.title} ${e.section} ${e.prompt} ${e.context} ${e.solution}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }
  return (
    <main className="page catalog exercise-library">
      <Link className="text-link" to="/ckad">
        <ArrowLeft size={16} /> CKAD Practice
      </Link>
      <div className="catalog-top">
        <div>
          <span className="eyebrow">THE COMMUNITY PRACTICE LIBRARY</span>
          <h1>
            Build fluency.
            <br />
            One task at a time.
          </h1>
          <p className="lede">
            {library.exercises.length} exercises. {library.topics.length}{" "}
            topics. Try the task, compare your solution, and keep track of what
            needs another pass.
          </p>
        </div>
        <div className="catalog-summary dark">
          <BookOpen size={42} />
          <strong>
            {practiced} / {library.exercises.length}
          </strong>
          <span>Marked practiced on this device</span>
          <small>Self-reported · no exam score</small>
        </div>
      </div>
      <CurriculumBanner />
      <details className="deeper exercise-guide">
        <summary>How to practice and prepare</summary>
        <p>
          Read the documentation links for a topic, then attempt each task
          before revealing its solution. Work through a topic in order: later
          tasks can reuse objects from earlier ones.
        </p>
        <p>
          Run commands in your own disposable practice cluster. These reference
          exercises do not start a KubeQuest lab and are not automatically
          graded. Helm, Podman, a registry, or cluster-admin access may be
          required for some topics.
        </p>
        <p>
          The imported examples retain upstream versions and assumptions. Older
          images, APIs, and chart repositories may need adapting to your
          environment. Topic groupings are the source’s organization, not
          current exam weights. Consult the{" "}
          <a href="https://training.linuxfoundation.org/certification/certified-kubernetes-application-developer-ckad/">
            current CKAD objectives
          </a>{" "}
          and{" "}
          <a href="https://docs.linuxfoundation.org/tc-docs/certification/certification-resources-allowed">
            allowed exam resources
          </a>
          .
        </p>
        <h2>Already experienced? Start with 20–30 focused hours.</h2>
        <p>
          This is a planning estimate, not an exam requirement. A 25-hour plan:
          3 hours assessing gaps, 6 refreshing unfamiliar topics, 10 doing
          hands-on drills, and 6 for timed practice and review. Adjust based on
          fresh timed practice; this library is not a complete exam simulator.
        </p>
      </details>
      <div
        className="exercise-filters"
        role="search"
        aria-label="Filter exercises"
      >
        <label>
          Search exercises
          <input
            type="search"
            value={query}
            placeholder="Try probes, secrets, or kubectl"
            onChange={(e) => filter("q", e.target.value)}
          />
        </label>
        <div>
          <label htmlFor="exercise-topic">Topic</label>
          <select
            id="exercise-topic"
            value={topic}
            onChange={(e) => filter("topic", e.target.value)}
          >
            <option value="">All topics ({library.exercises.length})</option>
            {library.topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.count})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="exercise-status">Practice status</label>
          <select
            id="exercise-status"
            value={status}
            onChange={(e) => filter("status", e.target.value)}
          >
            <option value="">Any status</option>
            <option value="new">Not started</option>
            <option value="review">Review later</option>
            <option value="practiced">Practiced</option>
          </select>
        </div>
      </div>
      {selected && (
        <details className="deeper" key={selected.id}>
          <summary>{selected.title}: notes and documentation</summary>
          {selected.introductions.map((intro, i) => (
            <section key={i}>
              <h2>{intro.title.replace(/\s*\(\d+%\)/g, "")}</h2>
              <Content>{intro.markdown}</Content>
            </section>
          ))}
        </details>
      )}
      <div className="exercise-result-heading">
        <p role="status">
          {filtered.length} {filtered.length === 1 ? "exercise" : "exercises"}{" "}
          found
        </p>
        {params.size > 0 && (
          <button className="text-button" onClick={() => setParams({})}>
            Clear filters
          </button>
        )}
      </div>
      <div className="exercise-list">
        {filtered.map((e) => (
          <Link
            className="exercise-card"
            to={`/ckad/exercises/${e.id}`}
            key={e.id}
          >
            <span className="domain-label">
              {library.topics.find((t) => t.id === e.topic)?.title} ·{" "}
              {e.section}
            </span>
            <h2>{e.title}</h2>
            <span className="exercise-card-bottom">
              <span
                className={
                  progress[e.id] === "practiced" ? "success-label" : "muted"
                }
              >
                {progress[e.id] === "practiced"
                  ? "✓ Practiced"
                  : progress[e.id] === "review"
                    ? "Review later"
                    : "Not started"}
              </span>
              <ArrowRight size={18} />
            </span>
          </Link>
        ))}
      </div>
      {!filtered.length && (
        <div className="problem">
          <h2>No matching exercises</h2>
          <p>Try another search or clear the topic and status filters.</p>
        </div>
      )}
      <Attribution />
    </main>
  );
}
export function ExerciseRoute() {
  const { id } = useParams();
  return <ExercisePage key={id} id={id || ""} />;
}
function ExercisePage({ id }: { id: string }) {
  const exercise = library.exercises.find((e) => e.id === id);
  const { progress, setStatus } = useExerciseProgress();
  const [message, setMessage] = useState("");
  const [showSolution, setShowSolution] = useState(false);
  if (!exercise)
    return (
      <main className="page">
        <h1>Exercise not found</h1>
        <Link to="/ckad/exercises">Browse all exercises</Link>
      </main>
    );
  const topic = library.topics.find((t) => t.id === exercise.topic)!;
  const siblings = library.exercises.filter((e) => e.topic === exercise.topic);
  const position = siblings.findIndex((e) => e.id === id);
  const status = progress[id];
  return (
    <main className="page exercise-detail">
      <Link className="text-link" to={`/ckad/exercises?topic=${topic.id}`}>
        <ArrowLeft size={16} /> {topic.title}
      </Link>
      <span className="eyebrow">
        EXERCISE {position + 1} OF {siblings.length} · {exercise.section}
      </span>
      <h1>{exercise.title}</h1>
      <p className="exercise-notice">
        Self-guided practice in your own disposable environment. Follow this
        topic in order; tasks may depend on earlier resources. Examples retain
        upstream versions and may need updating for your cluster.
      </p>
      {exercise.context && (
        <section className="exercise-context">
          <h2>Documentation and context</h2>
          <Content>{exercise.context}</Content>
        </section>
      )}
      {exercise.prompt && (
        <section>
          <h2>Your task</h2>
          <Content>{exercise.prompt}</Content>
        </section>
      )}
      <div className="exercise-actions">
        <button
          className="button primary"
          aria-pressed={status === "practiced"}
          onClick={() =>
            setMessage(
              setStatus(id, status === "practiced" ? undefined : "practiced")
                ? status === "practiced"
                  ? "Marked not started."
                  : "Marked practiced on this device."
                : "Your browser could not save progress. Enable local storage to keep your practice history.",
            )
          }
        >
          <Check size={17} />
          {status === "practiced" ? "Practiced" : "Mark practiced"}
        </button>
        <button
          className="button secondary"
          aria-pressed={status === "review"}
          onClick={() =>
            setMessage(
              setStatus(id, status === "review" ? undefined : "review")
                ? status === "review"
                  ? "Removed from review list."
                  : "Saved for review on this device."
                : "Your browser could not save progress. Enable local storage to keep your practice history.",
            )
          }
        >
          {status === "review" ? "Saved for review" : "Review later"}
        </button>
        <a
          className="text-link"
          href={exercise.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Original exercise <ExternalLink size={15} />
        </a>
      </div>
      <p className="small muted">
        Progress is self-reported and stored only in this browser. It does not
        count as a graded lab result.
      </p>
      <p role="status" className="exercise-save-status">
        {message}
      </p>
      <section className="exercise-solution">
        <button
          className="button secondary"
          aria-expanded={showSolution}
          aria-controls="exercise-solution-content"
          onClick={() => setShowSolution(!showSolution)}
        >
          {showSolution ? "Hide solution" : "Reveal solution"}
        </button>
        {showSolution && (
          <div id="exercise-solution-content">
            <h2>Upstream solution</h2>
            <Content>{exercise.solution}</Content>
          </div>
        )}
      </section>
      <nav className="exercise-pagination" aria-label="Exercises in this topic">
        {position > 0 ? (
          <Link
            className="text-link"
            to={`/ckad/exercises/${siblings[position - 1].id}`}
          >
            <ArrowLeft size={16} /> Previous exercise
          </Link>
        ) : (
          <span />
        )}
        {position + 1 < siblings.length ? (
          <Link
            className="text-link"
            to={`/ckad/exercises/${siblings[position + 1].id}`}
          >
            Next exercise <ArrowRight size={16} />
          </Link>
        ) : (
          <Link className="text-link" to="/ckad/exercises">
            Explore another topic <ArrowRight size={16} />
          </Link>
        )}
      </nav>
      <Attribution />
    </main>
  );
}
