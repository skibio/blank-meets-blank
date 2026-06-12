"use client";

import { useRef, useState } from "react";
import { generatePitch, type PitchResult } from "@/lib/pitch";
import { pickTwoMovies } from "@/lib/movies";

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
      className="blank-input field-sizing-content w-full min-w-[6ch] max-w-full
        border-b-[6px] border-black bg-transparent pb-1 text-center
        font-black uppercase leading-[0.95] tracking-tight
        text-black caret-black transition-colors
        focus:border-neutral-400"
    />
  );
}

export default function Home() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [result, setResult] = useState<PitchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  async function handlePitch() {
    if (loading) return;
    setLoading(true);
    try {
      const pitch = await generatePitch({ a, b });
      // Reflect the resolved titles back into the blanks.
      setA(pitch.titleA);
      setB(pitch.titleB);
      setResult(pitch);
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
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-20">
      <div className="flex w-full max-w-3xl flex-col items-center">
        {/* Poster headline */}
        <h1 className="flex w-full flex-col items-center gap-5 text-center">
          <span className="w-full text-5xl sm:text-6xl md:text-7xl">
            <Blank
              value={a}
              onChange={setA}
              placeholder="______"
              ariaLabel="First movie title"
            />
          </span>

          <span className="select-none text-base font-medium uppercase tracking-[0.5em] text-neutral-400 sm:text-lg">
            meets
          </span>

          <span className="w-full text-5xl sm:text-6xl md:text-7xl">
            <Blank
              value={b}
              onChange={setB}
              placeholder="______"
              ariaLabel="Second movie title"
            />
          </span>
        </h1>

        {/* Actions */}
        <div className="mt-14 flex flex-col items-center gap-4 sm:flex-row">
          <button
            onClick={handlePitch}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-full
              bg-black px-10 py-4 text-sm font-bold uppercase tracking-[0.2em]
              text-white transition-all duration-200 hover:bg-neutral-800
              active:scale-[0.98] disabled:cursor-not-allowed
              disabled:opacity-50"
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
            className="inline-flex items-center justify-center rounded-full
              border border-black px-10 py-4 text-sm font-bold uppercase
              tracking-[0.2em] text-black transition-all duration-200
              hover:bg-black hover:text-white active:scale-[0.98]
              disabled:cursor-not-allowed disabled:opacity-50"
          >
            Surprise Me
          </button>
        </div>

        {/* Result */}
        {result && (
          <div
            ref={resultRef}
            key={result.newTitle + result.synopsis}
            className="animate-rise mt-20 w-full max-w-2xl"
          >
            <div className="mb-5 h-px w-full bg-neutral-200" />
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">
              Now Pitching
            </p>
            <h2 className="text-4xl font-black uppercase leading-[0.95] tracking-tight text-black sm:text-5xl">
              {result.newTitle}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-neutral-700 sm:text-xl">
              {result.synopsis}
            </p>
          </div>
        )}
      </div>

      <footer className="mt-24 text-xs uppercase tracking-[0.3em] text-neutral-300">
        Blank Meets Blank
      </footer>
    </main>
  );
}
