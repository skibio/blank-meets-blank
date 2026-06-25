import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  composeLocalPitch,
  resolvePair,
  type PitchInput,
  type PitchResult,
} from "@/lib/generator";
import type { Movie } from "@/lib/movies";

// Generation is dynamic per request — never cache the route.
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-4-6";

/** JSON shape we constrain the model to via structured outputs. */
const PITCH_SCHEMA = {
  type: "object",
  properties: {
    newTitle: {
      type: "string",
      description:
        "An original film title, 2 to 5 words — evocative and specific, not the name of a real movie.",
    },
    synopsis: {
      type: "string",
      description:
        "An original 250-400 word film treatment: a clean specific premise, a protagonist with a concrete wound or contradiction, a vivid textured world, a journey that changes shape, an antagonistic force bigger than one villain, building to a final reversal and an emotionally and morally difficult choice.",
    },
  },
  required: ["newTitle", "synopsis"],
  additionalProperties: false,
} as const;

/**
 * The development-writer guidance. Encodes the full process and constraints so
 * the model extracts the deeper DNA of the two films rather than mashing up
 * their surface elements. The specific film pair is supplied per request in
 * `buildPrompt`.
 */
const SYSTEM_PROMPT = [
  `You are a sharp film development writer generating original movie pitches from two reference films.`,
  ``,
  `The two films are only creative DNA. Use them for tone, structure, genre pressure, emotional engine, theme, rhythm, or type of central conflict. Do not reuse characters, settings, professions, plot points, iconic objects, franchise elements, famous scenes, or recognizable IP from either film.`,
  ``,
  `The final idea should feel like a third, original movie that could exist on its own. A reader should not feel like the pitch is mechanically combining the two references.`,
  ``,
  `Below, you will be told one specific facet to borrow from each film, plus a few creative constraints for this particular pitch (register, era, scale, and the kind of note the ending should land). Take only the named facet from each film — nothing else — and let the constraints steer the rest. Then invent a fresh world and a protagonist who is a specific person, not a profession or a trauma.`,
  ``,
  `Then write the pitch using only the new original story.`,
  ``,
  `The pitch should feel: high-concept but not generic; cinematic; emotionally grounded; surprising; specific, not vague; fun to imagine as a real movie; slightly strange, but still plausible; like something a studio or serious producer might actually develop.`,
  ``,
  `Avoid: literal mashups; parody; fan fiction; "Movie A's setting plus Movie B's plot"; generic thriller language; fake trailer clichés; over-explaining the reference films; protagonists who are just defined by a job and a trauma; arbitrary countdowns like "six weeks away" or "four days to stop it" unless truly necessary; familiar phrases like "must confront," "dark secrets," "nothing is as it seems," "race against time," "forces them to question everything."`,
  ``,
  `The output must include:`,
  `1. A new fictional movie title, 2 to 5 words.`,
  `2. A synopsis, 250 to 400 words.`,
  ``,
  `Use whichever of these moves genuinely serve THIS idea — you do not need all of them, and forcing every one produces formulaic, interchangeable pitches: a clean, specific premise; a protagonist with an interior life (a desire, contradiction, or private shame) who is more than their job; a vivid, textured world; a story that changes shape as it goes; an opposing force, which may be a person, a relationship, a community, a belief, a place, or the protagonist themselves — it does NOT have to be an institution or a cover-up; a turn or reversal; an ending that lands the specific note named in the constraints below.`,
  ``,
  `The pitch should have the confidence of a real film treatment. It should feel thought-through, not generated on the spot.`,
  ``,
  `Important failure mode to avoid: Do not make the pitch too obviously connected to the reference films. If one reference is about space, do not automatically use astronauts, planets, missions, or cosmic isolation. If one reference is about silent film, do not automatically use actors, composers, black-and-white cinema, or sound. If one reference is about a rescue operation, do not automatically use a fake film crew, hostage extraction, or government cover story. Extract the deeper engine instead.`,
  ``,
  `For example: a war odyssey can become a journey into a self-made kingdom; a revenge western can become a moral descent through a corrupt social order; a buddy-cop movie can become a loud, funny investigation through a city's mythology; a haunted-childhood horror story can become domestic dread around inheritance, parenthood, and memory.`,
  ``,
  `The references should disappear into the new premise.`,
  ``,
  `The creative constraints supplied with each request (register, era, scale, ending note, and the facet to borrow from each film) exist to push you off your defaults. Commit to them fully and let them reshape the whole pitch — they are the starting point, not decoration on top of a story you would have written anyway. A comedy constraint should produce something genuinely funny; a near-future constraint should feel genuinely future. Each pitch should read as if it came from a different filmmaker working in a different genre.`,
].join("\n");

