import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Lock,
  RotateCcw,
  Square,
  Check,
  Clock,
  Lightbulb,
  Send,
  Terminal as TerminalIcon,
  FileCode,
  Network,
  ChevronDown,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { EditorView, basicSetup } from "codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { missions, type Mission } from "../content/missions";
import { api, useIdentity } from "./lib";
import { KIcon } from "./simulations";
import { VisualStory } from "./VisualStory";
import { Coach } from "./Coach";
import { Resources } from "./Resources";
function LiveTerminal({ sessionId }: { sessionId: string }) {
  const el = useRef<HTMLDivElement>(null);
  const [state, setState] = useState("Connecting…"),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!el.current) return;
    const term = new Terminal({
      fontFamily: '"SFMono-Regular",Consolas,monospace',
      fontSize: 13,
      theme: {
        background: "#17130d",
        foreground: "#f4ecdf",
        cursor: "#f3bd62",
      },
      cursorBlink: true,
      scrollback: 2000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el.current);
    fit.fit();
    const ws = new WebSocket(
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/private/terminal?sessionId=${sessionId}`,
    );
    const resize = () => {
      fit.fit();
      if (ws.readyState === 1)
        ws.send(
          JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }),
        );
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el.current);
    ws.onopen = () => {
      setState("Connected to real lab");
      resize();
      term.focus();
    };
    ws.onmessage = (e) => term.write(e.data);
    ws.onclose = () => {
      setState("Disconnected");
      term.writeln(
        "\r\nTerminal disconnected. Reconnect if your session is still active.",
      );
    };
    term.onData((data) => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: "input", data }));
    });
    return () => {
      ro.disconnect();
      ws.close();
      term.dispose();
    };
  }, [sessionId, attempt]);
  return (
    <div className="terminal-panel">
      <div className="terminal-title">
        <TerminalIcon size={15} />
        <span>{state}</span>
        <button onClick={() => setAttempt((a) => a + 1)}>Reconnect</button>
      </div>
      <div className="terminal" ref={el} />
    </div>
  );
}
function YamlEditor({
  initial,
  onApply,
  disabled,
}: {
  initial: string;
  onApply: (yaml: string) => void;
  disabled: boolean;
}) {
  const el = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null);
  useEffect(() => {
    if (!el.current) return;
    view.current = new EditorView({
      doc: initial,
      extensions: [
        basicSetup,
        yaml(),
        EditorView.lineWrapping,
        EditorView.theme(
          {
            "&": { color: "#f4ecdf", backgroundColor: "#17130d" },
            ".cm-content": { caretColor: "#f3bd62" },
            ".cm-cursor": { borderLeftColor: "#f3bd62" },
            ".cm-gutters": {
              color: "#bbaf9a",
              backgroundColor: "#221c13",
              border: "none",
            },
            ".cm-activeLine, .cm-activeLineGutter": {
              backgroundColor: "#2d2417",
            },
            "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
              backgroundColor: "#51402a",
            },
          },
          { dark: true },
        ),
        syntaxHighlighting(
          HighlightStyle.define([
            { tag: [tags.propertyName, tags.keyword], color: "#f3bd62" },
            { tag: [tags.string, tags.special(tags.string)], color: "#9ac995" },
            { tag: [tags.number, tags.bool, tags.null], color: "#f0a68d" },
            { tag: tags.comment, color: "#bbaf9a" },
            { tag: [tags.punctuation, tags.meta], color: "#d9c9b2" },
          ]),
        ),
      ],
      parent: el.current,
    });
    return () => view.current?.destroy();
  }, [initial]);
  return (
    <div className="editor-panel">
      <div ref={el} />
      <div className="editor-footer">
        <span>Applies to your active lab · namespace quest</span>
        <button
          className="button primary"
          disabled={disabled}
          onClick={() => onApply(view.current!.state.doc.toString())}
        >
          Apply manifest
        </button>
      </div>
    </div>
  );
}
export function Demo({ mission }: { mission: Mission }) {
  return (
    <div className="demo">
      <video
        key={mission.id}
        controls
        preload="metadata"
        aria-label={`${mission.title} recorded walkthrough`}
      >
        <source src={`/demos/${mission.id}.mp4`} type="video/mp4" />
        <track
          default
          kind="captions"
          src={`/demos/${mission.id}.vtt`}
          srcLang="en"
          label="English"
        />
      </video>
      <p className="caption">
        Recorded in the real KubeQuest lab. Commands and output are also
        available as a transcript.
      </p>
      <details>
        <summary>Read the walkthrough transcript</summary>
        <p>{mission.brief}</p>
        <pre>{mission.solution}</pre>
        <p>{mission.why}</p>
        <a href={`/demos/${mission.id}.txt`}>Full recorded terminal output</a>
      </details>
    </div>
  );
}
export function MissionPage({ id }: { id: string }) {
  const m = missions.find((x) => x.id === id);
  const me = useIdentity();
  const [session, setSession] = useState<any>(null),
    [mode, setMode] = useState("guided"),
    [panel, setPanel] = useState("terminal"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [hint, setHint] = useState(0),
    [result, setResult] = useState<any>(null),
    [resources, setResources] = useState<any[]>([]),
    [clock, setClock] = useState(Date.now()),
    [output, setOutput] = useState(""),
    [coaching, setCoaching] = useState(false);
  useEffect(() => {
    setHint(0);
    setResult(null);
    setError("");
  }, [id]);
  useEffect(() => {
    if (!me.user) return;
    let active = true;
    const refresh = () =>
      api("/api/private/session")
        .then((j) => active && setSession(j.session))
        .catch((e) => active && setError(e.message));
    void refresh();
    const t = setInterval(refresh, 3000);
    const c = setInterval(() => setClock(Date.now()), 1000);
    return () => {
      active = false;
      clearInterval(t);
      clearInterval(c);
    };
  }, [me.user]);
  const active = session?.missionId === id;
  const ready = active && session.status === "ready";
  const timed =
    active && session.mode === "timed" && session.status !== "submitted";
  const assistance = !timed;
  const timeLeft =
    active && session.deadline
      ? Math.max(0, Math.ceil((session.deadline - clock) / 1000))
      : null;
  useEffect(() => {
    if (!active || !["ready", "submitted"].includes(session?.status)) return;
    let stopped = false,
      ws: WebSocket,
      retry: ReturnType<typeof setTimeout>;
    const connect = () => {
      ws = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/private/resources?sessionId=${session.id}`,
      );
      ws.onmessage = (e) => {
        try {
          const j = JSON.parse(e.data);
          if (j.resources) setResources(j.resources);
        } catch {}
      };
      ws.onclose = (e) => {
        if (!stopped && e.code !== 1008) retry = setTimeout(connect, 3000);
      };
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      ws.close();
      setResources([]);
    };
  }, [active, session?.id, session?.status]);
  useEffect(() => {
    if (active && session?.status === "submitted" && !result)
      api("/api/private/progress")
        .then((j) => {
          const a = j.attempts.find((a: any) => a.mission === id);
          if (a) setResult(a.results);
        })
        .catch(() => {});
  }, [active, session?.status, result, id]);
  if (!m)
    return (
      <div className="page">
        <h1>Mission not found</h1>
        <Link to="/ckad">Return to missions</Link>
      </div>
    );
  const action = async (fn: () => Promise<any>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      const j = await api("/api/private/session");
      setSession(j.session);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="mission-page">
      <Link className="back" to="/ckad">
        <ArrowLeft size={16} />
        All CKAD missions
      </Link>
      <div className="mission-heading">
        <div>
          <div className="eyebrow">
            MISSION {String(missions.indexOf(m) + 1).padStart(2, "0")} /{" "}
            {m.domain.toUpperCase()}
          </div>
          <h1>{m.title}</h1>
          <p className="lede">{m.tagline}</p>
        </div>
        <KIcon name={m.icon} size={82} />
      </div>
      <div className="mission-layout">
        <aside className="mission-brief">
          <span className="eyebrow">THE SITUATION</span>
          <p>{m.brief}</p>
          <h3>Your objectives</h3>
          <ol className="objectives">
            {m.objectives.map((o, i) => (
              <li key={o}>
                <span>{i + 1}</span>
                {o}
              </li>
            ))}
          </ol>
          <div className="meta-line">
            <Clock size={16} />
            {m.minutes} minute timed variation
          </div>
          <div className="tag">Namespace: quest</div>
          <p className="small muted">
            The lab contains intentionally broken resources. Work on the
            existing objects unless the task explicitly calls for recreation.
          </p>
          {assistance && (
            <a
              className="text-link"
              href={m.docs}
              target="_blank"
              rel="noreferrer"
            >
              Kubernetes documentation <ExternalLink size={14} />
            </a>
          )}
        </aside>
        <div className="mission-workspace">
          {assistance &&
            (!active || session.mode !== "independent" || coaching) && (
              <VisualStory id={m.id} />
            )}
          {!me.user ? (
            <>
              <div className="access-banner">
                <Lock size={22} />
                <div>
                  <h3>Only authorized users can use live labs</h3>
                  <p>
                    Explore the mission and watch the real solution below. Live
                    practice is currently available to the site owner.
                  </p>
                  <Link className="text-link" to="/signin">
                    Sign in with Google <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
              <Demo mission={m} />
            </>
          ) : (
            <>
              <div className="lab-toolbar">
                {!active ? (
                  <>
                    <label className="select-label">
                      Practice mode
                      <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                      >
                        <option value="guided">Guided learning</option>
                        <option value="independent">
                          Independent challenge
                        </option>
                        <option value="timed">Timed attempt</option>
                      </select>
                    </label>
                    <button
                      className="button primary"
                      disabled={busy || !!session || !me.labAvailable}
                      onClick={() =>
                        action(async () => {
                          setResult(null);
                          await api("/api/private/session/start", {
                            missionId: m.id,
                            mode,
                          });
                        })
                      }
                    >
                      <Play size={16} />
                      Start real lab
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className={`status-dot ${session.status === "error" ? "off" : ""}`}
                    >
                      {session.status === "starting"
                        ? "Preparing lab"
                        : session.status === "submitted"
                          ? "Attempt submitted"
                          : "Real lab · " + session.mode}
                    </span>
                    {timeLeft !== null && (
                      <b className="timer">
                        {Math.floor(timeLeft / 60)}:
                        {String(timeLeft % 60).padStart(2, "0")}
                      </b>
                    )}
                    <button
                      className="button"
                      disabled={busy || session.status === "starting"}
                      onClick={() => {
                        if (
                          confirm(
                            "Reset this lab? Your changes will be discarded and a fresh VM will start.",
                          )
                        )
                          action(async () => {
                            setResult(null);
                            await api("/api/private/session/reset", {
                              sessionId: session.id,
                            });
                          });
                      }}
                    >
                      <RotateCcw size={15} />
                      Reset
                    </button>
                    <button
                      className="button"
                      disabled={busy || session.status === "starting"}
                      onClick={() => {
                        if (confirm("Stop the lab and discard its changes?"))
                          action(() =>
                            api("/api/private/session/stop", {
                              sessionId: session.id,
                            }),
                          );
                      }}
                    >
                      <Square size={14} />
                      Stop
                    </button>
                  </>
                )}
              </div>
              {session && !active && (
                <div className="notice">
                  Another mission has an active lab.{" "}
                  <Link to={"/ckad/" + session.missionId}>
                    Return to it to stop or continue.
                  </Link>
                </div>
              )}
              {active &&
                session.expiresAt - clock < 120000 &&
                session.status === "ready" && (
                  <div className="notice">
                    Your idle lab will close in{" "}
                    {Math.max(0, Math.ceil((session.expiresAt - clock) / 1000))}{" "}
                    seconds.{" "}
                    <button
                      onClick={() =>
                        action(() =>
                          api("/api/private/session/keepalive", {
                            sessionId: session.id,
                          }),
                        )
                      }
                    >
                      Keep practicing
                    </button>
                  </div>
                )}
              {active && session.status === "starting" && (
                <div className="loading-lab">
                  <KIcon name="kubernetes" size={66} />
                  <h3>Your cluster is getting ready</h3>
                  <p>
                    A fresh VM is starting and the mission’s broken resources
                    are being created. This usually takes under two minutes.
                  </p>
                  <div className="loading-bar" />
                </div>
              )}
              {active && session.status === "error" && (
                <div className="notice">{session.message}</div>
              )}
              {ready && (
                <>
                  <div className="workspace-tabs">
                    {[
                      ["terminal", "Terminal", TerminalIcon],
                      ["yaml", "YAML editor", FileCode],
                      ["resources", "Live resources", Network],
                    ].map(([key, label, Icon]: any) => (
                      <button
                        key={key}
                        className={panel === key ? "active" : ""}
                        onClick={() => setPanel(key)}
                      >
                        <Icon size={16} />
                        {label}
                      </button>
                    ))}
                  </div>
                  {panel === "terminal" && (
                    <LiveTerminal sessionId={session.id} />
                  )}{" "}
                  {panel === "yaml" && (
                    <YamlEditor
                      initial={m.starter}
                      disabled={busy}
                      onApply={(yaml) =>
                        action(async () => {
                          const j = await api("/api/private/apply", {
                            sessionId: session.id,
                            yaml,
                          });
                          setOutput(j.output);
                        })
                      }
                    />
                  )}{" "}
                  {panel === "resources" && (
                    <div className="live-resources">
                      <p className="small muted">
                        Observed from the cluster every five seconds. Only
                        ready, matching Pods receive normal Service traffic.
                      </p>
                      <RoutingDiagram resources={resources} />
                      <div className="resource-grid">
                        {resources.map((r) => (
                          <div className="resource" key={r.kind + r.name}>
                            <KIcon name={iconFor(r.kind)} size={38} />
                            <div>
                              <b>{r.name}</b>
                              <small>{r.kind}</small>
                              <span
                                className={
                                  "status-dot " +
                                  (r.kind === "Pod" && !r.ready ? "off" : "")
                                }
                              >
                                {r.kind === "Pod"
                                  ? r.ready
                                    ? "Ready"
                                    : r.reason || r.phase
                                  : r.kind === "Deployment"
                                    ? `${r.ready}/${r.replicas} ready`
                                    : r.phase || "Observed"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <details>
                        <summary>Inspect routing labels and selectors</summary>
                        <pre>
                          {JSON.stringify(
                            resources
                              .filter((r) =>
                                ["Service", "Pod"].includes(r.kind),
                              )
                              .map((r) => ({
                                kind: r.kind,
                                name: r.name,
                                labels: r.labels,
                                selector: r.selector,
                                ready: r.ready,
                              })),
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    </div>
                  )}
                  <div className="grade-bar">
                    <span>Graded against real cluster state and behavior.</span>
                    <button
                      className="button primary"
                      disabled={busy}
                      onClick={() =>
                        action(async () =>
                          setResult(
                            await api("/api/private/grade", {
                              sessionId: session.id,
                            }),
                          ),
                        )
                      }
                    >
                      <Check size={17} />
                      {timed ? "Submit attempt" : "Check my work"}
                    </button>
                  </div>
                </>
              )}
              {!active && !session && (
                <div className="lab-intro">
                  <KIcon name="kubernetes" size={60} />
                  <h3>A real cluster. A safe place to break things.</h3>
                  <p>
                    4 vCPUs · 8 GiB RAM · Kubernetes 1.35
                    <br />
                    Approved images are preloaded. This disposable lab has no
                    external network access.
                  </p>
                </div>
              )}
              {output && (
                <details open className="command-output">
                  <summary>Manifest result</summary>
                  <pre>{output}</pre>
                </details>
              )}
              {result && (
                <section className="grade-results">
                  <h3>
                    {result.passed
                      ? "Mission accomplished"
                      : "Keep investigating"}{" "}
                    <span>{result.score}%</span>
                  </h3>
                  {result.checks.map((c: any) => (
                    <div
                      className={c.passed ? "passed" : "failed"}
                      key={c.label}
                    >
                      {c.passed ? (
                        <Check size={18} />
                      ) : (
                        <AlertCircle size={18} />
                      )}
                      <div>
                        <b>{c.label}</b>
                        <p>{c.detail}</p>
                      </div>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {assistance &&
            active &&
            session.mode === "independent" &&
            !coaching && (
              <button className="button" onClick={() => setCoaching(true)}>
                Request optional coaching
              </button>
            )}
          {assistance &&
            (!active || session.mode !== "independent" || coaching) && (
              <section className="guidance">
                <h2>Understand the fix</h2>
                <div className="hint-box">
                  <div>
                    <Lightbulb size={19} />
                    <h3>One clue at a time</h3>
                  </div>
                  <p>
                    {hint
                      ? m.hints[hint - 1]
                      : "Start with your own hypothesis. Reveal a hint when you need a direction."}
                  </p>
                  <button
                    className="button"
                    disabled={hint === m.hints.length}
                    onClick={() => setHint((h) => h + 1)}
                  >
                    {hint === m.hints.length
                      ? "All hints revealed"
                      : `Reveal hint ${hint + 1} of ${m.hints.length}`}
                  </button>
                </div>
                <details>
                  <summary>Show the explained solution</summary>
                  <pre>{m.solution}</pre>
                  <h3>Why this works</h3>
                  <p>{m.why}</p>
                </details>
                {me.user && ready && (
                  <Coach
                    key={session.id}
                    sessionId={session.id}
                    hint={m.hints[0]}
                  />
                )}
              </section>
            )}
        </div>
      </div>
      {assistance && <Resources section="ckad" />}
    </main>
  );
}
function iconFor(kind: string) {
  return (
    (
      {
        Pod: "pod",
        Deployment: "deploy",
        Service: "svc",
        Job: "job",
        PersistentVolumeClaim: "pvc",
        Ingress: "ing",
        NetworkPolicy: "netpol",
      } as any
    )[kind] || "kubernetes"
  );
}

function RoutingDiagram({ resources }: { resources: any[] }) {
  return (
    <div className="live-routing">
      {resources
        .filter((r) => r.kind === "Service")
        .map((s) => {
          const pods = resources.filter(
            (p) =>
              p.kind === "Pod" &&
              Object.keys(s.selector).length > 0 &&
              Object.entries(s.selector).every(([k, v]) => p.labels[k] === v),
          );
          return (
            <div className="routing-row" key={s.name}>
              <div className="routing-service">
                <KIcon name="svc" size={40} />
                <b>{s.name}</b>
                <small>
                  {Object.entries(s.selector)
                    .map(([k, v]) => k + "=" + v)
                    .join(", ")}
                </small>
              </div>
              <ArrowRight size={20} />
              <div className="routing-pods">
                {pods.length ? (
                  pods.map((p) => (
                    <div key={p.name} className={p.ready ? "" : "not-ready"}>
                      <KIcon name="pod" size={34} />
                      <span>{p.name}</span>
                      <small>
                        {p.ready
                          ? "Receives traffic"
                          : "Not ready · no traffic"}
                      </small>
                    </div>
                  ))
                ) : (
                  <span className="small muted">
                    No matching Pods
                    <br />
                    This Service has no route to the app.
                  </span>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
