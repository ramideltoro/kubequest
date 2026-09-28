import { lazy, Suspense } from "react";
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
import missionIndex from "../content/exercise-mission-index.json";
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
            topics. Explore each mission, watch its public solution video, and
            sign in to run the independently prepared lab.
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
          Every exercise opens as a mission with a situation, objectives, an
          interactive diagram and a public solution video. Each live lab
          prepares its own prerequisites, so you can start any task
          independently.
        </p>
        <p>
          Sign in with the authorized account to start a disposable Kubernetes
          lab, use the terminal or YAML editor, inspect live resources and check
          your work. Helm, Podman, local chart repositories and practice
          registries are supplied for the tasks that need them.
        </p>
        <p>
          The lab situation documents adaptations to older image names, external
          dependencies and cleanup steps. Original questions remain linked and
          attributed. Topic groupings are the source’s organization, not current
          exam weights. Consult the{" "}
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
            <h2>{missionIndex.find((m) => m.id === e.id)?.title || e.title}</h2>
            <p>{missionIndex.find((m) => m.id === e.id)?.tagline}</p>
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
const ExerciseMission = lazy(() =>
  import("./Lab").then((m) => ({ default: m.MissionPage })),
);
export function ExerciseRoute() {
  const { id } = useParams();
  return (
    <Suspense fallback={<main className="page">Loading lab…</main>}>
      <ExerciseMission key={id} id={id || ""} />
    </Suspense>
  );
}
