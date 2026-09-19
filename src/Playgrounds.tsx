import { useEffect, useState } from "react";
import {
  FileText,
  ShieldCheck,
  LockKeyhole,
  Gauge,
  ArchiveRestore,
  Box,
  Terminal,
  BookOpen,
  CheckCircle2,
  Package,
  AppWindow,
  Monitor,
  Server,
  Database,
  Network,
  GitBranch,
  Workflow,
  Settings,
  Activity,
  ArrowRight,
  RotateCcw,
  Check,
  AlertCircle,
} from "lucide-react";
import { KIcon } from "./simulations";
export function TopicIcon({
  name,
  size = 42,
}: {
  name: string;
  size?: number;
}) {
  const Icon = (
    {
      "ui-file": FileText,
      "ui-shield": ShieldCheck,
      "ui-lock": LockKeyhole,
      "ui-gauge": Gauge,
      "ui-backup": ArchiveRestore,
      "ui-box": Box,
      "ui-terminal": Terminal,
      "ui-book": BookOpen,
      "ui-check": CheckCircle2,
      "ui-package": Package,
      "ui-app": AppWindow,
      "ui-browser": Monitor,
      "ui-server": Server,
      "ui-data": Database,
      "ui-network": Network,
      "ui-git": GitBranch,
      "ui-pipeline": Workflow,
      "ui-settings": Settings,
      "ui-activity": Activity,
    } as Record<string, typeof Server>
  )[name];
  return Icon ? (
    <Icon size={size} aria-hidden="true" className="topic-icon" />
  ) : (
    <KIcon name={name} size={size} />
  );
}
function Outcome({
  good,
  children,
}: {
  good: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={"experiment-result " + (good ? "good" : "")} role="status">
      {good ? <Check size={20} /> : <AlertCircle size={20} />}
      <span>{children}</span>
    </div>
  );
}
export function Playground({
  activity,
  onExplore,
}: {
  activity: string;
  onExplore: () => void;
}) {
  const [reset, setReset] = useState(0);
  return (
    <section className="playground" aria-label="Interactive browser simulation">
      <div className="playground-heading">
        <div>
          <span className="eyebrow">BROWSER SIMULATION</span>
          <p>No real servers, files, or accounts change.</p>
        </div>
        <button
          className="icon-button"
          aria-label="Reset simulation"
          onClick={() => setReset((r) => r + 1)}
        >
          <RotateCcw size={18} />
        </button>
      </div>
      <div
        key={reset}
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest("button")) onExplore();
        }}
        onChangeCapture={onExplore}
      >
        {activity === "parts" ? (
          <Parts />
        ) : ["request", "http", "dns", "ports", "orchestrate"].includes(
            activity,
          ) ? (
          <RequestLab mode={activity} />
        ) : ["process", "deploy", "config"].includes(activity) ? (
          <ServerLab mode={activity} />
        ) : activity === "git" ? (
          <GitLab />
        ) : ["build", "pipeline"].includes(activity) ? (
          <PipelineLab mode={activity} />
        ) : activity === "storage" ? (
          <StorageLab />
        ) : activity === "package" ? (
          <PackageLab />
        ) : activity === "balance" ? (
          <BalanceLab />
        ) : activity === "namespaces" ? (
          <NamespaceLab />
        ) : activity === "resources" ? (
          <BudgetLab />
        ) : activity === "jobs" ? (
          <JobLab />
        ) : (
          <DebugLab />
        )}
      </div>
    </section>
  );
}
function Parts() {
  const jobs = [
    "Show the Save button",
    "Check who may save a note",
    "Keep the saved note",
  ];
  const [job, setJob] = useState(0),
    [matched, setMatched] = useState<number[]>([]),
    [message, setMessage] = useState("Choose a job, then choose who does it.");
  return (
    <>
      <div className="experiment-controls">
        {jobs.map((j, i) => (
          <button
            className="button"
            aria-pressed={job === i}
            key={j}
            onClick={() => setJob(i)}
          >
            {matched.includes(i) && <Check size={15} />}
            {j}
          </button>
        ))}
      </div>
      <div className="flow-diagram">
        {["Frontend", "Backend", "Database"].map((p, i) => (
          <button
            key={p}
            onClick={() => {
              if (i === job) {
                setMatched((m) => [...new Set([...m, i])]);
                setMessage(
                  `${p} does this job. ${i === 1 ? "The backend must enforce permission, even when someone skips the page." : i === 2 ? "The database keeps information; it does not draw the button." : "The browser draws the interface, but it cannot be trusted to enforce private access alone."}`,
                );
              } else
                setMessage(
                  `${p} has a different job. Try ${["the page people see", "the program making decisions", "the place that keeps data"][job]}.`,
                );
            }}
          >
            <TopicIcon name={["ui-browser", "ui-server", "ui-data"][i]} />
            <b>{p}</b>
            <span>
              {
                [
                  "Shows the page",
                  "Checks and handles work",
                  "Stores the notes",
                ][i]
              }
            </span>
          </button>
        ))}
      </div>
      <Outcome good={matched.length === 3}>
        {message} {matched.length}/3 jobs matched.
      </Outcome>
    </>
  );
}
function RequestLab({ mode }: { mode: string }) {
  const [dns, setDns] = useState(mode !== "dns"),
    [port, setPort] = useState(mode === "ports" ? "3000" : "8080"),
    [allowed, setAllowed] = useState(true),
    [app, setApp] = useState(true),
    [database, setDatabase] = useState(mode !== "orchestrate"),
    [route, setRoute] = useState(mode !== "orchestrate"),
    [https, setHttps] = useState(true),
    [method, setMethod] = useState("GET"),
    [path, setPath] = useState("/notes"),
    [copies, setCopies] = useState(2),
    [auto, setAuto] = useState(false),
    [step, setStep] = useState(0),
    [notes, setNotes] = useState(1),
    [detail, setDetail] = useState(
      "Select any part of the diagram to inspect its job.",
    ),
    [result, setResult] = useState("Send a request to test the whole path."),
    [ok, setOk] = useState(false);
  useEffect(() => {
    if (mode === "orchestrate" && auto && copies < 2) {
      const t = setTimeout(() => {
        setCopies(2);
        setResult(
          "The controller replaced the failed copy. Check the route and database too.",
        );
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [auto, copies, mode]);
  const steps = ["Browser", "DNS", "Connection", "App", "Database", "Response"];
  const reason = !dns
    ? "Name lookup points to the wrong address. Correct DNS first."
    : port !== "8080"
      ? "Connection failed: no app listens on port " +
        port +
        ". The app listens on 8080."
      : !allowed
        ? "Connection blocked by the firewall. A listening app cannot answer through a blocked path."
        : !app || copies === 0
          ? "No app process is ready to answer. Restart a copy."
          : !route
            ? "Traffic is not connected to the copies. Repair the route."
            : path !== "/notes"
              ? "404 Not Found: the application answered, but does not provide this path."
              : !database
                ? "503 Service Unavailable: the app was reached, but it cannot use its database."
                : null;
  function send() {
    setStep(5);
    setOk(!reason);
    if (reason) setResult(reason);
    else {
      if (method === "POST") setNotes((n) => n + 1);
      setResult(
        method === "POST"
          ? "201 Created: the backend saved a new practice note and returned confirmation."
          : `200 OK: the response contains ${notes} saved practice note(s).`,
      );
    }
  }
  return (
    <>
      <div className="flow-diagram compact">
        {steps.map((s, i) => (
          <button
            className={step === i ? "selected" : ""}
            key={s}
            onClick={() =>
              setDetail(
                [
                  "The browser sends a message and waits for a response.",
                  "DNS looks up an address; it does not start the app.",
                  "The address, port, network route, and firewall must allow this connection.",
                  "The backend handles the requested path and checks permissions.",
                  "The database stores the note outside the browser.",
                  "The response reports the outcome. A missing reply can leave the outcome uncertain.",
                ][i],
              )
            }
          >
            <TopicIcon
              name={
                [
                  "ui-browser",
                  "ui-network",
                  "ui-network",
                  "ui-server",
                  "ui-data",
                  "ui-browser",
                ][i]
              }
              size={30}
            />
            <b>{s}</b>
          </button>
        ))}
      </div>
      <p className="diagram-detail">{detail}</p>
      <div className="experiment-controls">
        {mode === "dns" && (
          <label>
            DNS address
            <select
              aria-label="DNS address"
              value={dns ? "correct" : "wrong"}
              onChange={(e) => setDns(e.target.value === "correct")}
            >
              <option value="wrong">192.0.2.99 — old server</option>
              <option value="correct">192.0.2.10 — current server</option>
            </select>
          </label>
        )}
        {mode === "ports" && (
          <>
            <label>
              Destination port
              <select
                aria-label="Destination port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              >
                <option>3000</option>
                <option>8080</option>
              </select>
            </label>
            <button className="button" onClick={() => setAllowed((v) => !v)}>
              {allowed ? "Block firewall" : "Allow port 8080"}
            </button>
          </>
        )}
        {mode === "http" && (
          <>
            <label>
              Method
              <select
                aria-label="Method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option>GET</option>
                <option>POST</option>
              </select>
            </label>
            <label>
              Path
              <select
                aria-label="Path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
              >
                <option>/notes</option>
                <option>/missing</option>
              </select>
            </label>
            <button className="button" onClick={() => setHttps((v) => !v)}>
              {https ? "Use HTTP" : "Use HTTPS"}
            </button>
          </>
        )}
        {mode !== "orchestrate" && (
          <button className="button" onClick={() => setApp((v) => !v)}>
            {app ? "Stop application" : "Start application"}
          </button>
        )}
        {["request", "orchestrate"].includes(mode) && (
          <button className="button" onClick={() => setDatabase((v) => !v)}>
            {database ? "Disconnect database" : "Connect database"}
          </button>
        )}
        {mode === "orchestrate" && (
          <>
            <button className="button" onClick={() => setRoute((v) => !v)}>
              {route ? "Break route" : "Repair route"}
            </button>
            <button
              className="button"
              disabled={!copies}
              onClick={() => setCopies((n) => n - 1)}
            >
              Break a copy
            </button>
            <button
              className="button"
              aria-pressed={auto}
              onClick={() => setAuto((v) => !v)}
            >
              {auto ? "Disable recovery" : "Enable recovery"}
            </button>
            <span>{copies}/2 copies running</span>
          </>
        )}
      </div>
      {mode === "http" && (
        <p className="small">
          {https
            ? "HTTPS protects this connection with TLS. Permission checks are still the app’s job."
            : "HTTP alone does not encrypt these messages in transit."}{" "}
          A browser may make several requests to load one page.
        </p>
      )}
      <div className="experiment-controls">
        <button className="button primary" onClick={send}>
          Send request
        </button>
        {mode === "request" && (
          <button
            className="button"
            onClick={() => {
              const next = (step + 1) % 6;
              setStep(next);
              setDetail(
                [
                  "The client prepares the next request.",
                  "Name lookup finds an address.",
                  "The client connects to the app’s listening port.",
                  "The app checks the request.",
                  "The app asks the database to save or read data.",
                  "The response returns to the browser.",
                ][next],
              );
            }}
          >
            Follow next step <ArrowRight size={15} />
          </button>
        )}
      </div>
      <Outcome good={ok}>{result}</Outcome>
    </>
  );
}
function ServerLab({ mode }: { mode: string }) {
  const [runtime, setRuntime] = useState(mode === "config"),
    [version, setVersion] = useState(mode === "deploy" ? 0 : 1),
    [settings, setSettings] = useState(mode === "process"),
    [environment, setEnvironment] = useState("staging"),
    [database, setDatabase] = useState(
      mode === "config" ? "production" : "staging",
    ),
    [running, setRunning] = useState(false),
    [loaded, setLoaded] = useState("none"),
    [message, setMessage] = useState(
      "Inspect the ingredients before starting the app.",
    );
  function start() {
    if (!runtime) {
      setRunning(false);
      setMessage("Startup failed: the required runtime is missing.");
    } else if (!version) {
      setRunning(false);
      setMessage("Startup failed: copy a release first.");
    } else if (!settings) {
      setRunning(false);
      setMessage("Startup failed: the database setting is missing.");
    } else if (environment !== database) {
      setMessage(
        "Pre-deployment check blocked: staging must use its practice database. The running app has not been changed.",
      );
    } else if (version === 2) {
      setRunning(false);
      setMessage(
        "The new release fails its health check. Restore version 1, then start it.",
      );
    } else {
      setRunning(true);
      setLoaded(environment);
      setMessage(
        "200 OK. Version 1 is running with the " + environment + " settings.",
      );
    }
  }
  return (
    <>
      <div className="fact-grid">
        <div>
          <Server />
          <b>Files</b>
          <span>{version ? "Release v" + version : "No release copied"}</span>
        </div>
        <div>
          <Settings />
          <b>Runtime</b>
          <span>{runtime ? "Installed" : "Missing"}</span>
        </div>
        <div>
          <Activity />
          <b>Process</b>
          <span>{running ? "Running" : "Stopped"}</span>
        </div>
        <div>
          <Database />
          <b>Loaded settings</b>
          <span>{loaded}</span>
        </div>
      </div>
      <div className="experiment-controls">
        {mode !== "config" && (
          <button
            className="button"
            onClick={() => {
              setRuntime(true);
              setMessage(
                "The runtime is installed. The process still needs to be started.",
              );
            }}
          >
            Install runtime
          </button>
        )}
        {mode === "deploy" && (
          <>
            <button
              className="button"
              onClick={() => {
                setVersion(1);
                setMessage(
                  "Version 1 is copied. Copying files did not start it.",
                );
              }}
            >
              Copy working release v1
            </button>
            <button
              className="button"
              onClick={() => {
                setVersion(2);
                setMessage(
                  "Version 2 is copied. Try starting it and checking its health.",
                );
              }}
            >
              Copy broken release v2
            </button>
          </>
        )}
        {mode !== "process" && (
          <button
            className="button"
            onClick={() => {
              setSettings(true);
              setMessage(
                "Settings prepared. Restart to load them into the process.",
              );
            }}
          >
            Provide configuration
          </button>
        )}
        {mode === "config" && (
          <>
            <label>
              Environment
              <select
                aria-label="Environment"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
              >
                <option>staging</option>
                <option>production</option>
              </select>
            </label>
            <label>
              Database
              <select
                aria-label="Database"
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
              >
                <option>staging</option>
                <option>production</option>
              </select>
            </label>
          </>
        )}
        <button className="button primary" onClick={start}>
          {mode === "config"
            ? "Restart with these settings"
            : "Start and check application"}
        </button>
        <button
          className="button"
          onClick={() => {
            setRunning(false);
            setMessage(
              "The process stopped. Its code files are still on the server.",
            );
          }}
        >
          Stop process
        </button>
      </div>
      <Outcome good={running}>{message}</Outcome>
      <p className="small muted">
        This model checks one request. A real release also needs access control,
        monitoring, and a data recovery plan.
      </p>
    </>
  );
}
function GitLab() {
  const [draft, setDraft] = useState("Hello"),
    [feature, setFeature] = useState("Hello"),
    [main, setMain] = useState("Hello"),
    [remote, setRemote] = useState("Hello"),
    [commits, setCommits] = useState(["Initial greeting"]),
    [message, setMessage] = useState(
      "Edit the working file. Then record a commit.",
    );
  return (
    <>
      <label className="field">
        Working file on feature branch
        <input
          value={draft}
          maxLength={60}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
      <div className="fact-grid">
        <div>
          <GitBranch />
          <b>Feature commit</b>
          <span>{feature}</span>
        </div>
        <div>
          <GitBranch />
          <b>Local main</b>
          <span>{main}</span>
        </div>
        <div>
          <GitBranch />
          <b>Remote main</b>
          <span>{remote}</span>
        </div>
        <div>
          <Server />
          <b>Production</b>
          <span>Hello — no deployment yet</span>
        </div>
      </div>
      <div className="experiment-controls">
        <button
          className="button primary"
          onClick={() => {
            if (draft === feature) {
              setMessage("No new change to commit. Edit the greeting first.");
              return;
            }
            setFeature(draft);
            setCommits((c) => [...c, "Change greeting to " + draft]);
            setMessage(
              "Commit saved locally on the feature branch. Main and production did not change.",
            );
          }}
        >
          Commit change
        </button>
        <button
          className="button"
          onClick={() => {
            setMain(feature);
            setMessage(
              "The feature is merged into local main. It has not been pushed yet.",
            );
          }}
        >
          Merge into main
        </button>
        <button
          className="button"
          onClick={() => {
            setRemote(main);
            setMessage(
              "Remote main now has the shared version. Production still needs a deployment.",
            );
          }}
        >
          Push main
        </button>
        <button
          className="button"
          onClick={() => {
            setMain("Hello");
            setCommits((c) => [...c, "Revert greeting on main"]);
            setMessage(
              "A new revert commit restores Hello on main. Push it to share the change. Old history remains.",
            );
          }}
        >
          Revert on main
        </button>
      </div>
      <ol className="commit-list">
        {commits.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ol>
      <Outcome good={commits.length > 1}>{message}</Outcome>
      <p className="small muted">
        This is a linear, conflict-free merge example. Real conflicting edits
        need a person to resolve them. Nothing is sent to GitHub.
      </p>
    </>
  );
}
function PipelineLab({ mode }: { mode: string }) {
  const [broken, setBroken] = useState(true),
    [healthy, setHealthy] = useState(true),
    [stage, setStage] = useState(-1),
    [production, setProduction] = useState(1),
    [approved, setApproved] = useState(false),
    [message, setMessage] = useState(
      "Predict where the pipeline will stop. Then run it.",
    );
  const names =
    mode === "build"
      ? ["Install", "Build", "Test", "Package"]
      : ["Checkout", "Test", "Package", "Approval", "Deploy", "Verify"];
  function run() {
    setApproved(false);
    if (broken) {
      setStage(mode === "build" ? 2 : 1);
      setMessage(
        "Required save-note test failed. No deployable artifact is released; production stays at v" +
          production +
          ".",
      );
    } else {
      setStage(mode === "build" ? 3 : 3);
      setMessage(
        mode === "build"
          ? "Tests passed. Artifact v2 is ready; production is still unchanged."
          : "Tests passed. Artifact v2 is ready. A person must approve production in this delivery example.",
      );
    }
  }
  return (
    <>
      <div className="pipeline-diagram">
        {names.map((n, i) => (
          <div className={i === stage ? "selected" : ""} key={n}>
            <span>{i + 1}</span>
            <b>{n}</b>
            {i === stage && (
              <small>{broken ? "Stopped here" : "Reached here"}</small>
            )}
          </div>
        ))}
      </div>
      <div className="experiment-controls">
        <button
          className="button"
          onClick={() => {
            setBroken((v) => !v);
            setStage(-1);
            setApproved(false);
            setMessage(
              "The source changed. Run the tests again before releasing.",
            );
          }}
        >
          {broken ? "Repair save-note bug" : "Introduce save-note bug"}
        </button>
        <button className="button primary" onClick={run}>
          Run pipeline
        </button>
        {mode === "pipeline" && (
          <>
            <label className="check-control">
              <input
                type="checkbox"
                checked={healthy}
                onChange={(e) => {
                  setHealthy(e.target.checked);
                  setStage(-1);
                  setApproved(false);
                }}
              />
              Release passes its live health check
            </label>
            <button
              className="button"
              disabled={stage !== 3 || broken || approved}
              onClick={() => {
                setApproved(true);
                setStage(5);
                if (healthy) {
                  setProduction(2);
                  setMessage(
                    "Approved, deployed, and verified v2. Production now serves the tested artifact.",
                  );
                } else {
                  setMessage(
                    "The live health check failed. This simulation restores v1; the failed release needs investigation.",
                  );
                  setProduction(1);
                }
              }}
            >
              Approve and deploy
            </button>
          </>
        )}
      </div>
      <Outcome good={!broken && stage >= 3}>{message}</Outcome>
      <p className="small">
        Production: v{production}.{" "}
        {mode === "pipeline"
          ? "Continuous deployment would remove this manual approval, while keeping the configured checks."
          : "Building is not deploying."}
      </p>
    </>
  );
}
function StorageLab() {
  const [persistent, setPersistent] = useState(false),
    [draft, setDraft] = useState("Remember the milk"),
    [note, setNote] = useState(""),
    [backup, setBackup] = useState(""),
    [message, setMessage] = useState("Save a note, then restart the process.");
  return (
    <>
      <label className="field">
        Practice note
        <input
          value={draft}
          maxLength={80}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
      <label className="check-control">
        <input
          type="checkbox"
          checked={persistent}
          onChange={(e) => {
            setPersistent(e.target.checked);
            setNote("");
            setMessage(
              "Switched to a different empty store. Save a new note there.",
            );
          }}
        />
        Use persistent storage instead of memory
      </label>
      <div className="fact-grid">
        <div>
          <Database />
          <b>{persistent ? "Persistent store" : "Process memory"}</b>
          <span>{note || "Empty"}</span>
        </div>
        <div>
          <Database />
          <b>Separate backup</b>
          <span>{backup || "No backup"}</span>
        </div>
      </div>
      <div className="experiment-controls">
        <button
          className="button primary"
          onClick={() => {
            setNote(draft);
            setMessage(
              "Note saved in " +
                (persistent ? "persistent storage." : "process memory."),
            );
          }}
        >
          Save note
        </button>
        <button
          className="button"
          onClick={() => {
            if (!persistent) setNote("");
            setMessage(
              persistent
                ? "Process restarted. The persistent note survived."
                : "Process restarted. Its memory was cleared.",
            );
          }}
        >
          Restart app
        </button>
        <button
          className="button"
          onClick={() => {
            setBackup(note);
            setMessage(
              "Backup captured the current note. Later changes are not in this copy.",
            );
          }}
        >
          Make backup
        </button>
        <button
          className="button"
          onClick={() => {
            setNote("");
            setMessage(
              "The current note was deleted. Restarting cannot bring it back; try a backup.",
            );
          }}
        >
          Delete note
        </button>
        <button
          className="button"
          disabled={!backup}
          onClick={() => {
            setNote(backup);
            setMessage(
              "The backup was restored. Verify that it contains what you expected.",
            );
          }}
        >
          Restore backup
        </button>
      </div>
      <Outcome good={!!note}>{message}</Outcome>
    </>
  );
}
function PackageLab() {
  const [built, setBuilt] = useState(false),
    [published, setPublished] = useState(false),
    [pulled, setPulled] = useState(false),
    [running, setRunning] = useState(0),
    [message, setMessage] = useState(
      "Build an image before trying to share it.",
    );
  return (
    <>
      <div className="fact-grid">
        {[
          ["Image built", built],
          ["In registry", published],
          ["On server", pulled],
          ["Containers running", running],
        ].map(([title, value]) => (
          <div key={String(title)}>
            <Package size={32} aria-hidden="true" />
            <b>{title}</b>
            <span>
              {typeof value === "boolean" ? (value ? "Yes" : "Not yet") : value}
            </span>
          </div>
        ))}
      </div>
      <div className="experiment-controls">
        <button
          className="button"
          onClick={() => {
            setBuilt(true);
            setMessage("Image built. Nothing is running yet.");
          }}
        >
          Build image
        </button>
        <button
          className="button"
          onClick={() => {
            if (!built) {
              setMessage("There is no built image to publish.");
              return;
            }
            setPublished(true);
            setMessage("The registry now stores the image.");
          }}
        >
          Publish image
        </button>
        <button
          className="button"
          onClick={() => {
            if (!published) {
              setMessage("The requested image is not in the registry.");
              return;
            }
            setPulled(true);
            setMessage(
              "The server downloaded the image. Start a container next.",
            );
          }}
        >
          Pull onto server
        </button>
        <button
          className="button primary"
          onClick={() => {
            if (!pulled) {
              setMessage("The runtime needs the image on this server first.");
              return;
            }
            setRunning((n) => Math.min(4, n + 1));
            setMessage(
              "A new container is running from the same image. Its data is separate unless you connect storage.",
            );
          }}
        >
          Start container
        </button>
        <button
          className="button"
          disabled={!running}
          onClick={() => {
            setRunning((n) => n - 1);
            setMessage(
              "A container stopped. The image and registry copy remain.",
            );
          }}
        >
          Stop one container
        </button>
      </div>
      <Outcome good={running > 0}>{message}</Outcome>
    </>
  );
}
function BalanceLab() {
  const [copies, setCopies] = useState(1),
    [unhealthy, setUnhealthy] = useState(false),
    [check, setCheck] = useState(false),
    [message, setMessage] = useState(
      "Each healthy copy handles three requests in this simplified burst.",
    ),
    [failures, setFailures] = useState<number | null>(null);
  return (
    <>
      <div className="flow-diagram">
        <div className="flow-label">
          <Network />
          <b>Six requests</b>
        </div>
        {Array.from({ length: copies }, (_, i) => (
          <div className="flow-label" key={i}>
            <Server />
            <b>Copy {i + 1}</b>
            <span>
              {i === 0 && unhealthy ? "Not ready" : "Ready · capacity 3"}
            </span>
          </div>
        ))}
      </div>
      <div className="experiment-controls">
        <label>
          Copies
          <input
            aria-label="Number of app copies"
            type="range"
            min="1"
            max="3"
            value={copies}
            onChange={(e) => setCopies(Number(e.target.value))}
          />
        </label>
        <button className="button" onClick={() => setUnhealthy((v) => !v)}>
          {unhealthy ? "Repair first copy" : "Break first copy"}
        </button>
        <label className="check-control">
          <input
            type="checkbox"
            checked={check}
            onChange={(e) => setCheck(e.target.checked)}
          />
          Route only to ready copies
        </label>
        <button
          className="button primary"
          onClick={() => {
            const targets = Array.from({ length: copies }, (_, i) => i).filter(
              (i) => !check || !unhealthy || i !== 0,
            );
            let failed = 0;
            const load = Array(copies).fill(0);
            for (let i = 0; i < 6; i++) {
              const dest = targets[i % targets.length];
              if (
                dest === undefined ||
                (unhealthy && dest === 0) ||
                ++load[dest] > 3
              )
                failed++;
            }
            setFailures(failed);
            setMessage(
              `${6 - failed}/6 requests succeeded. ${failed ? "Inspect both usable capacity and which copies receive traffic." : "Healthy capacity handled this burst."}`,
            );
          }}
        >
          Send six requests
        </button>
      </div>
      <Outcome good={failures === 0}>{message}</Outcome>
      <p className="small muted">
        Capacity here is a teaching model, not a benchmark. Real workloads queue
        requests, vary in cost, and can share a bottleneck such as a database.
      </p>
    </>
  );
}
function NamespaceLab() {
  const [space, setSpace] = useState("practice"),
    [filter, setFilter] = useState("all"),
    [removed, setRemoved] = useState(false),
    [message, setMessage] = useState(
      "Select a namespace, then filter its Pods by a label.",
    );
  const items = [
    { space: "practice", app: "notes", name: "notes-test" },
    { space: "production", app: "notes", name: "notes-live" },
    { space: "practice", app: "shop", name: "shop-test" },
  ].filter(
    (x) =>
      x.space === space &&
      (filter === "all" || x.app === filter) &&
      !(removed && x.name === "notes-test"),
  );
  return (
    <>
      <div className="experiment-controls">
        <label>
          Namespace
          <select
            aria-label="Namespace"
            value={space}
            onChange={(e) => setSpace(e.target.value)}
          >
            <option>practice</option>
            <option>production</option>
          </select>
        </label>
        <label>
          app label
          <select
            aria-label="app label"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>all</option>
            <option>notes</option>
            <option>shop</option>
          </select>
        </label>
      </div>
      <div className="flow-diagram">
        {items.map((x) => (
          <div className="flow-label" key={x.name}>
            <KIcon name="pod" />
            <b>{x.name}</b>
            <span>app={x.app}</span>
          </div>
        ))}
        {!items.length && (
          <p>
            No Pods match this view. They may exist in a different namespace or
            have another label.
          </p>
        )}
      </div>
      <button
        className="button"
        onClick={() => {
          if (space !== "practice") {
            setMessage(
              "The exercise guard refuses to change production. A real namespace alone does not provide this guard; use authorization.",
            );
            return;
          }
          if (filter !== "notes") {
            setMessage(
              "Narrow the view to app=notes before this practice change.",
            );
            return;
          }
          setRemoved(true);
          setMessage(
            "The practice notes Pod was removed. Production was unaffected.",
          );
        }}
      >
        Remove practice notes Pod
      </button>
      <Outcome good={removed}>{message}</Outcome>
    </>
  );
}
function BudgetLab() {
  const [request, setRequest] = useState(256),
    [limit, setLimit] = useState(384),
    [use, setUse] = useState(300),
    [message, setMessage] = useState(
      "One node has 512 MiB available for the app.",
    ),
    [good, setGood] = useState(false);
  return (
    <>
      <div className="experiment-controls">
        {[
          ["Memory request", request, setRequest],
          ["Memory limit", limit, setLimit],
          ["App memory use", use, setUse],
        ].map(([label, value, set]) => (
          <label key={String(label)}>
            {String(label)}: {Number(value)} MiB
            <input
              type="range"
              min="128"
              max="768"
              step="64"
              value={Number(value)}
              onChange={(e) =>
                (set as (v: number) => void)(Number(e.target.value))
              }
            />
          </label>
        ))}
      </div>
      <div
        className="capacity-bar"
        role="img"
        aria-label={`Node capacity 512 MiB, request ${request} MiB`}
      >
        <span style={{ width: Math.min(100, (request / 512) * 100) + "%" }} />
      </div>
      <p>
        Node capacity: 512 MiB. Request: {request} MiB. Limit: {limit} MiB.
      </p>
      <button
        className="button primary"
        onClick={() => {
          const result =
            request > limit
              ? "Invalid settings: a memory request cannot exceed its limit."
              : request > 512
                ? "Pending: the scheduler has no node with enough requested capacity."
                : use > limit
                  ? "Scheduled, then OOMKilled: the app tried to use more than its memory limit."
                  : "Scheduled and running: the request fits and observed memory use stays below the limit.";
          setMessage(result);
          setGood(request <= limit && request <= 512 && use <= limit);
        }}
      >
        Schedule and run
      </button>
      <Outcome good={good}>{message}</Outcome>
      <p className="small muted">
        This exercise models memory only. CPU limits throttle work rather than
        producing this memory error. Real scheduling also considers other
        constraints.
      </p>
    </>
  );
}
function JobLab() {
  const [kind, setKind] = useState("Job"),
    [count, setCount] = useState(0),
    [failed, setFailed] = useState(false),
    [message, setMessage] = useState(
      "Little Notes needs one export, then the worker should finish.",
    );
  return (
    <>
      <label>
        Workload
        <select
          aria-label="Workload"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setCount(0);
            setFailed(false);
          }}
        >
          <option>Job</option>
          <option>Deployment</option>
        </select>
      </label>
      <div className="experiment-controls">
        <button
          className="button primary"
          disabled={kind === "Job" && count === 1 && !failed}
          onClick={() => {
            setCount((n) => n + 1);
            setFailed(false);
            setMessage(
              kind === "Job"
                ? "Job completed: the successful worker stays finished. No extra run is needed."
                : "The one-shot process finished, but a Deployment is intended to keep a service running. Its container restarts; this is the wrong fit for this task.",
            );
          }}
        >
          Run export
        </button>
        <button
          className="button"
          onClick={() => {
            setFailed(true);
            setCount(0);
            setMessage(
              "The attempt failed. A Job can retry within its configured retry limit. Make the task safe to repeat.",
            );
          }}
        >
          Fail attempt
        </button>
      </div>
      <Outcome good={kind === "Job" && count === 1 && !failed}>
        {message}
      </Outcome>
      <p>
        Completed runs in this simulation: {count}. CronJobs create Jobs on a
        schedule; timing is not a guarantee of exactly-once execution.
      </p>
    </>
  );
}
function DebugLab() {
  const [clue, setClue] = useState(""),
    [fix, setFix] = useState(""),
    [result, setResult] = useState(
      "Inspect evidence before choosing a repair.",
    );
  return (
    <>
      <div className="flow-diagram">
        {[
          ["Status", "Process Running · readiness failing"],
          [
            "Logs",
            "Cannot connect: configured database port 3000; database listens on 5432",
          ],
          ["Metrics", "CPU 10% · memory 120 MiB · requests returning 503"],
        ].map(([title, detail]) => (
          <button key={title} onClick={() => setClue(detail)}>
            <Activity />
            <b>{title}</b>
            <span>Inspect evidence</span>
          </button>
        ))}
      </div>
      <p className="diagram-detail" aria-live="polite">
        {clue || "Choose a card to read its evidence."}
      </p>
      <label>
        Proposed repair
        <select
          aria-label="Proposed repair"
          value={fix}
          onChange={(e) => setFix(e.target.value)}
        >
          <option value="">Choose a hypothesis</option>
          <option value="copies">Add more app copies</option>
          <option value="port">
            Set the database port to 5432 and reload settings
          </option>
          <option value="probe">Remove the readiness check</option>
        </select>
      </label>
      <button
        className="button primary"
        onClick={() =>
          setResult(
            fix === "port"
              ? "200 OK: after correcting the setting, the app can read its database. The readiness check now passes too."
              : fix === "copies"
                ? "503 remains: every new copy has the same wrong setting."
                : fix === "probe"
                  ? "The warning disappears, but real requests still fail. A superficial fix did not repair the connection."
                  : "Choose a repair based on the evidence first.",
          )
        }
      >
        Apply repair and verify
      </button>
      <Outcome good={result.startsWith("200")}>{result}</Outcome>
    </>
  );
}
