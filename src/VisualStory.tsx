import { useId, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  MousePointer2,
  AlertCircle,
  Check,
  ChevronDown,
} from "lucide-react";
import { visuals, type Visual } from "../content/visuals";
import { TopicIcon } from "./Playgrounds";

/** SVG is decorative; the same labeled relationships are available as real text. */
function Connections({
  visual,
  changed,
  marker,
}: {
  visual: Visual;
  changed: boolean;
  marker: string;
}) {
  const positions =
    visual.layout === "branch"
      ? [
          [108, 170],
          [360, 170],
          [612, 66],
          [612, 274],
        ]
      : [
          [126, 66],
          [594, 66],
          [594, 274],
          [126, 274],
        ];
  return (
    <svg
      className="story-wires"
      viewBox="0 0 720 340"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <marker
          id={marker}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path
            d="M 0 1 L 9 5 L 0 9"
            fill="none"
            stroke="context-stroke"
            strokeWidth="1.5"
          />
        </marker>
      </defs>
      {visual.edges.map((edge, i) => {
        const [x1, y1] = positions[edge.from],
          [x2, y2] = positions[edge.to];
        const dx = x2 - x1,
          dy = y2 - y1;
        const t = Math.min(
          dx ? 94 / Math.abs(dx) : Infinity,
          dy ? 59 / Math.abs(dy) : Infinity,
        );
        const sx = x1 + dx * t,
          sy = y1 + dy * t,
          ex = x2 - dx * t,
          ey = y2 - dy * t;
        const blocked = changed && visual.contrast?.blocked?.includes(i);
        const bypass =
          visual.layout === "branch" && edge.from === 0 && edge.to >= 2;
        const line = bypass
          ? `M202,170 Q300,${edge.to === 2 ? -8 : 348} 518,${y2}`
          : `M${sx},${sy} L${ex},${ey}`;
        return (
          <path
            key={i}
            d={line}
            className={blocked ? "wire-blocked" : ""}
            markerEnd={`url(#${marker})`}
          />
        );
      })}
    </svg>
  );
}
export function VisualStory({ id }: { id: string }) {
  const visual = visuals[id];
  return visual ? <Story key={id} visual={visual} id={id} /> : null;
}
function Story({ visual, id }: { visual: Visual; id: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [changed, setChanged] = useState(false);
  const uid = useId().replace(/:/g, "");
  const positions =
    visual.layout === "branch"
      ? [
          [15, 170],
          [50, 170],
          [85, 66],
          [85, 274],
        ]
      : [
          [17.5, 66],
          [82.5, 66],
          [82.5, 274],
          [17.5, 274],
        ];
  const node = selected === null ? null : visual.nodes[selected];
  return (
    <figure
      className="visual-story"
      data-visual={id}
      aria-labelledby={`${uid}-title`}
    >
      <figcaption className="story-heading">
        <span className="eyebrow">SEE THE CONNECTION</span>
        <h2 id={`${uid}-title`}>{visual.title}</h2>
        <p>{visual.summary}</p>
      </figcaption>
      <div className="story-tools">
        <span>
          <MousePointer2 size={14} /> Select a part to explore
        </span>
        <span className="story-kind">EXAMPLE DIAGRAM</span>
      </div>
      {visual.contrast && (
        <div className="story-switch" role="group" aria-label="Diagram view">
          <button
            aria-pressed={!changed}
            onClick={() => {
              setChanged(false);
              setSelected(null);
            }}
          >
            How it fits together
          </button>
          <button
            aria-pressed={changed}
            onClick={() => {
              setChanged(true);
              setSelected(null);
            }}
          >
            {visual.contrast.label}
          </button>
        </div>
      )}
      <div className="story-canvas">
        <Connections
          visual={visual}
          changed={changed}
          marker={`${uid}-arrow`}
        />
        {visual.edges.map((edge, i) => {
          const [x1, y1] = positions[edge.from],
            [x2, y2] = positions[edge.to];
          const blocked = changed && visual.contrast?.blocked?.includes(i);
          const bypass =
            visual.layout === "branch" && edge.from === 0 && edge.to >= 2;
          const diagonal = Math.abs(x2 - x1) > 40 && Math.abs(y2 - y1) > 150;
          return (
            <span
              aria-hidden="true"
              className={`wire-label ${blocked ? "is-blocked" : ""}`}
              key={i}
              style={{
                left: `${bypass ? 44 : (x1 + x2) / 2}%`,
                top: bypass
                  ? edge.to === 2
                    ? 44
                    : 296
                  : (y1 + y2) / 2 + (diagonal ? (i % 2 ? 18 : -18) : 0),
              }}
            >
              {blocked && <span>× </span>}
              {edge.label}
            </span>
          );
        })}
        {visual.nodes.map((part, i) => (
          <button
            key={i}
            className={`story-node ${selected === i ? "is-selected" : ""} ${changed && visual.contrast?.focus.includes(i) ? "is-highlighted" : ""}`}
            style={{ left: `${positions[i][0]}%`, top: positions[i][1] }}
            aria-pressed={selected === i}
            aria-controls={`${uid}-detail`}
            onClick={() => setSelected(i)}
          >
            <TopicIcon name={part.icon} size={38} />
            <span>
              <strong>{part.label}</strong>
              <small>{part.note}</small>
            </span>
            <span className="node-number" aria-hidden="true">
              {i + 1}
            </span>
          </button>
        ))}
      </div>
      <ul className="story-mobile-links" aria-hidden="true">
        {visual.edges.map((edge, i) => (
          <li
            key={i}
            className={
              changed && visual.contrast?.blocked?.includes(i)
                ? "is-blocked"
                : ""
            }
          >
            <b>{visual.nodes[edge.from].label}</b>
            <ArrowRight size={13} />
            {edge.label}
            <ArrowRight size={13} />
            <b>{visual.nodes[edge.to].label}</b>
            {changed && visual.contrast?.blocked?.includes(i)
              ? " · blocked"
              : ""}
          </li>
        ))}
      </ul>
      <div
        className="story-insight"
        id={`${uid}-detail`}
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="insight-icon">
          {node ? (
            <TopicIcon name={node.icon} size={24} />
          ) : changed ? (
            <AlertCircle size={22} />
          ) : (
            <MousePointer2 size={22} />
          )}
        </div>
        <div>
          <strong>
            {node
              ? node.label
              : changed
                ? visual.contrast!.label
                : "Read the arrows"}
          </strong>
          <p>
            {node
              ? node.detail
              : changed
                ? visual.contrast!.summary
                : "Each arrow names a relationship. Select a part above to find out what it does, then follow its connection to the next part."}
          </p>
        </div>
      </div>
      {selected !== null && (
        <div className="story-stepper">
          <button
            aria-label="Previous diagram part"
            onClick={() => setSelected((selected + 3) % 4)}
          >
            <ArrowLeft size={16} /> Previous
          </button>
          <span>
            {selected + 1} / {visual.nodes.length}
          </span>
          <button
            aria-label="Next diagram part"
            onClick={() => setSelected((selected + 1) % 4)}
          >
            Next part <ArrowRight size={16} />
          </button>
        </div>
      )}
      <details className="story-transcript">
        <summary>
          <ChevronDown size={15} /> Read the connections as text
        </summary>
        <ul>
          {visual.edges.map((edge, i) => (
            <li
              key={i}
              className={
                changed && visual.contrast?.blocked?.includes(i)
                  ? "is-blocked"
                  : ""
              }
            >
              <strong>{visual.nodes[edge.from].label}</strong>
              <ArrowRight size={14} />
              <span>{edge.label}</span>
              <ArrowRight size={14} />
              <strong>{visual.nodes[edge.to].label}</strong>
              {changed && visual.contrast?.blocked?.includes(i) && (
                <em>Blocked in this example</em>
              )}
            </li>
          ))}
        </ul>
        {changed && <p>{visual.contrast?.summary}</p>}
      </details>
      <p className="story-footnote">
        Simplified teaching view · Selectable with keyboard or touch · Not live
        cluster state
      </p>
    </figure>
  );
}
export function ProgressVisual({
  count,
  total,
  title,
}: {
  count: number;
  total: number;
  title: string;
}) {
  return (
    <figure
      className="progress-visual"
      aria-label={`${title}: ${count} of ${total} lessons completed`}
    >
      <div
        className="progress-dial"
        style={{
          background: `conic-gradient(var(--amber) ${(count / total) * 100}%, var(--line) 0)`,
        }}
        aria-hidden="true"
      >
        <span>
          <strong>{count}</strong>
          <small>of {total}</small>
        </span>
      </div>
      <figcaption>
        <span className="eyebrow">YOUR LEARNING, TAKING SHAPE</span>
        <h2>{title}</h2>
        <p>
          {count} completed · {total - count} still to explore
        </p>
        <div className="progress-tiles" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={i < count ? "is-complete" : ""}>
              {i < count ? <Check size={11} /> : null}
            </span>
          ))}
        </div>
      </figcaption>
    </figure>
  );
}
export function CurriculumChart({
  domains,
}: {
  domains: { name: string; weight: number }[];
}) {
  return (
    <figure
      className="curriculum-chart"
      aria-label="CKAD curriculum domain weights"
    >
      <figcaption>
        <span className="eyebrow">HOW THE CURRICULUM IS WEIGHTED</span>
        <h3>Five domains, different emphasis</h3>
        <p>
          These percentages describe the exam curriculum, not how much this
          pilot covers or your readiness for the exam.
        </p>
      </figcaption>
      <div className="curriculum-axis" aria-hidden="true">
        <span>0%</span>
        <span>5%</span>
        <span>10%</span>
        <span>15%</span>
        <span>20%</span>
        <span>25%</span>
      </div>
      {domains.map((domain) => (
        <div className="curriculum-bar" key={domain.name}>
          <span>{domain.name}</span>
          <div>
            <i style={{ width: `${(domain.weight / 25) * 100}%` }} />
          </div>
          <strong>{domain.weight}%</strong>
        </div>
      ))}
    </figure>
  );
}