/** Pick a random element from a non-empty array. */
function sample<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Per-request creative dice. Randomly sampling one value from each pool makes
 * every request's conditioning different, which is what actually produces
 * variety — the model is otherwise deterministic given identical input and
 * returns to the same modal pitch every time. These are all *positive*
 * directions, never bans, so any plot point is still available when it fits.
 */
const REGISTERS = [
  "a screwball comedy",
  "a deadpan absurdist comedy",
  "a tender romance",
  "a folk-horror chiller",
  "a supernatural ghost story",
  "a propulsive heist or caper",
  "a paranoid thriller",
  "a coming-of-age story",
  "a modern fairy tale or fable",
  "a sweeping adventure",
  "a survival story",
  "a noir-tinged mystery",
  "a work of magical realism",
  "an intimate domestic drama",
  "a workplace ensemble comedy",
  "a western (in any setting or era)",
  "a sports or competition underdog story",
  "a road movie",
  "a slow-burn character study",
  "a satire with bite",
] as const;

const ERAS = [
  "the near future",
  "a strange, plausible future",
  "right now — fully contemporary",
  "the very recent past (the last few years)",
  "the 1980s",
  "the 1990s",
  "the 1970s",
  "the 1950s",
  "the 1930s",
  "the 19th century",
  "an almost-timeless, hard-to-place present",
  "a specific year you choose for a real reason",
] as const;

const SCALES = [
  "a single location over a short, intense span of time",
  "a sprawling ensemble across a whole community",
  "an intimate two-hander",
  "a tight chamber piece of three or four people",
  "an epic that spans years",
  "a contained journey or road trip",
  "one unforgettable night",
  "a slow season in a particular place",
] as const;

const ENDING_NOTES = [
  "a temptation the protagonist barely resists — or doesn't",
  "an impossible loyalty between two people",
  "a reframed identity: they finally learn who they are",
  "a sacrifice that costs them the very thing they wanted",
  "a choice between two genuine goods",
  "a reconciliation that arrives a beat too late",
  "a victory that feels like a loss (or the reverse)",
  "an act of mercy that carries a real price",
  "a quiet revelation that recontextualizes everything, kindly",
  "an escape that requires becoming someone new",
] as const;

const FACETS = [
  "its emotional engine — the feeling that drives it",
  "its structural rhythm and pacing",
  "the type of central conflict at its core",
  "the kind of antagonist or opposing force it pits against the hero",
  "the central relationship dynamic",
  "its underlying theme or question",
  "its tone and atmosphere",
  "its genre pressure — what it does to the audience",
  "the protagonist's mode of agency — how they act on the world",
  "its sense of place and world-feel",
] as const;

/** A recent pitch the user has already seen, used to push the next one elsewhere. */
interface RecentPitch {
  title: string;
  logline: string;
}

