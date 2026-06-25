"use client";

import { useRef, useState } from "react";
import {
  generatePitch,
  type PitchResult,
  type RecentPitch,
} from "@/lib/pitch";
import { pickTwoMovies } from "@/lib/movies";

/** First sentence of a synopsis, trimmed — a compact logline for session memory. */
function toLogline(synopsis: string): string {
  const firstSentence = synopsis.split(/(?<=[.!?])\s/)[0] ?? synopsis;
  return firstSentence.trim().slice(0, 200);
}

/**
 * An inline, auto-sizing title input that reads as part of the poster headline
 * rather than a form field. Empty state shows a long underline — the "blank".
 */
function Blank({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      spellCheck={false}
      autoComplete="off"
      className="blank-input field-sizing-content w-full min-w-[5ch] max-w-full
        border-b border-[#3a3a3a] bg-transparent pb-2 text-center
        font-display font-normal uppercase leading-[1.0] tracking-[0.05em]
        text-white caret-white transition-colors duration-300
        focus:border-white"
    />
  );
}

export default function Home() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [result, setResult] = useState<PitchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  // Session memory (D): recent pitches, fed back so each new one goes elsewhere.
  const recentRef = useRef<RecentPitch[]>([]);

  async function handlePitch() {
    if (loading) return;
    setLoading(true);
    try {
      // Pass the prior pitches (not yet including this one) so the model steers away.
      const pitch = await generatePitch({ a, b }, recentRef.current);
      // Reflect the resolved titles back into the blanks.
      setA(pitch.titleA);
      setB(pitch.titleB);
      setResult(pitch);
      // Remember this pitch (keep the last 6) to diversify future ones.
      recentRef.current = [
        ...recentRef.current,
        { title: pitch.newTitle, logline: toLogline(pitch.synopsis) },
      ].slice(-6);
      // Let the result mount, then ease it into view.
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    } finally {
      setLoading(false);
    }
  }

  // Surprise Me only fills the blanks with two random real films — it does not
  // generate a pitch. The user reviews the matchup, then clicks Pitch It.
  function handleSurprise() {
    if (loading) return;
    const [a, b] = pickTwoMovies();
    setA(a.title);
    setB(b.title);
  }

  return (
    <main className="flex min-h-screen flex-col bg-black">
      {/* Top bar — persistent wordmark, machined side captions */}
      <header className="grid w-full grid-cols-3 items-center px-6 py-6 sm:px-10">
        <span className="hidden justify-self-start font-mono text-[10px] uppercase tracking-[0.3em] text-[#666666] sm:block">
          Idea Engine
        </span>
        <span className="col-start-2 text-center font-display text-xs uppercase tracking-[0.5em] text-[#cccccc]">
          Blank Meets Blank
        </span>
        <span className="hidden justify-self-end font-mono text-[10px] uppercase tracking-[0.3em] text-[#666666] sm:block">
          No. ∞
        </span>
      </header>

      {/* Hero / poster */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-20">
        <div className="flex w-full max-w-4xl flex-col items-center">
          <p className="mb-12 font-mono text-[11px] uppercase tracking-[0.4em] text-[#666666]">
            Two films in — one original out
          </p>

          {/* Poster headline */}
          <h1 className="flex w-full flex-col items-center gap-7 text-center">
            <span className="w-full text-[clamp(2.75rem,9vw,6rem)]">
              <Blank
                value={a}
                onChange={setA}
                placeholder="______"
                ariaLabel="First movie title"
              />
            </span>

            <span className="select-none font-mono text-[11px] uppercase tracking-[0.55em] text-[#888888] sm:text-xs">
              meets
            </span>

            <span className="w-full text-[clamp(2.75rem,9vw,6rem)]">
              <Blank
                value={b}
                onChange={setB}
                placeholder="______"
                ariaLabel="Second movie title"
              />
            </span>
          </h1>

          {/* Actions — transparent outline pills */}
          <div className="mt-16 flex flex-col items-center gap-4 sm:flex-row">
            <button
              onClick={handlePitch}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center rounded-full
                border border-white bg-transparent px-9 font-mono text-[13px]
                uppercase tracking-[0.25em] text-white transition-colors
                duration-200 hover:bg-white hover:text-black
                active:scale-[0.99] disabled:cursor-not-allowed
                disabled:border-[#3a3a3a] disabled:text-[#666666]
                disabled:hover:bg-transparent"
            >
              {loading
                ? "Pitching…"
                : result
                  ? "Pitch a New Movie"
                  : "Pitch It"}
            </button>

            <button
              onClick={handleSurprise}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center rounded-full
                border border-[#3a3a3a] bg-transparent px-9 font-mono text-[13px]
                uppercase tracking-[0.25em] text-[#999999] transition-colors
                duration-200 hover:border-white hover:text-white
                active:scale-[0.99] disabled:cursor-not-allowed
                disabled:opacity-40 disabled:hover:border-[#3a3a3a]
                disabled:hover:text-[#999999]"
            >
              Surprise Me
            </button>
          </div>

          {/* Result — editorial: mono eyebrow, display title, serif synopsis */}
          {result && (
            <div
              ref={resultRef}
              key={result.newTitle + result.synopsis}
              className="animate-rise mt-24 w-full max-w-2xl"
            >
              <div className="mb-8 h-px w-full bg-[#262626]" />
              <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.4em] text-[#666666]">
                Now Pitching
              </p>
              <h2 className="font-display text-[clamp(2rem,6vw,3.25rem)] font-normal uppercase leading-[1.05] tracking-[0.04em] text-white">
                {result.newTitle}
              </h2>
              <p className="mt-7 font-serif text-[1.2rem] leading-[1.75] text-[#cccccc]">
                {result.synopsis}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="flex w-full flex-col items-center gap-3 px-6 py-12">
        <span className="font-display text-[11px] uppercase tracking-[0.5em] text-[#666666]">
          Blank Meets Blank
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#444444]">
          Original cinema, on demand
        </span>
      </footer>
    </main>
  );
}
