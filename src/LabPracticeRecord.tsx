import { useState } from "react";
import { useExerciseProgress } from "./exercise-progress";
import { useCurriculumProgress } from "./curriculum-progress";
export function LabPracticeRecord({
  id,
  curriculum,
}: {
  id: string;
  curriculum: boolean;
}) {
  const exercises = useExerciseProgress();
  const guides = useCurriculumProgress();
  const { progress, setStatus } = curriculum ? guides : exercises;
  const [message, setMessage] = useState("");
  function mark(status?: "practiced" | "review") {
    setMessage(
      setStatus(id, status)
        ? "Practice record saved on this device."
        : "Could not save progress in this browser.",
    );
  }
  return (
    <section className="lab-practice-record">
      <h3>Your practice record</h3>
      <p className="small muted">
        This device-local record is separate from signed-in lab grades.
      </p>
      <div className="curriculum-actions">
        <button
          className="button secondary"
          aria-pressed={progress[id] === "practiced"}
          onClick={() => mark("practiced")}
        >
          Mark practiced
        </button>
        <button
          className="button secondary"
          aria-pressed={progress[id] === "review"}
          onClick={() => mark("review")}
        >
          Review later
        </button>
        <button className="text-button" onClick={() => mark()}>
          Reset progress
        </button>
      </div>
      <p role="status">{message}</p>
    </section>
  );
}
