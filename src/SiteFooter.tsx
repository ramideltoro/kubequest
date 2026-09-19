import { VisualStory } from "./VisualStory";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Search, Settings2, X, ArrowUpRight } from "lucide-react";
import { lessons } from "../content/lessons";
import { foundations } from "../content/foundations";
import { missions } from "../content/missions";

export const repository = "https://github.com/ramideltoro/kubequest";
export const wiki = "https://ramideltoro.github.io/kubequest-wiki";

export function SiteFooter() {
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuPanel = useRef<HTMLDivElement>(null);
  const location = useLocation();
  useEffect(() => {
    dialog.current?.close();
    setMenu(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!menu) return;
    const dismiss = (event: PointerEvent) => {
      if (
        !menuPanel.current?.contains(event.target as Node) &&
        !menuButton.current?.contains(event.target as Node)
      )
        setMenu(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [menu]);
  const items = [
    ...foundations.map((lesson) => ({
      title: lesson.title,
      description: lesson.subtitle,
      kind: "Before Kubernetes",
      url: "/foundations/" + lesson.id,
    })),
    ...lessons.map((lesson) => ({
      title: lesson.title,
      description: lesson.subtitle,
      kind: "Kubernetes Basics",
      url: "/basics/" + lesson.id,
    })),
    ...missions.map((mission) => ({
      title: mission.title,
      description: mission.tagline,
      kind: "CKAD Practice",
      url: "/ckad/" + mission.id,
    })),
  ].filter((item) =>
    `${item.title} ${item.description} ${item.kind}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <footer className="footer-strip">
        <div className="footer-inner">
          <div className="footer-top">
            <nav className="footer-shortcuts" aria-label="Site shortcuts">
              <Link to="/" aria-label="Home">
                <Home size={16} />
              </Link>
              <button
                aria-label="Search lessons and missions"
                onClick={() => {
                  setMenu(false);
                  setQuery("");
                  dialog.current?.showModal();
                }}
              >
                <Search size={16} />
              </button>
              <button
                ref={menuButton}
                aria-label="Open site menu"
                aria-controls="footer-site-menu"
                aria-expanded={menu}
                onClick={() => setMenu(!menu)}
              >
                <Settings2 size={16} />
              </button>
            </nav>
            <nav className="footer-nav" aria-label="Footer navigation">
              <Link to="/foundations">Foundations</Link>
              <Link to="/basics">Basics</Link>
              <Link to="/ckad">CKAD</Link>
              <Link to="/about">About</Link>
              <Link to="/readme">Readme</Link>
              <Link to="/about#privacy">Privacy</Link>
              <a href={wiki}>Wiki</a>
            </nav>
          </div>
          <p className="footer-copyright">
            © {new Date().getFullYear()}{" "}
            <a href="https://www.ramideltoro.com">Rami Del Toro</a> · All Rights
            Reserved.
          </p>
        </div>
      </footer>
      {menu && (
        <div
          ref={menuPanel}
          className="footer-menu"
          id="footer-site-menu"
          aria-label="Site menu"
        >
          <strong>Explore KubeQuest</strong>
          <Link to="/progress">My progress</Link>
          <Link to="/signin">Live lab sign in</Link>
          <Link to="/readme">Project Readme</Link>
          <a href={repository}>
            Source on GitHub <ArrowUpRight size={14} />
          </a>
          <a href={repository + "/actions"}>
            Builds and deployments <ArrowUpRight size={14} />
          </a>
          <a href={wiki}>
            Documentation wiki <ArrowUpRight size={14} />
          </a>
        </div>
      )}
      <dialog
        ref={dialog}
        className="search-dialog"
        onKeyDownCapture={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            dialog.current?.close();
          }
        }}
        aria-labelledby="site-search-title"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        <div className="search-dialog-header">
          <h2 id="site-search-title">Find something to learn</h2>
          <button
            className="icon-button"
            aria-label="Close search"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <label htmlFor="site-search">Search lessons and missions</label>
        <input
          id="site-search"
          type="search"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try Pods, routing, or containers"
        />
        <p aria-live="polite">
          {items.length} {items.length === 1 ? "result" : "results"}
        </p>
        <div className="search-results">
          {items.map((item) => (
            <Link
              key={item.url}
              to={item.url}
              onClick={() => dialog.current?.close()}
            >
              <small>{item.kind}</small>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </Link>
          ))}
          {!items.length && <p>No matching lessons. Try a different word.</p>}
        </div>
      </dialog>
    </>
  );
}

export function Readme() {
  return (
    <main className="page prose-page">
      <span className="eyebrow">PROJECT README</span>
      <h1>Learn it. Break it. Understand it.</h1>
      <p>
        KubeQuest helps you understand Kubernetes by seeing what happens, trying
        a change, and learning why it worked. Start with everyday language or
        practice resolving an incident in a real cluster.
      </p>
      <div className="readme-links">
        <a className="button primary" href="https://kubequest.ramideltoro.com">
          Open the portal <ArrowUpRight size={16} />
        </a>
        <a className="button secondary" href={repository}>
          GitHub source <ArrowUpRight size={16} />
        </a>
        <a className="button secondary" href={wiki}>
          Detailed wiki <ArrowUpRight size={16} />
        </a>
      </div>
      <VisualStory id="site-journey" />
      <div className="readme-facts">
        <section>
          <h2>Before Kubernetes</h2>
          <p>
            Sixteen chapters introduce applications, servers, HTTP, networks,
            Git, CI/CD, storage, and containers. Try each idea safely in the
            browser, starting with no software engineering background.
          </p>
          <Link to="/foundations">Begin with the foundations</Link>
        </section>
        <section>
          <h2>Kubernetes Basics</h2>
          <p>
            Fourteen short visual lessons follow Little Notes, a small example
            application. Explore clickable diagrams, change replicas, simulate
            failures, and check your understanding. No account, terminal, or
            cluster required.
          </p>
          <Link to="/basics">Start learning</Link>
        </section>
        <section>
          <h2>CKAD Practice</h2>
          <p>
            Eight original incident missions offer guided, independent, and
            timed practice. Public walkthroughs show the real exercises. This
            pilot covers part of the curriculum; it is not a complete exam
            simulator.
          </p>
          <Link to="/ckad">Explore the missions</Link>
        </section>
      </div>
      <h2>Real practice, private access</h2>
      <p>
        Only authorized users can use live labs. Google sign-in protects the
        browser terminal, YAML editor, grading, private progress, and optional
        local tutor. Each session runs in a disposable Kubernetes VM. Reset
        starts fresh, and an idle session expires after 30 minutes.
      </p>
      <VisualStory id="site-access" />
      <h2>Built on the home server</h2>
      <p>
        The portal uses React and TypeScript, a Fastify backend, SQLite, and K3s
        inside KVM. A Cloudflare Tunnel publishes the site. GitHub Actions tests
        changes and deploys verified releases. Availability depends on the home
        server and its internet connection.
      </p>
      <VisualStory id="site-hosting" />
      <h2>Made to be understandable</h2>
      <p>
        Browser simulations are labeled, deeper commands are optional, and
        recordings include captions and transcripts. Diagrams use official
        Kubernetes symbols and original project artwork. Beginner progress is
        saved on this device.
      </p>
      <p>
        <a href={wiki + "/Architecture"}>Architecture and UML diagrams</a> ·{" "}
        <a href={repository + "/actions"}>CI/CD pipeline</a> ·{" "}
        <Link to="/about">Privacy and artwork credits</Link>
      </p>
      <p>
        Created by <a href="https://www.ramideltoro.com">Rami Del Toro</a>.
        Independent educational project; not affiliated with CNCF or The Linux
        Foundation.
      </p>
    </main>
  );
}
