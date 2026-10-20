"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  recordAssessmentEvent,
  saveAssessmentAnswer,
  startAssessment,
  submitAssessment,
} from "@/lib/practitioners/assessmentActions";
import type { CandidateQuestion } from "@/lib/practitioners/assessment";

/**
 * The candidate's screen: one question at a time, a visible timer, answers
 * saved the moment they are chosen. Leaving the tab and pasting are
 * reported to the server; they are signals for a person, never a verdict.
 */

const primary =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-primary px-6 text-sm font-semibold text-white disabled:opacity-50";
const ghost =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-brand-border-light px-5 text-sm text-brand-ink hover:border-brand-primary disabled:opacity-50";

export function StartAssessmentButton({ a, s }: { a: string; s: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <button
        type="button"
        className={primary}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await startAssessment({ a, s });
            if (res.ok) router.refresh();
            else setError(res.error);
          })
        }
      >
        {pending ? "Starting…" : "Start the assessment"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-brand-error-strong">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export default function AssessmentRunner({
  a,
  s,
  attemptId,
  expiresAt,
  questions,
  initialAnswers,
}: {
  a: string;
  s: string;
  attemptId: string;
  expiresAt: string;
  questions: CandidateQuestion[];
  initialAnswers: Record<string, string>;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(() => {
    const first = questions.findIndex((q) => !initialAnswers[q.id]);
    return first === -1 ? questions.length - 1 : first;
  });
  const [answers, setAnswers] = useState(initialAnswers);
  const [left, setLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const shownAt = useRef(0);
  const submitted = useRef(false);
  const link = { a, s, attemptId };

  const submit = () => {
    if (submitted.current) return;
    submitted.current = true;
    startSubmit(async () => {
      const res = await submitAssessment(link);
      if (res.ok) router.refresh();
      else {
        submitted.current = false;
        setError(res.error);
      }
    });
  };

  // The timer, and the automatic submission when it reaches zero.
  useEffect(() => {
    const end = new Date(expiresAt).getTime();
    const tick = () => {
      const remaining = end - Date.now();
      setLeft(remaining);
      if (remaining <= 0) submit();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  // Time on each question starts when it is shown. performance.now() shares
  // its clock with event.timeStamp, which marks the moment an answer is chosen.
  useEffect(() => {
    shownAt.current = performance.now();
  }, [index]);

  // Leaving the tab, and pasting, are recorded.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden" && !submitted.current) void recordAssessmentEvent({ ...link, kind: "blur" });
    };
    const onPaste = () => void recordAssessmentEvent({ ...link, kind: "paste" });
    document.addEventListener("visibilitychange", onHidden);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      document.removeEventListener("paste", onPaste);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const q = questions[index];
  const answered = questions.filter((x) => answers[x.id]).length;

  const choose = async (key: string, at: number) => {
    if (!q) return;
    setAnswers((prev) => ({ ...prev, [q.id]: key }));
    setError(null);
    const seconds = (at - shownAt.current) / 1000;
    shownAt.current = at;
    const res = await saveAssessmentAnswer({ ...link, questionId: q.id, key, seconds });
    if (!res.ok) setError(res.error);
  };

  if (!q) return null;
  const urgent = left !== null && left < 2 * 60_000;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-brand-gray">
          Question {index + 1} of {questions.length} · {answered} answered
        </span>
        <span role="timer" aria-live={urgent ? "polite" : "off"} className={urgent ? "font-semibold text-brand-error-strong" : "text-brand-ink"}>
          {left === null ? "" : `${clock(left)} left`}
        </span>
      </div>

      <fieldset className="rounded-2xl border border-brand-lavender/70 bg-white p-5 sm:p-6">
        <legend className="sr-only">Question {index + 1}</legend>
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-brand-ink">{q.prompt}</p>
        <div className="mt-4 space-y-2">
          {q.options.map((o) => {
            const checked = answers[q.id] === o.key;
            return (
              <label
                key={o.key}
                className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed ${
                  checked ? "border-brand-primary bg-brand-purple-soft" : "border-brand-border-light hover:border-brand-primary"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  className="mt-1"
                  checked={checked}
                  disabled={submitting}
                  onChange={(e) => void choose(o.key, e.timeStamp)}
                />
                <span>{o.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="rounded-xl bg-brand-error/10 px-4 py-2.5 text-sm text-brand-error-strong">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={ghost} disabled={index === 0 || submitting} onClick={() => setIndex((i) => i - 1)}>
          Back
        </button>
        {index < questions.length - 1 ? (
          <button type="button" className={primary} disabled={submitting} onClick={() => setIndex((i) => i + 1)}>
            Next
          </button>
        ) : (
          <button
            type="button"
            className={primary}
            disabled={submitting}
            onClick={() => {
              const missing = questions.length - answered;
              if (missing > 0 && !window.confirm(`${missing} ${missing === 1 ? "question is" : "questions are"} not answered. Send anyway?`)) return;
              submit();
            }}
          >
            {submitting ? "Sending…" : "Send my answers"}
          </button>
        )}
      </div>
    </div>
  );
}
