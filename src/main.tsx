import React, { useEffect, useState, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  useParams,
  useLocation,
} from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Clock,
  BookOpen,
  Terminal,
  Lock,
  ChevronRight,
  ExternalLink,
  Menu,
  X,
  Play,
  Compass,
  Layers,
  Activity,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { lessons } from "../content/lessons";
import { missions, domains } from "../content/missions";
import { KIcon, Simulation } from "./simulations";
const MissionPage = lazy(() =>
  import("./Lab").then((m) => ({ default: m.MissionPage })),
);
import {
  Identity,
  type Me,
  api,
  completedLessons,
  completeLesson,
  useIdentity,
} from "./lib";
import "./style.css";
function App() {
  const [me, setMe] = useState<Me>({
      user: null,
      authConfigured: false,
      labAvailable: false,
    }),
    [menu, setMenu] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    api("/api/me")
      .then(setMe)
      .catch(() => {});
  }, []);
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  return (
    <Identity.Provider value={me}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <Link to="/" className="wordmark" aria-label="KubeQuest home">
          kube<span>quest</span>
          <span className="wordmark-period">.</span>
        </Link>
        <button
          className="mobile-menu icon-button"
          aria-label="Toggle navigation"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
        <nav className={menu ? "open" : ""} aria-label="Main navigation">
          <NavLink to="/basics">Kubernetes Basics</NavLink>
          <NavLink to="/ckad">
            CKAD Practice <span className="tiny-tag">PILOT</span>
          </NavLink>
          <NavLink to="/progress">My progress</NavLink>
          {me.user ? (
            <button
              className="mobile-auth text-button"
              onClick={async () => {
                await api("/auth/logout", {});
                setMe({ ...me, user: null });
              }}
            >
              Sign out
            </button>
          ) : (
            <NavLink className="mobile-auth" to="/signin">
              Lab sign in
            </NavLink>
          )}
        </nav>
        <div className="header-auth">
          {me.user ? (
            <button
              className="text-button"
              onClick={async () => {
                await api("/auth/logout", {});
                setMe({ ...me, user: null });
              }}
            >
              <LogOut size={15} />
              Sign out
            </button>
          ) : (
            <Link to="/signin" className="sign-in">
              <Lock size={14} />
              Lab sign in
            </Link>
          )}
        </div>
      </header>
      <div id="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/basics" element={<Basics />} />
          <Route path="/basics/:id" element={<Lesson />} />
          <Route path="/ckad" element={<CKAD />} />
          <Route path="/ckad/:id" element={<MissionRoute />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/about" element={<About />} />
          <Route
            path="*"
            element={
              <main className="page">
                <h1>That page wandered off.</h1>
                <Link className="button primary" to="/">
                  Back to KubeQuest
                </Link>
              </main>
            }
          />
        </Routes>
      </div>
      <footer>
        <Link to="/" className="wordmark">
          kube<span>quest</span>.
        </Link>
        <p>Learn it. Break it. Understand it.</p>
        <Link to="/about">About & artwork credits</Link>
        <span>Independent learning project · Not affiliated with CNCF</span>
      </footer>
    </Identity.Provider>
  );
}
function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="small-line" />A DIFFERENT WAY TO LEARN KUBERNETES
          </div>
          <h1>
            Less memorizing.
            <br />
            More <span className="serif">“oh, I get it.”</span>
          </h1>
          <p>
            See how Kubernetes works. Make something break. Figure out why. From
            your first Pod to your next CKAD challenge.
          </p>
          <div className="hero-actions">
            <Link className="button primary large" to="/basics">
              Start from the beginning <ArrowRight size={18} />
            </Link>
            <Link className="text-link" to="/ckad">
              I know Kubernetes <ArrowRight size={16} />
            </Link>
          </div>
          <div className="hero-note">
            <Check size={15} />
            Free to explore <span />
            No setup for beginner lessons
          </div>
        </div>
        <div className="hero-visual">
          <div className="window-label">
            <span className="status-dot">A LITTLE CLUSTER. A BIG IDEA.</span>
            <KIcon name="kubernetes" size={26} />
          </div>
          <HeroDiagram />
          <div className="visual-bottom">
            <span className="mono">desired: 3</span>
            <span className="mono">ready: 3</span>
            <span className="success-label">
              <Check size={13} />
              State reconciled
            </span>
          </div>
        </div>
      </section>
      <section className="path-section page">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PICK YOUR STARTING POINT</span>
            <h2>Two paths. Same curiosity.</h2>
          </div>
          <p>
            No assumed expertise.
            <br />
            No mandatory detours.
          </p>
        </div>
        <div className="path-grid">
          <Link to="/basics" className="path-card beginner">
            <span className="path-label">
              <BookOpen size={18} />
              START HERE
            </span>
            <h3>
              Kubernetes,
              <br />
              <span className="serif">from the ground up.</span>
            </h3>
            <p>
              Plain-language lessons and interactive diagrams. Move the pieces,
              see what changes, and build a mental model that sticks.
            </p>
            <div className="path-meta">
              <span>10 visual lessons</span>
              <span>No experience needed</span>
            </div>
            <div className="path-cta">
              Explore Kubernetes Basics <ArrowRight size={21} />
            </div>
            <KIcon name="pod" size={90} />
          </Link>
          <Link to="/ckad" className="path-card advanced">
            <span className="path-label">
              <Terminal size={18} />
              PUT IT INTO PRACTICE
            </span>
            <h3>
              Real incidents.
              <br />
              <span className="serif">Real Kubernetes.</span>
            </h3>
            <p>
              Investigate a failed rollout, repair a broken route, and prove
              your fix on a live cluster. Build skill, then build speed.
            </p>
            <div className="path-meta">
              <span>8 scenario missions</span>
              <span>CKAD-aligned pilot</span>
            </div>
            <div className="path-cta">
              Explore CKAD Practice <ArrowRight size={21} />
            </div>
            <KIcon name="deploy" size={90} />
          </Link>
        </div>
      </section>
      <section className="try-section">
        <div className="page try-grid">
          <div>
            <span className="eyebrow">GET A FEEL FOR IT</span>
            <h2>
              Go ahead.
              <br />
              Break a Pod.
            </h2>
            <p>
              Ask for two copies of an app. Break one. Watch Kubernetes work
              toward the state you asked for.
            </p>
            <p className="small muted">
              This is a browser simulation. The CKAD labs run on a real
              Kubernetes cluster.
            </p>
            <Link className="text-link" to="/basics/why-kubernetes">
              Why does it come back? <ArrowRight size={16} />
            </Link>
          </div>
          <Simulation index={5} />
        </div>
      </section>
      <section className="page process">
        <span className="eyebrow">UNDERSTANDING IS THE GOAL</span>
        <h2>A little less “copy this command.”</h2>
        <div className="process-grid">
          {[
            [
              Compass,
              "Meet the problem",
              "Start with a situation that makes the concept useful.",
            ],
            [
              Layers,
              "See the moving parts",
              "Explore official Kubernetes diagrams, with every piece explained.",
            ],
            [
              Activity,
              "Make a change",
              "Predict what happens, try it, and inspect the result.",
            ],
            [
              ShieldCheck,
              "Know why it worked",
              "Leave with an explanation you can use in the next situation.",
            ],
          ].map(([Icon, t, d]: any, i) => (
            <div key={t}>
              <span className="step-number">0{i + 1}</span>
              <Icon size={23} />
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
function HeroDiagram() {
  return (
    <div className="hero-diagram">
      <div className="cluster-caption">
        <KIcon name="deploy" size={44} />
        <div>
          <b>little-notes</b>
          <small>Deployment · keep 3 copies running</small>
        </div>
      </div>
      <div className="diagram-connector">
        <span />
        <span />
        <span />
      </div>
      <div className="hero-pods">
        {[1, 2, 3].map((n) => (
          <div key={n}>
            <KIcon name="pod" size={58} />
            <b>notes-0{n}</b>
            <span className="status-dot">Ready</span>
          </div>
        ))}
      </div>
      <div className="cluster-observation">
        <Activity size={17} />
        <p>
          One copy disappears?
          <br />
          <strong>The controller creates another.</strong>
        </p>
      </div>
    </div>
  );
}
function Basics() {
  const done = completedLessons();
  return (
    <main className="page catalog">
      <div className="catalog-top">
        <div>
          <span className="eyebrow green">THE BEGINNER PATH</span>
          <h1>
            Start with curiosity.
            <br />
            We’ll bring the Kubernetes.
          </h1>
          <p className="lede">
            No containers, command lines, or cloud experience required.
            <br />
            Follow Little Notes from one app to a small, resilient system.
          </p>
          <Link
            className="button primary"
            to={
              "/basics/" +
              (lessons.find((l) => !done.includes(l.id)) || lessons[0]).id
            }
          >
            {done.length ? "Continue learning" : "Begin lesson one"}{" "}
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="catalog-summary">
          <KIcon name="kubernetes" size={72} />
          <strong>10 lessons</strong>
          <span>About 75 minutes, at your pace</span>
          <div className="progress-track">
            <i style={{ width: (done.length / 10) * 100 + "%" }} />
          </div>
          <small>{done.length} of 10 completed on this device</small>
        </div>
      </div>
      <div className="lesson-list">
        {lessons.map((l, i) => (
          <Link className="lesson-row" to={"/basics/" + l.id} key={l.id}>
            <span
              className={
                "lesson-number " + (done.includes(l.id) ? "complete" : "")
              }
            >
              {done.includes(l.id) ? (
                <Check size={18} />
              ) : (
                String(i + 1).padStart(2, "0")
              )}
            </span>
            <KIcon name={l.icon} size={42} />
            <div>
              <h3>{l.title}</h3>
              <p>{l.subtitle}</p>
            </div>
            <span className="lesson-time">
              <Clock size={14} />
              {l.minutes} min
            </span>
            <ArrowRight size={19} />
          </Link>
        ))}
      </div>
      <p className="privacy-note">
        Progress stays in this browser unless you are signed in as the owner.
        Clearing browser storage clears anonymous progress.
      </p>
    </main>
  );
}
function Lesson() {
  const { id } = useParams();
  const index = lessons.findIndex((l) => l.id === id),
    l = lessons[index],
    me = useIdentity();
  const [tab, setTab] = useState("learn"),
    [answer, setAnswer] = useState<number | null>(null),
    [explored, setExplored] = useState(false),
    [done, setDone] = useState(completedLessons());
  useEffect(() => {
    setTab("learn");
    setAnswer(null);
    setExplored(false);
    document.title = (l?.title || "Lesson") + " — KubeQuest";
  }, [id]);
  if (!l)
    return (
      <main className="page">
        <h1>Lesson not found</h1>
        <Link to="/basics">All lessons</Link>
      </main>
    );
  const complete = async () => {
    completeLesson(l.id);
    setDone(completedLessons());
    if (me.user) api("/api/private/progress", { lesson: l.id }).catch(() => {});
  };
  return (
    <main className="learning-layout">
      <aside className="lesson-sidebar">
        <Link className="back" to="/basics">
          <ArrowLeft size={15} />
          Kubernetes Basics
        </Link>
        <div className="sidebar-progress">
          <span>Your learning path</span>
          <b>{done.length}/10</b>
        </div>
        <div className="progress-track">
          <i style={{ width: done.length * 10 + "%" }} />
        </div>
        <nav aria-label="Lesson navigation">
          {lessons.map((x, i) => (
            <Link
              key={x.id}
              to={"/basics/" + x.id}
              className={id === x.id ? "current" : ""}
            >
              <span>
                {done.includes(x.id) ? (
                  <Check size={15} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              {x.title}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <BookOpen size={18} />
          <p>
            You don’t have to memorize this. Make a prediction. Try it. Come
            back when you need it.
          </p>
        </div>
      </aside>
      <article className="lesson-content">
        <div className="lesson-topline">
          <span className="eyebrow">
            LESSON {String(index + 1).padStart(2, "0")} OF 10
          </span>
          <span>
            <Clock size={14} />
            {l.minutes} min
          </span>
        </div>
        <h1>{l.title}</h1>
        <p className="lede">{l.subtitle}</p>
        <div
          className="lesson-tabs"
          role="tablist"
          aria-label="Lesson sections"
          onKeyDown={(e) => {
            const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
            if (!keys.includes(e.key)) return;
            e.preventDefault();
            const tabs = Array.from(
              e.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="tab"]',
              ),
            );
            const current = tabs.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const next =
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? tabs.length - 1
                  : (current +
                      (e.key === "ArrowRight" ? 1 : -1) +
                      tabs.length) %
                    tabs.length;
            tabs[next].focus();
            tabs[next].click();
          }}
        >
          {[
            ["learn", "1", "Understand"],
            ["try", "2", "Try it yourself"],
            ["check", "3", "Check your understanding"],
          ].map(([key, n, label]) => (
            <button
              key={key}
              id={`lesson-tab-${key}`}
              role="tab"
              aria-controls="lesson-panel"
              tabIndex={tab === key ? 0 : -1}
              aria-selected={tab === key}
              className={tab === key ? "active" : ""}
              onClick={() => setTab(key)}
            >
              <span>{n}</span>
              {label}
            </button>
          ))}
        </div>
        <div
          id="lesson-panel"
          role="tabpanel"
          aria-labelledby={`lesson-tab-${tab}`}
          tabIndex={0}
        >
          {tab === "learn" && (
            <>
              <div className="problem">
                <span className="eyebrow">PICTURE THIS</span>
                <p>{l.problem}</p>
              </div>
              <div className="learning-objectives">
                <h3>By the end, you can…</h3>
                {l.learn.map((t) => (
                  <p key={t}>
                    <Check size={16} />
                    {t}
                  </p>
                ))}
              </div>
              <div className="lesson-prose">
                {l.paragraphs.map((p, i) => (
                  <React.Fragment key={p}>
                    <p>{p}</p>
                    {i === 1 && (
                      <div className="concept-strip">
                        <KIcon name={l.icon} size={65} />
                        <div>
                          <span className="eyebrow">THE IDEA TO KEEP</span>
                          <p>{l.why}</p>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div className="analogy">
                <h3>A way to picture it</h3>
                <p>{l.analogy}</p>
              </div>
              <h3>A few useful words</h3>
              <dl className="glossary">
                {l.terms.map(([t, d]) => (
                  <div key={t}>
                    <dt>{t}</dt>
                    <dd>{d}</dd>
                  </div>
                ))}
              </dl>
              <details className="deeper">
                <summary>
                  Go deeper: what this looks like in commands or YAML
                </summary>
                <pre>{l.code}</pre>
                <a
                  className="text-link"
                  href={l.docs}
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the official documentation <ExternalLink size={14} />
                </a>
              </details>
              <button className="button primary" onClick={() => setTab("try")}>
                Let’s see it happen <ArrowRight size={17} />
              </button>
            </>
          )}
          {tab === "try" && (
            <>
              <div className="problem">
                <span className="eyebrow">YOUR EXPERIMENT</span>
                <p>{l.try}</p>
              </div>
              <Simulation
                key={id}
                index={index}
                onExplore={() => setExplored(true)}
              />
              <div className="analogy">
                <h3>What to notice</h3>
                <p>{l.why}</p>
              </div>
              <button
                className="button primary"
                onClick={() => setTab("check")}
              >
                Check what you learned <ArrowRight size={17} />
              </button>
            </>
          )}
          {tab === "check" && (
            <section className="quiz">
              <span className="eyebrow">ONE LAST THOUGHT</span>
              <h2>{l.question}</h2>
              <div className="quiz-options">
                {l.answers.map((a, i) => (
                  <button
                    key={a}
                    onClick={() => setAnswer(i)}
                    className={
                      answer === i
                        ? i === l.correct
                          ? "correct"
                          : "incorrect"
                        : ""
                    }
                  >
                    <span>
                      {answer === i && i === l.correct ? (
                        <Check size={16} />
                      ) : (
                        String.fromCharCode(65 + i)
                      )}
                    </span>
                    {a}
                  </button>
                ))}
              </div>
              {answer !== null && (
                <div
                  className={
                    "quiz-feedback " + (answer === l.correct ? "correct" : "")
                  }
                  role="status"
                >
                  <h3>
                    {answer === l.correct
                      ? "You’ve got it."
                      : "Let’s think that through."}
                  </h3>
                  <p>
                    {answer === l.correct
                      ? l.explanation
                      : "Revisit the responsibilities of each component, then try another answer."}
                  </p>
                </div>
              )}
              {!explored && !done.includes(l.id) && (
                <p className="small muted">
                  Try the visual exercise before marking this lesson complete.{" "}
                  <button className="text-button" onClick={() => setTab("try")}>
                    Open the experiment
                  </button>
                </p>
              )}
              <button
                className="button primary"
                disabled={
                  answer !== l.correct ||
                  (!explored && !done.includes(l.id)) ||
                  done.includes(l.id)
                }
                onClick={complete}
              >
                <Check size={16} />
                {done.includes(l.id)
                  ? "Lesson completed"
                  : "Mark lesson complete"}
              </button>
              {done.includes(l.id) && (
                <div className="next-lesson">
                  <h3>
                    {index === 9
                      ? "Your first Kubernetes story is complete."
                      : "Ready for the next idea?"}
                  </h3>
                  <Link
                    className="text-link"
                    to={
                      index === 9 ? "/ckad" : "/basics/" + lessons[index + 1].id
                    }
                  >
                    {index === 9
                      ? "Explore a real-cluster walkthrough"
                      : lessons[index + 1].title}
                    <ArrowRight size={17} />
                  </Link>
                </div>
              )}
            </section>
          )}
        </div>
      </article>
    </main>
  );
}
function CKAD() {
  return (
    <main className="page catalog">
      <div className="catalog-top">
        <div>
          <span className="eyebrow orange">THE PRACTICE PATH · PILOT</span>
          <h1>
            You know the commands.
            <br />
            Now meet the situation.
          </h1>
          <p className="lede">
            Eight real-cluster missions. Diagnose the cause, make a fix,
            <br />
            and prove the application works.
          </p>
          <div className="meta-line">
            <Terminal size={17} />
            Guided · Independent · Timed
          </div>
        </div>
        <div className="catalog-summary dark">
          <KIcon name="kubernetes" size={66} />
          <strong>Real Kubernetes</strong>
          <span>Disposable labs · version 1.35</span>
          <small>
            <Lock size={13} />
            Live practice is owner-only for now
          </small>
        </div>
      </div>
      <div className="mission-grid">
        {missions.map((m, i) => (
          <Link key={m.id} to={"/ckad/" + m.id} className="mission-card">
            <div className="mission-card-top">
              <span className="eyebrow">
                MISSION {String(i + 1).padStart(2, "0")}
              </span>
              <KIcon name={m.icon} size={45} />
            </div>
            <span className="domain-label">{m.domain}</span>
            <h3>{m.title}</h3>
            <p>{m.tagline}</p>
            <div className="mission-card-footer">
              <span>
                <Clock size={14} />
                {m.minutes} min
              </span>
              <span>{m.difficulty}</span>
              <ArrowRight size={17} />
            </div>
          </Link>
        ))}
      </div>
      <section className="coverage">
        <div className="section-heading">
          <div>
            <span className="eyebrow">KNOW WHAT YOU’RE PRACTICING</span>
            <h2>Your curriculum map</h2>
          </div>
          <a
            className="text-link"
            href="https://training.linuxfoundation.org/certification/certified-kubernetes-application-developer-ckad/"
            target="_blank"
            rel="noreferrer"
          >
            Official CKAD objectives <ExternalLink size={14} />
          </a>
        </div>
        <p>
          This pilot practices selected skills across all five domains. It is
          not a complete preparation course or a prediction of your exam score.
        </p>
        <div className="coverage-table">
          <div className="coverage-header">
            <span>Exam domain</span>
            <span>Practiced here</span>
            <span>Still to explore</span>
          </div>
          {domains.map((d) => (
            <div key={d.name}>
              <strong>
                {d.name}
                <small>{d.weight}% of exam curriculum</small>
              </strong>
              <span>{d.covered}</span>
              <span>{d.remaining}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
function MissionRoute() {
  const { id } = useParams();
  return (
    <Suspense fallback={<main className="page">Loading mission…</main>}>
      <MissionPage key={id} id={id || ""} />
    </Suspense>
  );
}
function SignIn() {
  const me = useIdentity();
  return (
    <main className="signin-page">
      <div className="signin-card">
        <KIcon name="kubernetes" size={64} />
        <span className="eyebrow">YOUR HANDS-ON WORKSPACE</span>
        <h1>Step into the lab.</h1>
        <p>
          Google sign-in opens the real cluster, saved practice history, and
          local AI tutor for authorized users.
        </p>
        {location.search.includes("error=") && (
          <p className="error" role="alert">
            Sign-in could not be completed. Only the authorized owner account
            can access live practice.
          </p>
        )}
        {me.user ? (
          <Link className="button primary" to="/ckad">
            Go to CKAD Practice <ArrowRight size={17} />
          </Link>
        ) : (
          <a className="google-button" href="/auth/google">
            <img src="/icons/google-g.png" alt="" width="20" height="20" />
            Sign in with Google
          </a>
        )}
        <p className="small muted">
          Live access is currently limited to the site owner.
        </p>
        <div className="signin-divider" />
        <h3>Just here to learn?</h3>
        <p>
          Every beginner lesson, visual exercise, and recorded mission is free
          to explore without an account.
        </p>
        <Link className="text-link" to="/basics">
          Explore Kubernetes Basics <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  );
}
function Progress() {
  const me = useIdentity();
  const [done, setDone] = useState(completedLessons()),
    [attempts, setAttempts] = useState<any[]>([]);
  useEffect(() => {
    if (me.user)
      api("/api/private/progress")
        .then((j) => {
          setAttempts(j.attempts);
          setDone([
            ...new Set([...completedLessons(), ...j.lessons]),
          ] as string[]);
        })
        .catch(() => {});
  }, [me.user]);
  return (
    <main className="page catalog">
      <span className="eyebrow">ONE IDEA AT A TIME</span>
      <h1>Your progress</h1>
      <div className="progress-summary">
        <KIcon name="kubernetes" size={58} />
        <div>
          <h2>{done.length} of 10 lessons completed</h2>
          <p>
            Understanding grows with practice. Pick up wherever you left off.
          </p>
          <div className="progress-track">
            <i style={{ width: done.length * 10 + "%" }} />
          </div>
        </div>
      </div>
      <div className="lesson-list">
        {lessons.map((l, i) => (
          <Link className="lesson-row" key={l.id} to={"/basics/" + l.id}>
            <span
              className={
                "lesson-number " + (done.includes(l.id) ? "complete" : "")
              }
            >
              {done.includes(l.id) ? <Check size={18} /> : i + 1}
            </span>
            <div>
              <h3>{l.title}</h3>
              <p>{done.includes(l.id) ? "Completed" : "Ready when you are"}</p>
            </div>
            <ArrowRight size={17} />
          </Link>
        ))}
      </div>
      <h2 className="history-title">Practice history</h2>
      {!me.user ? (
        <p>
          Sign in as the owner to view saved real-cluster attempts. Beginner
          progress is stored on this device.
        </p>
      ) : attempts.length ? (
        <div className="attempt-list">
          {attempts.map((a) => (
            <Link to={"/ckad/" + a.mission} key={a.id}>
              <span>{missions.find((m) => m.id === a.mission)?.title}</span>
              <span>
                {a.mode} · {Math.floor(a.seconds / 60)}m {a.seconds % 60}s
              </span>
              <strong>{a.results.score}%</strong>
              <small>{new Date(a.completed_at).toLocaleDateString()}</small>
            </Link>
          ))}
        </div>
      ) : (
        <p>
          No live attempts yet. Start a mission and check your work to record an
          attempt.
        </p>
      )}
    </main>
  );
}
function About() {
  return (
    <main className="page prose-page">
      <span className="eyebrow">ABOUT KUBEQUEST</span>
      <h1>Built for understanding.</h1>
      <p>
        KubeQuest is an independent learning project. Kubernetes Basics is a
        visual introduction for people with no infrastructure background. CKAD
        Practice is a pilot set of original scenarios, not an official exam
        simulator or an exam-question collection.
      </p>
      <h2>Real symbols for real concepts</h2>
      <p>
        Kubernetes resource symbols come from the{" "}
        <a href="https://github.com/kubernetes/community/tree/main/icons">
          official Kubernetes community icon set
        </a>
        . Kubernetes and Helm logos come from{" "}
        <a href="https://github.com/cncf/artwork">CNCF artwork</a>. Google’s
        sign-in mark follows its identity guidelines. Interface controls use
        Lucide icons under the ISC license.
      </p>
      <p>
        Artwork remains the property of its respective owners. Its use
        identifies the technologies being taught and does not imply endorsement.
      </p>
      <a href="/icons/sources.json">Asset sources and checksums</a>
      <h2>What happens to your data?</h2>
      <p>
        Anonymous lesson progress stays in your browser’s local storage. Google
        sign-in is restricted to the owner; private lesson completion and
        mission results are stored on the hosting server. Tutor questions are
        processed by the local model. The app does not persist terminal
        transcripts or tutor conversations. Lesson examples use practice-only
        credentials.
      </p>
      <h2>Lab limits</h2>
      <p>
        Live practice uses one disposable VM with a single-node Kubernetes
        cluster. Images are preloaded; external networking is disabled. Idle
        sessions expire after 30 minutes. Resets discard workload changes.
        Public diagrams are explicitly labeled simulations, and walkthroughs are
        recordings from the real lab.
      </p>
      <h2>Learn from the source</h2>
      <p>
        <a href="https://kubernetes.io/docs/">Kubernetes documentation</a> ·{" "}
        <a href="https://training.linuxfoundation.org/certification/certified-kubernetes-application-developer-ckad/">
          Official CKAD curriculum
        </a>
      </p>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
