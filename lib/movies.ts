/**
 * A curated list of well-known films used to fill empty blanks.
 *
 * Each movie carries a few lightweight descriptors that the generator uses to
 * build a fresh, plausible pitch. Keeping this metadata here (rather than in the
 * generator) makes it trivial to expand the catalog without touching logic.
 */

export interface Movie {
  /** The film's title, shown verbatim in the headline. */
  title: string;
  /** Primary genre, e.g. "horror", "sci-fi". */
  genre: string;
  /** A defining tone or feeling, e.g. "dread", "wonder". */
  mood: string;
  /** A signature element or motif, e.g. "a relentless predator". */
  hook: string;
  /** Where it tends to unfold, e.g. "the open sea". */
  setting: string;
}

export const MOVIES: Movie[] = [
  {
    title: "Jaws",
    genre: "thriller",
    mood: "primal dread",
    hook: "a relentless predator stalking the unsuspecting",
    setting: "a sun-bleached coastal town",
  },
  {
    title: "2001: A Space Odyssey",
    genre: "science fiction",
    mood: "cosmic awe",
    hook: "a leap into the unknowable",
    setting: "the cold silence of deep space",
  },
  {
    title: "The Godfather",
    genre: "crime drama",
    mood: "slow-burning tragedy",
    hook: "a family bound by loyalty and blood",
    setting: "the smoke-filled rooms of power",
  },
  {
    title: "Alien",
    genre: "sci-fi horror",
    mood: "claustrophobic terror",
    hook: "a perfect organism hunting in the dark",
    setting: "a derelict ship far from home",
  },
  {
    title: "Pulp Fiction",
    genre: "crime",
    mood: "kinetic cool",
    hook: "fates colliding in nonlinear time",
    setting: "the neon underbelly of the city",
  },
  {
    title: "Casablanca",
    genre: "romance",
    mood: "bittersweet longing",
    hook: "love sacrificed for a greater cause",
    setting: "a wartime crossroads of exiles",
  },
  {
    title: "The Matrix",
    genre: "sci-fi action",
    mood: "paranoid wonder",
    hook: "a hidden truth beneath reality",
    setting: "a simulated world and the ruins beyond it",
  },
  {
    title: "Blade Runner",
    genre: "neo-noir sci-fi",
    mood: "melancholy beauty",
    hook: "the question of what makes us human",
    setting: "a rain-soaked, neon-drenched metropolis",
  },
  {
    title: "Jurassic Park",
    genre: "adventure",
    mood: "wonder turned to terror",
    hook: "nature breaking free of its cage",
    setting: "a remote island of impossible creatures",
  },
  {
    title: "Titanic",
    genre: "epic romance",
    mood: "sweeping doom",
    hook: "a love story sailing toward catastrophe",
    setting: "a doomed ocean liner",
  },
  {
    title: "Fight Club",
    genre: "psychological drama",
    mood: "anarchic unease",
    hook: "an identity coming apart at the seams",
    setting: "the hollow sprawl of modern life",
  },
  {
    title: "The Shining",
    genre: "horror",
    mood: "creeping madness",
    hook: "isolation unraveling the mind",
    setting: "an empty hotel haunted by the past",
  },
  {
    title: "Mad Max: Fury Road",
    genre: "action",
    mood: "relentless adrenaline",
    hook: "a desperate flight across the wasteland",
    setting: "a scorched post-apocalyptic desert",
  },
  {
    title: "Forrest Gump",
    genre: "drama",
    mood: "earnest nostalgia",
    hook: "an ordinary life touching history",
    setting: "a sweeping tour of a changing America",
  },
  {
    title: "Inception",
    genre: "sci-fi thriller",
    mood: "vertiginous intrigue",
    hook: "reality folding in on itself",
    setting: "the architecture of dreams within dreams",
  },
  {
    title: "Goodfellas",
    genre: "crime",
    mood: "intoxicating descent",
    hook: "the seductive rise and brutal fall",
    setting: "the back rooms of organized crime",
  },
  {
    title: "E.T. the Extra-Terrestrial",
    genre: "family sci-fi",
    mood: "tender wonder",
    hook: "an unlikely friendship across worlds",
    setting: "a quiet suburb under starry skies",
  },
  {
    title: "Get Out",
    genre: "social horror",
    mood: "simmering dread",
    hook: "a smiling surface hiding something monstrous",
    setting: "a too-perfect family estate",
  },
  {
    title: "Parasite",
    genre: "dark comedy thriller",
    mood: "razor-sharp tension",
    hook: "two worlds collapsing into one",
    setting: "the divide between the rich and the desperate",
  },
  {
    title: "Spirited Away",
    genre: "fantasy",
    mood: "dreamlike enchantment",
    hook: "a child lost in a world of spirits",
    setting: "a bathhouse at the edge of the magical",
  },
  {
    title: "Die Hard",
    genre: "action",
    mood: "white-knuckle tension",
    hook: "one person against impossible odds",
    setting: "a single tower under siege",
  },
  {
    title: "Back to the Future",
    genre: "sci-fi comedy",
    mood: "breezy invention",
    hook: "the past rewritten by accident",
    setting: "the slippery currents of time",
  },
  {
    title: "No Country for Old Men",
    genre: "neo-western thriller",
    mood: "cold inevitability",
    hook: "an unstoppable force without mercy",
    setting: "the dusty edges of the American Southwest",
  },
  {
    title: "Eternal Sunshine of the Spotless Mind",
    genre: "romantic sci-fi",
    mood: "aching tenderness",
    hook: "memory erased and stubbornly reclaimed",
    setting: "the crumbling landscape of the mind",
  },
];

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
