import { useEffect, useState } from "react";
import {
  ArrowRight,
  Play,
  RotateCcw,
  Check,
  AlertCircle,
  Minus,
  Plus,
  Power,
  Send,
  Trash2,
} from "lucide-react";
export function KIcon({
  name,
  label,
  size = 44,
}: {
  name: string;
  label?: string;
  size?: number;
}) {
  return (
    <img
      src={`/icons/${name}.svg`}
      alt={label ?? ""}
      width={size}
      height={size}
    />
  );
}
export function Simulation({
  index,
  onExplore = () => {},
}: {
  index: number;
  onExplore?: () => void;
}) {
  const [desired, setDesired] = useState(index === 0 ? 1 : index === 4 ? 0 : 2),
    [count, setCount] = useState(index === 0 ? 1 : index === 4 ? 0 : 2),
    [auto, setAuto] = useState(index !== 2 && index !== 4),
    [match, setMatch] = useState(index !== 6 && index !== 9),
    [persistent, setPersistent] = useState(false),
    [note, setNote] = useState(""),
    [saved, setSaved] = useState(""),
    [version, setVersion] = useState(1),
    [broken, setBroken] = useState(false),
    [selected, setSelected] = useState(""),
    [message, setMessage] = useState(
      "Explore the system. Every control changes this simulation.",
    ),
    [recovered, setRecovered] = useState(false);
  const mark = (s: string) => {
    setMessage(s);
    onExplore();
  };
  useEffect(() => {
    if (
      auto &&
      index !== 0 &&
      index !== 1 &&
      index !== 4 &&
      count < Math.min(desired, index === 3 ? 4 : 5)
    ) {
      const t = setTimeout(() => {
        setCount((c) => c + 1);
        setRecovered(true);
        setMessage(
          "The controller created a replacement. A real cluster also needs capacity and successful startup.",
        );
      }, 1600);
      return () => clearTimeout(t);
    }
  }, [count, desired, auto, index]);
  const managed = [2, 5].includes(index);
  const replicas = (n: number) => {
    setDesired(n);
    setCount(n);
    mark(
      `Desired copies: ${n}. The simulation has capacity for ${index === 3 ? "four" : "five"}.`,
    );
  };
  const fail = () => {
    setCount((c) => Math.max(0, c - 1));
    setRecovered(false);
    if (!persistent) setSaved("");
    mark(
      auto
        ? "One Pod disappeared. Watch the controller respond."
        : "One instance stopped. No controller is configured to replace it.",
    );
  };
  const request = () =>
    mark(
      count > 0 && match
        ? "200 OK — Little Notes answered your request."
        : "Request failed — " +
            (!count
              ? "there is no running application."
              : "the Service selector does not match the Pods."),
    );
  const reset = () => {
    setDesired(index === 0 ? 1 : index === 4 ? 0 : 2);
    setCount(index === 0 ? 1 : index === 4 ? 0 : 2);
    setAuto(index !== 2 && index !== 4);
    setMatch(index !== 6 && index !== 9);
    setPersistent(false);
    setNote("");
    setSaved("");
    setVersion(1);
    setBroken(false);
    setRecovered(false);
    setMessage("Simulation reset. Try a different prediction.");
  };
  return (
    <section className="simulation" aria-label="Interactive browser simulation">
      <div className="sim-heading">
        <span className="eyebrow">INTERACTIVE EXPLORER</span>
        <span className="tag">Browser simulation · no real cluster</span>
      </div>
      <div className="diagram">
        {index === 3 ? (
          <>
            <button
              className="diagram-object"
              onClick={() => {
                setSelected(
                  "The control plane coordinates scheduling and desired state.",
                );
                mark("The control plane does not invent spare CPU or memory.");
              }}
            >
              <KIcon name="control-plane" />
              <b>Control plane</b>
              <small>Coordinates the work</small>
            </button>
            <ArrowRight />
            <div className="node-group">
              {[0, 1].map((n) => (
                <button
                  key={n}
                  className="diagram-object"
                  onClick={() => {
                    setSelected(
                      `Node ${n + 1} runs assigned Pods; it has two slots in this simplified model.`,
                    );
                    mark(
                      "Select another component to follow its responsibility.",
                    );
                  }}
                >
                  <KIcon name="node" />
                  <b>Node {n + 1}</b>
                  <small>
                    {Math.min(2, Math.max(0, count - n * 2))}/2 slots in use
                  </small>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button
              className="diagram-object"
              onClick={() => {
                setSelected(
                  index === 0
                    ? "A visitor sends a request to the application."
                    : index === 1
                      ? "The runtime starts containers from a packaged image."
                      : index === 4
                        ? "This node runs the standalone Pod."
                        : managed
                          ? "The Deployment controller maintains the number of copies you request."
                          : "The Service selects ready Pods using labels.",
                );
                onExplore();
              }}
            >
              <KIcon
                name={
                  index === 0
                    ? "user"
                    : index === 1 || index === 4
                      ? "node"
                      : managed
                        ? "deploy"
                        : "svc"
                }
                label={
                  index === 0
                    ? "Visitor"
                    : index === 1 || index === 4
                      ? "Node"
                      : managed
                        ? "Deployment"
                        : "Service"
                }
              />
              <b>
                {index === 0
                  ? "Visitor"
                  : index === 1
                    ? "Container runtime"
                    : index === 4
                      ? "Node"
                      : managed
                        ? "Deployment"
                        : "notes Service"}
              </b>
              <small>
                {index === 0
                  ? "Sends a request"
                  : index === 1
                    ? "On a server"
                    : index === 4
                      ? "Runs Pods"
                      : managed
                        ? "Manages copies"
                        : match
                          ? "app=little-notes"
                          : "app=old-notes"}
              </small>
            </button>
            <div className={`connection ${match && count ? "connected" : ""}`}>
              <ArrowRight />
              <small>
                {managed
                  ? auto
                    ? "keeps count"
                    : "paused"
                  : index === 1 || index === 4
                    ? "runs"
                    : match && count
                      ? "traffic flows"
                      : "no route"}
              </small>
            </div>
            <div className="pod-group">
              {Array.from({ length: Math.max(count, 1) }, (_, i) => (
                <button
                  key={i}
                  className={`diagram-object pod ${count ? "" : "ghost"}`}
                  onClick={() => {
                    setSelected(
                      !count
                        ? "There is no running copy here."
                        : index === 0
                          ? "A server runs the application and responds to requests."
                          : index === 1
                            ? "This container is a running instance of the application image."
                            : "This Pod runs an application container. Its label is app=little-notes.",
                    );
                    onExplore();
                  }}
                >
                  {index !== 1 && <KIcon name={index === 0 ? "node" : "pod"} />}
                  <b>
                    {count
                      ? index === 0
                        ? "Server"
                        : index === 1
                          ? `Container ${i + 1}`
                          : `notes-${i + 1}`
                      : "No running copy"}
                  </b>
                  <span className={`status-dot ${count ? "" : "off"}`}>
                    {count
                      ? `Ready${version > 1 ? " · v" + version : ""}`
                      : "Stopped"}
                  </span>
                </button>
              ))}
              {broken && (
                <div className="diagram-object pod unhealthy">
                  <KIcon name="pod" />
                  <b>new version</b>
                  <small>Not Ready</small>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {selected && (
        <div className="selection-note">
          <AlertCircle size={16} />
          {selected}
        </div>
      )}
      <div className="sim-controls">
        {index === 0 ? (
          <>
            <button className="button primary" onClick={request}>
              <Send size={16} />
              Send request
            </button>
            <button
              className="button"
              onClick={() => {
                setCount(count ? 0 : 1);
                mark(
                  count
                    ? "Server stopped. Try sending a request."
                    : "Server started. Try again.",
                );
              }}
            >
              <Power size={16} />
              {count ? "Stop" : "Start"} server
            </button>
          </>
        ) : index === 1 ? (
          <>
            <button
              className="button primary"
              disabled={count >= 5}
              onClick={() => {
                setCount((c) => c + 1);
                mark("A new container started from the same unchanged image.");
              }}
            >
              <Plus size={16} />
              Start container
            </button>
            <button className="button" disabled={!count} onClick={fail}>
              <Minus size={16} />
              Stop one
            </button>
          </>
        ) : index === 4 ? (
          <>
            <button
              className="button primary"
              disabled={count > 0}
              onClick={() => {
                setCount(1);
                mark("One standalone Pod exists. No Deployment owns it.");
              }}
            >
              <Plus size={16} />
              Create Pod
            </button>
            <button className="button" disabled={!count} onClick={fail}>
              <Trash2 size={16} />
              Delete Pod
            </button>
          </>
        ) : (
          <>
            {[2, 3, 5, 9].includes(index) && (
              <label className="range-label">
                Desired copies <strong>{desired}</strong>
                <input
                  aria-label="Desired copies"
                  type="range"
                  min="1"
                  max={index === 3 ? 5 : 4}
                  value={desired}
                  onChange={(e) => {
                    const n = +e.target.value;
                    setDesired(n);
                    setCount(index === 3 ? Math.min(4, n) : n);
                    mark(
                      n > 4
                        ? "One Pod is Pending: all four simulated slots are occupied."
                        : `Desired state changed to ${n} copies.`,
                    );
                  }}
                />
              </label>
            )}
            {index === 2 && (
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={auto}
                  onChange={(e) => {
                    setAuto(e.target.checked);
                    mark(
                      e.target.checked
                        ? "Controller enabled. It will reconcile missing copies."
                        : "Controller disabled. You must replace failures manually.",
                    );
                  }}
                />
                Automatic recovery
              </label>
            )}
            {[6, 9].includes(index) && (
              <label className="select-label">
                Service selector
                <select
                  value={match ? "little-notes" : "old-notes"}
                  onChange={(e) => {
                    setMatch(e.target.value === "little-notes");
                    mark("The Service now selects app=" + e.target.value + ".");
                  }}
                >
                  <option value="old-notes">app=old-notes</option>
                  <option value="little-notes">app=little-notes</option>
                </select>
              </label>
            )}
            {[7, 9].includes(index) && (
              <>
                <label className="select-label">
                  Storage
                  <select
                    value={persistent ? "persistent" : "temporary"}
                    onChange={(e) => {
                      setPersistent(e.target.value === "persistent");
                      mark("Storage changed. Save a note, then replace a Pod.");
                    }}
                  >
                    <option value="temporary">Temporary — emptyDir</option>
                    <option value="persistent">Persistent — PVC</option>
                  </select>
                </label>
                <label className="note-field">
                  A note to save
                  <input
                    aria-label="Note content"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Remember this idea"
                    maxLength={80}
                  />
                </label>
                <button
                  className="button"
                  disabled={!note.trim()}
                  onClick={() => {
                    setSaved(note);
                    mark(
                      "Note saved to " +
                        (persistent
                          ? "persistent storage."
                          : "temporary storage."),
                    );
                  }}
                >
                  Save note
                </button>
              </>
            )}
            {index === 8 ? (
              <>
                <button
                  className="button primary"
                  onClick={() => {
                    setVersion((v) => v + 1);
                    setBroken(false);
                    mark(
                      "New Pods passed readiness. Traffic moved gradually to the healthy release.",
                    );
                  }}
                >
                  Release healthy version
                </button>
                <button
                  className="button"
                  onClick={() => {
                    setBroken(true);
                    mark(
                      "New Pods fail readiness. Healthy old Pods continue serving in this simulated strategy.",
                    );
                  }}
                >
                  Try broken release
                </button>
                <button
                  className="button"
                  disabled={!broken}
                  onClick={() => {
                    setBroken(false);
                    mark(
                      "Previous Pod template restored. This does not roll back application data.",
                    );
                  }}
                >
                  Roll back
                </button>
              </>
            ) : (
              index !== 3 && (
                <button className="button" disabled={!count} onClick={fail}>
                  <Power size={16} />
                  {index === 7 ? "Replace Pod" : "Break a Pod"}
                </button>
              )
            )}
            {[6, 9].includes(index) && (
              <button className="button primary" onClick={request}>
                <Send size={16} />
                Send request
              </button>
            )}
          </>
        )}
        <button
          className="icon-button reset"
          aria-label="Reset simulation"
          onClick={reset}
        >
          <RotateCcw size={18} />
        </button>
      </div>
      {[7, 9].includes(index) && (
        <div className="saved-note">
          <KIcon name={persistent ? "pvc" : "vol"} size={28} />
          <span>
            Stored note: <strong>{saved || "Nothing saved"}</strong>
          </span>
        </div>
      )}
      <div className="sim-message" aria-live="polite">
        <span className="pulse-dot" />
        {message}
      </div>
      {index === 9 && (
        <div className="goal-row">
          {[
            [count === 2 && desired === 2, "Two ready copies"],
            [match, "Matching Service"],
            [persistent && !!saved, "Saved persistent note"],
            [recovered && match, "Recovered route"],
          ].map(([done, label]) => (
            <span key={String(label)} className={done ? "done" : ""}>
              <Check size={15} />
              {label}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
