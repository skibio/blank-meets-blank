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
    genre: "genre-bending",
    mood: "unexpected energy",
    hook: "a story that refuses to stay in one lane",
    setting: "a world all its own",
  };
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
