/**
 * Pitch generation logic — fully decoupled from the UI.
 *
 * The UI only ever calls `generatePitch(a, b)`. Today that resolves to a local,
 * deterministic-ish random pitch with zero network calls. To swap in an AI model
 * later, replace the body of `generatePitch` with an API call that returns the
 * same `PitchResult` shape (or point it at `generatePitchWithAI` below). Nothing
 * in the components needs to change.
 */

import { MOVIES, type Movie } from "./movies";

export interface PitchInput {
  /** First movie title (may be empty — a random film is chosen). */
  a: string;
  /** Second movie title (may be empty — a random film is chosen). */
  b: string;
}

export interface PitchResult {
  /** The resolved first title that landed in the headline. */
  titleA: string;
  /** The resolved second title that landed in the headline. */
  titleB: string;
  /** The freshly invented movie title. */
  newTitle: string;
  /** A compelling original synopsis for the new movie. */
  synopsis: string;
}

/** Pick a random element from a non-empty array. */
function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Find catalog metadata for a typed title, or invent light metadata for it. */
function resolveMovie(title: string): Movie {
  const trimmed = title.trim();
  const match = MOVIES.find(
    (m) => m.title.toLowerCase() === trimmed.toLowerCase(),
  );
  if (match) return match;

  // The user typed a title we don't have metadata for. Build a neutral,
  // serviceable profile so the generator still produces a coherent pitch.
  return {
    title: trimmed,
    genre: "genre-bending",
    mood: "unexpected energy",
    hook: "a story that refuses to stay in one lane",
    setting: "a world all its own",
  };
}

/** Title-fragment banks used to assemble an invented movie name. */
const TITLE_PREFIXES = [
  "The Last",
  "Echoes of",
  "Beneath the",
  "After the",
  "Children of the",
  "The Edge of",
  "Whispers in the",
  "A Requiem for",
  "The Rise of",
  "Shadows of the",
];

const TITLE_NOUNS = [
  "Tide",
  "Machine",
  "Dynasty",
  "Signal",
  "Horizon",
  "Inheritance",
  "Abyss",
  "Paradise",
  "Reckoning",
  "Frequency",
  "Wilderness",
  "Hour",
];

function inventTitle(): string {
  return `${pick(TITLE_PREFIXES)} ${pick(TITLE_NOUNS)}`;
}

/** Sentence templates that blend the two films' DNA into one synopsis. */
const SYNOPSIS_TEMPLATES = [
  (a: Movie, b: Movie) =>
    `Set against ${a.setting}, it follows ${a.hook} — but when ${b.hook} arrives, the rules rewrite themselves. What begins as ${a.genre} curdles into ${b.mood}, and no one walks away unchanged.`,
  (a: Movie, b: Movie) =>
    `It opens with ${a.mood}, the unmistakable pulse of ${a.genre}. Then ${b.setting} bleeds in, dragging ${b.hook} into the frame. The collision is electric, intimate, and impossible to look away from.`,
  (a: Movie, b: Movie) =>
    `Imagine ${a.hook}, transplanted into ${b.setting}. The result fuses the ${a.mood} of one world with the ${b.genre} instincts of another — a film that feels both instantly familiar and entirely new.`,
  (a: Movie, b: Movie) =>
    `A ${a.genre} heart beats inside a ${b.genre} body. As ${a.hook} meets ${b.hook}, ${a.mood} gives way to ${b.mood}, and the story barrels toward an ending no one in the theater will see coming.`,
  (a: Movie, b: Movie) =>
    `Two forces, one frame: ${a.hook} and ${b.hook}. Across ${a.setting} and into ${b.setting}, the film trades ${a.genre} spectacle for ${b.mood} — a bold, original collision of everything we love about both.`,
];

const TAGLINES = [
  "Some collisions were never meant to happen.",
  "Two worlds. One unforgettable story.",
  "The pitch that breaks every rule.",
  "You've never seen these two in the same frame.",
  "Coming soon to a reality near you.",
];

/**
 * Generate a fresh movie pitch from two (optionally empty) titles.
 *
 * This is the single seam the UI depends on. It is async on purpose so that a
 * future model-backed implementation is a drop-in replacement.
 */
export async function generatePitch(input: PitchInput): Promise<PitchResult> {
  const movieA = input.a.trim() ? resolveMovie(input.a) : pick(MOVIES);
  let movieB = input.b.trim() ? resolveMovie(input.b) : pick(MOVIES);

  // Avoid pitching a movie against itself when both blanks are random.
  if (!input.b.trim() && movieB.title === movieA.title) {
    const alternatives = MOVIES.filter((m) => m.title !== movieA.title);
    if (alternatives.length) movieB = pick(alternatives);
  }

  const template = pick(SYNOPSIS_TEMPLATES);
  const synopsis = `${template(movieA, movieB)} ${pick(TAGLINES)}`;

  return {
    titleA: movieA.title,
    titleB: movieB.title,
    newTitle: inventTitle(),
    synopsis,
  };
}

/**
 * --- Future AI implementation (intentionally inert for Version 1) ---
 *
 * When you're ready to go live with a model, fill this in and have
 * `generatePitch` delegate to it. The return shape is identical, so the UI is
 * untouched. Example sketch:
 *
 *   export async function generatePitchWithAI(input: PitchInput): Promise<PitchResult> {
 *     const res = await fetch("/api/pitch", {
 *       method: "POST",
 *       headers: { "Content-Type": "application/json" },
 *       body: JSON.stringify(input),
 *     });
 *     if (!res.ok) throw new Error("Pitch generation failed");
 *     return (await res.json()) as PitchResult;
 *   }
 */
