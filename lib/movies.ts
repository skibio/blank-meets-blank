/**
 * The built-in movie catalog and the helpers the app uses to look up and pick
 * films. The raw data lives in `./movie-catalog` (a large static list); this
 * module turns it into `Movie` objects, removes duplicate titles, and exposes
 * lookup + random-pair helpers.
 *
 * Local static catalog only — no external movie API is involved.
 */

import { RAW_MOVIES } from "./movie-catalog";

export interface Movie {
  /** The film's title, shown verbatim in the headline. */
  title: string;
  /** Release year. */
  year: number;
  /** Genre/tone descriptors used as creative reference points (e.g. "noir", "dreamlike"). */
  tags: string[];
}

/**
 * Build the catalog from the raw tuples, de-duplicating by title (first
 * occurrence wins) so the list is always clean even if the source data repeats
 * a film.
 */
export const MOVIES: Movie[] = (() => {
  const seen = new Set<string>();
  const out: Movie[] = [];
  for (const [title, year, tags] of RAW_MOVIES) {
    const key = title.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, year, tags: tags.split(/\s+/).filter(Boolean) });
  }
  return out;
})();

/** Pick a random element from a non-empty array. */
function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Case-insensitive lookup of a catalog movie by its exact title. */
export function findMovie(title: string): Movie | undefined {
  const trimmed = title.trim().toLowerCase();
  return MOVIES.find((m) => m.title.toLowerCase() === trimmed);
}

/**
 * Pick two distinct well-known movies at random. Used both by the "Surprise Me"
 * button (to fill the blanks) and to resolve empty blanks at pitch time.
 */
export function pickTwoMovies(): [Movie, Movie] {
  const first = pick(MOVIES);
  const second = pick(MOVIES.filter((m) => m.title !== first.title));
  return [first, second];
}
