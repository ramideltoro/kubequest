import { useEffect, useRef, useState } from "react";
import { Send, Square } from "lucide-react";

export function Coach({
  sessionId,
  hint,
}: {
  sessionId: string;
  hint: string;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), [sessionId]);
  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setAnswer("");
    setFallback(false);
    setSeconds(0);
    setStatus("Connecting to your local coach…");
    const started = Date.now();
    const ticker = setInterval(
      () => setSeconds(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    const timeout = setTimeout(
      () => controller.abort(new Error("timeout")),
      75000,
    );
    try {
      const response = await fetch("/api/private/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ sessionId, question, stream: true }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw Error(error.error || "The coach could not connect.");
      }
      if (!response.body) throw Error("The answer stream could not open.");
      const reader = response.body.getReader(),
        decoder = new TextDecoder();
      let buffer = "",
        text = "",
        complete = false;
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        buffer += decoder.decode(part.value, { stream: true });
        let end;
        while ((end = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, end);
          buffer = buffer.slice(end + 1);
          if (!line.trim()) continue;
          const item = JSON.parse(line);
          if (item.type === "status") setStatus(item.message);
          if (item.type === "token") {
            text += item.text;
            setAnswer(text);
            setStatus("Writing your answer…");
          }
          if (item.type === "done") {
            complete = true;
            setAnswer(item.answer);
            setFallback(item.fallback);
            setStatus(
              item.reason ||
                `Answer ready in ${(item.elapsedMs / 1000).toFixed(1)} seconds.`,
            );
          }
        }
      }
      if (!complete)
        throw Error(
          "The connection ended before the answer finished. Please try again.",
        );
    } catch (error) {
      if (controller.signal.aborted)
        setStatus(
          controller.signal.reason?.message === "timeout"
            ? "The request timed out. Try again or use the reviewed hint below."
            : "Answer stopped. You can ask another question.",
        );
      else
        setStatus(
          error instanceof Error
            ? error.message
            : "The coach could not connect. Please try again.",
        );
    } finally {
      clearInterval(ticker);
      clearTimeout(timeout);
      if (active.current === controller) active.current = null;
      setBusy(false);
    }
  }
  return (
    <div className="tutor">
      <h3>Talk it through</h3>
      <p className="small muted">
        Local AI coach · answers appear as they are written. Suggestions can be
        wrong; your grade comes from lab checks.
      </p>
      <div className="coach-prompts" aria-label="Question starters">
        {[
          "What should I check first, and why?",
          "Explain the main idea in simple terms.",
          "What does the current lab state tell us?",
        ].map((q) => (
          <button
            type="button"
            className="text-button"
            key={q}
            onClick={() => setQuestion(q)}
            disabled={busy}
          >
            {q}
          </button>
        ))}
      </div>
      <form onSubmit={ask}>
        <input
          aria-label="Question for the tutor"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={1500}
          placeholder="Why is this Pod running but not ready?"
          required
        />
        <button className="button primary" disabled={busy || !question.trim()}>
          <Send size={16} />
          {busy ? "Answering…" : "Ask"}
        </button>
        {busy && (
          <button
            type="button"
            className="button"
            onClick={() => active.current?.abort()}
          >
            <Square size={15} />
            Stop answer
          </button>
        )}
      </form>
      <p role="status" className="small coach-status">
        {status}
        {busy && ` · ${seconds}s`}
      </p>
      {answer && (
        <div
          className="tutor-answer"
          aria-label={
            fallback ? "Reviewed fallback explanation" : "Coach answer"
          }
        >
          <strong>{fallback ? "Reviewed explanation" : "Coach answer"}</strong>
          <p>{answer}</p>
        </div>
      )}
      <details>
        <summary>Use a reviewed hint right away</summary>
        <p>{hint}</p>
      </details>
    </div>
  );
}
