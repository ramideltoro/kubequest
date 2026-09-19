import { Link, NavLink, useParams } from "react-router-dom";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, ExternalLink } from "lucide-react";
const pages = import.meta.glob("../docs/wiki/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const chapters = [
  ["Home", "Start here"],
  ["Architecture", "Architecture"],
  ["Learning-paths", "Learning paths"],
  ["Missions", "CKAD missions"],
  ["Authentication-and-security", "Authentication & security"],
  ["Live-labs", "Live lab lifecycle"],
  ["API-and-data", "API & data"],
  ["Local-tutor", "Local AI tutor"],
  ["CI-CD", "CI/CD pipeline"],
  ["Operations", "Operations & recovery"],
  ["Content-authoring", "Content authoring"],
  ["Design-and-accessibility", "Design & accessibility"],
  ["Validation", "Validation"],
  ["UML-diagrams", "UML diagram library"],
];
export default function Wiki() {
  const { page = "Home" } = useParams();
  const content = pages[`../docs/wiki/${page}.md`];
  return (
    <main className="page wiki-layout">
      <aside className="wiki-sidebar">
        <Link className="wiki-title" to="/wiki">
          <BookOpen size={20} />
          KubeQuest wiki
        </Link>
        <nav aria-label="Wiki chapters">
          {chapters.map(([id, title]) => (
            <NavLink end key={id} to={id === "Home" ? "/wiki" : "/wiki/" + id}>
              {title}
            </NavLink>
          ))}
        </nav>
        <a
          className="wiki-source"
          href="https://github.com/ramideltoro/kubequest/tree/main/docs/wiki"
        >
          Edit on GitHub <ExternalLink size={13} />
        </a>
      </aside>
      <article className="wiki-article">
        {content ? (
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children, node, ...props }) => {
                if (href && /^[A-Za-z-]+\.md(?:#.*)?$/.test(href))
                  return (
                    <Link to={"/wiki/" + href.replace(".md", "")} {...props}>
                      {children}
                    </Link>
                  );
                if (href?.startsWith("diagrams/"))
                  return (
                    <a href={"/wiki-assets/" + href.slice(9)} {...props}>
                      {children}
                    </a>
                  );
                return (
                  <a href={href} {...props}>
                    {children}
                  </a>
                );
              },
              img: ({ src, alt, node, ...props }) => (
                <a
                  href={
                    "/wiki-assets/" + String(src).replace(/^diagrams\//, "")
                  }
                  className="wiki-diagram-link"
                  aria-label={"Open full diagram: " + alt}
                >
                  <img
                    src={
                      "/wiki-assets/" + String(src).replace(/^diagrams\//, "")
                    }
                    alt={alt}
                    loading="lazy"
                    {...props}
                  />
                </a>
              ),
              table: ({ children, node, ...props }) => (
                <div
                  className="wiki-table"
                  tabIndex={0}
                  role="region"
                  aria-label="Scrollable documentation table"
                >
                  <table {...props}>{children}</table>
                </div>
              ),
            }}
          >
            {content}
          </Markdown>
        ) : (
          <>
            <h1>That wiki page does not exist.</h1>
            <Link to="/wiki">Open the wiki index</Link>
          </>
        )}
      </article>
    </main>
  );
}