function buildPrompt(a: Movie, b: Movie, recent: RecentPitch[]): string {
  const register = sample(REGISTERS);
  const era = sample(ERAS);
  const scale = sample(SCALES);
  const ending = sample(ENDING_NOTES);

  // Two distinct facets — one per film — so the same pair yields different ideas.
  const facetA = sample(FACETS);
  let facetB = sample(FACETS);
  while (facetB === facetA) facetB = sample(FACETS);

  const lines = [
    `Reference film A: "${a.title}" — borrow ONLY ${facetA}. Nothing else.`,
    `Reference film B: "${b.title}" — borrow ONLY ${facetB}. Nothing else.`,
    ``,
    `Creative constraints for THIS pitch — commit to them fully; they are the starting point:`,
    `- Register / genre: ${register}.`,
    `- Era: ${era}.`,
    `- Scale & form: ${scale}.`,
    `- The ending should land on: ${ending}.`,
  ];

  // D — session memory: deliberately steer away from pitches already shown.
  if (recent.length) {
    lines.push(
      ``,
      `You have already pitched the films below in this session. Go somewhere genuinely different from ALL of them — a different world, profession, protagonist, structure, and emotional shape. Do not echo their premises, settings, character types, or endings:`,
      ...recent.map((r) => `- "${r.title}": ${r.logline}`),
    );
  }

  lines.push(
    ``,
    `Build an original film from these. The protagonist must be a specific person, not a job title. The connection to either reference film should be invisible on the page. Return JSON with "newTitle" (2 to 5 words) and "synopsis" (250 to 400 words).`,
  );

  return lines.join("\n");
}

/** Ask the model for a pitch. Throws on any error/refusal so the caller can fall back. */
async function generateWithAI(
  a: Movie,
  b: Movie,
  recent: RecentPitch[],
): Promise<Pick<PitchResult, "newTitle" | "synopsis">> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPrompt(a, b, recent) }],
    output_config: { format: { type: "json_schema", schema: PITCH_SCHEMA } },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Model declined the request");
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in model response");
  }

  const parsed = JSON.parse(textBlock.text) as unknown;
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as Record<string, unknown>).newTitle !== "string" ||
    typeof (parsed as Record<string, unknown>).synopsis !== "string"
  ) {
    throw new Error("Malformed model JSON");
  }

  const { newTitle, synopsis } = parsed as {
    newTitle: string;
    synopsis: string;
  };
  return { newTitle: newTitle.trim(), synopsis: synopsis.trim() };
}

/** Defensively parse the optional `recent` list from a request body. */
function parseRecent(value: unknown): RecentPitch[] {
  if (!Array.isArray(value)) return [];
  const out: RecentPitch[] = [];
  for (const item of value) {
    if (item && typeof item === "object") {
      const r = item as Record<string, unknown>;
      if (typeof r.title === "string" && typeof r.logline === "string") {
        out.push({ title: r.title, logline: r.logline });
      }
    }
  }
  // Cap to the most recent few so the prompt stays focused and bounded.
  return out.slice(-6);
}

export async function POST(request: Request) {
  // Parse the body defensively; treat anything unexpected as empty blanks.
  let input: PitchInput = { a: "", b: "" };
  let recent: RecentPitch[] = [];
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object") {
      const b = body as Record<string, unknown>;
      input = {
        a: typeof b.a === "string" ? b.a : "",
        b: typeof b.b === "string" ? b.b : "",
      };
      recent = parseRecent(b.recent);
    }
  } catch {
    // Keep the empty default — both blanks become random films.
  }

  // Resolve the headline titles once, so AI and fallback agree on them.
  const [movieA, movieB] = resolvePair(input);

  try {
    const { newTitle, synopsis } = await generateWithAI(movieA, movieB, recent);
    return NextResponse.json({
      titleA: movieA.title,
      titleB: movieB.title,
      newTitle,
      synopsis,
    } satisfies PitchResult);
  } catch (err) {
    // AI unavailable (no key, network, refusal, bad JSON) — use local fallback.
    console.warn("AI pitch failed; using local fallback:", err);
    const local = composeLocalPitch(movieA, movieB);
    return NextResponse.json({
      titleA: movieA.title,
      titleB: movieB.title,
      ...local,
    } satisfies PitchResult);
  }
}
