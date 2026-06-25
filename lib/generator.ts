/**
 * Local, deterministic-ish pitch generation — the offline FALLBACK.
 *
 * This module never touches the network. The live app generates pitches with an
 * AI model via the `/api/pitch` route (see `lib/pitch.ts` and `app/api/pitch`);
 * if that call fails for any reason, the UI and the route both fall back to the
 * templated generation here, so the experience never breaks.
 *
 * Kept fully decoupled from React/UI and from any provider SDK so it can run on
 * the server (inside the route's catch) and in the browser (offline fallback).
 */

import { MOVIES, findMovie, pickTwoMovies, type Movie } from "./movies";

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

/** Build neutral metadata for a typed title we don't have in the catalog. */
function inventMovie(title: string): Movie {
  return {
    title: title.trim(),
    year: new Date().getFullYear(),
    tags: ["genre-bending", "original", "cinematic"],
  };
}

/** A random tone/genre tag from a movie, with a safe default. */
function tag(m: Movie): string {
  return m.tags.length ? pick(m.tags) : "cinematic";
}

/**
 * Turn the two (optionally empty) inputs into two concrete movies: typed titles
 * are matched against the catalog (or given light invented metadata), empty
 * blanks become random well-known films, and we avoid pairing a film with
 * itself. Shared by both the AI route and the local fallback so the headline
 * titles always match whatever produced the pitch.
 */
export function resolvePair(input: PitchInput): [Movie, Movie] {
  const aTyped = input.a.trim();
  const bTyped = input.b.trim();

  if (!aTyped && !bTyped) return pickTwoMovies();

  const movieA = aTyped ? (findMovie(aTyped) ?? inventMovie(aTyped)) : null;
  const movieB = bTyped ? (findMovie(bTyped) ?? inventMovie(bTyped)) : null;

  const resolvedA =
    movieA ?? pick(MOVIES.filter((m) => m.title !== movieB?.title));
  const resolvedB =
    movieB ?? pick(MOVIES.filter((m) => m.title !== resolvedA.title));

  return [resolvedA, resolvedB];
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

/**
 * Sentence templates for the offline fallback, composed from each film's tone
 * tags (never their titles or plots — in the spirit of an original pitch).
 */
const SYNOPSIS_TEMPLATES = [
  (a: Movie, b: Movie) =>
    `A ${tag(a)} premise with the pulse of something ${tag(b)}. It starts grounded and familiar, then tilts somewhere stranger — a protagonist who wants one impossible thing, and a world that keeps quietly rewriting the rules around them.`,
  (a: Movie, b: Movie) =>
    `Picture a ${tag(a)} story told with ${tag(b)} nerve. One ordinary person, one specific ache, and a turn in the middle that no one in the room sees coming — intimate, cinematic, and a little off-kilter.`,
  (a: Movie, b: Movie) =>
    `Equal parts ${tag(a)} and ${tag(b)}: a clean, strange premise that earns its escalation. The closer the protagonist gets to what they want, the more the ground shifts — and the harder the final choice becomes.`,
  (a: Movie, b: Movie) =>
    `A ${tag(a)} heart in a ${tag(b)} frame. It follows a character defined by a single, stubborn desire into a situation that won't resolve cleanly — building toward a dilemma rather than an answer.`,
  (a: Movie, b: Movie) =>
    `Somewhere between ${tag(a)} and ${tag(b)}. The setup is simple and human; the world around it is not. Specific, surprising, and emotionally grounded, it ends on an escalation you'll want to argue about afterward.`,
];

const TAGLINES = [
  "Some collisions were never meant to happen.",
  "Two worlds. One unforgettable story.",
  "The pitch that breaks every rule.",
  "You've never seen these two in the same frame.",
  "Coming soon to a reality near you.",
];

/** Compose a title + synopsis from two already-resolved movies. */
export function composeLocalPitch(
  a: Movie,
  b: Movie,
): Pick<PitchResult, "newTitle" | "synopsis"> {
  const template = pick(SYNOPSIS_TEMPLATES);
  return {
    newTitle: inventTitle(),
    synopsis: `${template(a, b)} ${pick(TAGLINES)}`,
  };
}

/**
 * Full local pitch: resolve the inputs, then compose. This is the seam the rest
 * of the app falls back to when the AI call is unavailable.
 */
export function generateLocalPitch(input: PitchInput): PitchResult {
  const [a, b] = resolvePair(input);
  return { titleA: a.title, titleB: b.title, ...composeLocalPitch(a, b) };
}
