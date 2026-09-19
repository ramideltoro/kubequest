import { ExternalLink } from "lucide-react";
import { resources, resourceKeys } from "../content/resources";
export function Resources({
  section,
  topic,
}: {
  section: string;
  topic?: string;
}) {
  return (
    <section
      className="learning-resources"
      aria-label="Suggested courses and learning resources"
    >
      <span className="eyebrow">KEEP EXPLORING</span>
      <h2>Good places to go next</h2>
      <p>
        Optional courses and guides from the people who build and teach these
        tools. Start with one that matches your curiosity.
      </p>
      <div className="resource-grid">
        {resourceKeys(section, topic).map((key) => {
          const r = resources[key];
          return (
            <a
              href={r.url}
              key={key}
              target="_blank"
              rel="noreferrer"
              className="resource-card"
            >
              <small>
                {r.provider} · {r.kind}
              </small>
              <h3>
                {r.title}{" "}
                <ExternalLink size={15} aria-label="opens in a new tab" />
              </h3>
              <p>{r.description}</p>
              <span>{r.access}</span>
            </a>
          );
        })}
      </div>
      <p className="small muted">
        External sites have their own accounts, setup steps, and terms. These
        links were reviewed in September 2026; check current course details
        before enrolling.
      </p>
    </section>
  );
}
