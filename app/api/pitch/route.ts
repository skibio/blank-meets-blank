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
    logline: {
      type: "string",
      description:
        "A single-sentence logline, 25 to 45 words, that clearly communicates the protagonist, setup, central conflict, and hook. A real movie logline, not marketing copy. Do NOT spoil the final dilemma or ending.",
    },
    synopsis: {
      type: "string",
      description:
        "A 250-350 word treatment that fuses the two reference films into one original story: a named protagonist with a concrete motive and a personal wound, a vivid larger-than-life antagonist or force, an immersive sensory middle that escalates and curdles, a reversal at its center, and a stark final moral choice. Confident, present-tense, plot-forward prose.",
    },
  },
  required: ["newTitle", "logline", "synopsis"],
  additionalProperties: false,
} as const;

/**
 * The development-writer guidance. The model should fuse the two reference films
 * into ONE confident, original "X meets Y" — proudly wearing the genre and
 * spirit of both — rather than dissolving the references or mashing surface
 * elements. The specific film pair is supplied per request in `buildPrompt`.
 */
const SYSTEM_PROMPT = [
  `You are a sharp film development writer. Given two reference films, you pitch one original movie that fuses them — a confident, fully-realized "X meets Y" that proudly wears the genre and spirit of BOTH.`,
  ``,
  `Method:`,
  `- Borrow freely from both films: their genre, setting, era, structure, mood, imagery, and the TYPE of story each tells. Blend them so both are unmistakably present and felt in roughly equal measure — never let one film dominate.`,
  `- Choose a single time and place where both genres can coexist naturally, and make that world specific and vivid. The era and setting should flow from the two films, not be imposed at random. (For instance, a propulsive heist movie and a tender family drama might fuse into the story of a family pulling one last job together in a city you can smell.)`,
  `- Then invent an ENTIRELY NEW story inside that fusion: new characters with new names, a new specific premise, a new plot. Do not reuse either film's actual characters, names, dialogue, iconic objects, or literal plot, and do not set it inside either film's exact story. Honor the genre and structure; invent the story.`,
  ``,
  `The result should feel like a real movie a studio or festival would actually develop — high-concept, cinematic, specific, emotionally grounded, and a little dangerous. It should read as thought-through, not improvised.`,
  ``,
  `Craft the synopsis like the best one-page treatments:`,
  `- Open with a clean, specific premise: a named protagonist, the concrete thing that pulls them into the story, and the personal wound or history that makes it matter to them.`,
  `- Give them a vivid, often larger-than-life antagonist or opposing force — a person, a family, an empire, a belief, a community — that the protagonist is drawn toward.`,
  `- Build an immersive middle: a journey, investigation, or escalation through a world rendered in concrete, sensory detail (specific places, textures, images). Let the situation curdle and deepen as it goes.`,
  `- Turn on a real reversal at its center — a discovery that recontextualizes the mission (the person they came for is there willingly; the death was authored; the monster is inherited).`,
  `- End on a stark, clearly-stated moral choice or dilemma — the kind audiences argue about on the way out.`,
  ``,
  `Write in confident, present-tense, plot-forward prose. Be concrete and sensory. Name characters with evocative names that fit the world. About 250 to 350 words.`,
  ``,
  `Also write a LOGLINE: one sentence, 25 to 45 words, that clearly communicates the protagonist, the setup, the central conflict, and the hook. It should read like a real movie logline — the line in a programme or a catalogue — not marketing copy or a tagline. Do NOT spoil the central reversal, the final dilemma, or the ending; the logline sells the premise, the synopsis delivers the rest.`,
  ``,
  `Avoid (in both the logline and the synopsis): parody; fan fiction; literal crossovers that reuse the source films' actual characters or plots; generic thriller filler; fake-trailer clichés; over-explaining the reference films; and the phrases "must confront," "dark secrets," "nothing is as it seems," "race against time," and "forces them to question everything."`,
  ``,
  `Title: short, evocative, and specific — often noun-forward (e.g. "The ___"). 2 to 5 words. Never the name of a real movie.`,
].join("\n");

/** A recent pitch the user has already seen, used to push the next one elsewhere. */
interface RecentPitch {
  title: string;
  logline: string;
}

function buildPrompt(a: Movie, b: Movie, recent: RecentPitch[]): string {
  const lines = [
    `Reference film A: "${a.title}".`,
    `Reference film B: "${b.title}".`,
    ``,
    `Pitch one original movie that fuses these two — proudly wearing the genre, setting, era, and spirit of both, blended in roughly equal measure, with an entirely new story, new characters, and a new specific plot. Choose a time and place where both genres coexist naturally.`,
  ];

  // D — session memory: invent a distinctly different story on repeat pulls.
  if (recent.length) {
    lines.push(
      ``,
      `You have already pitched these films in this session. Invent a distinctly different movie from all of the below — a new premise, new characters, a new world, and a different ending. Staying in a fitting genre is good; repeating the same story, setting, or twist is not:`,
      ...recent.map((r) => `- "${r.title}": ${r.logline}`),
    );
  }

  lines.push(
    ``,
    `Return JSON with "newTitle" (2 to 5 words), "logline" (one sentence, 25 to 45 words), and "synopsis" (250 to 350 words).`,
  );

  return lines.join("\n");
}

/** Ask the model for a pitch. Throws on any error/refusal so the caller can fall back. */
async function generateWithAI(
  a: Movie,
  b: Movie,
  recent: RecentPitch[],
): Promise<Pick<PitchResult, "newTitle" | "logline" | "synopsis">> {
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
    typeof (parsed as Record<string, unknown>).logline !== "string" ||
    typeof (parsed as Record<string, unknown>).synopsis !== "string"
  ) {
    throw new Error("Malformed model JSON");
  }

  const { newTitle, logline, synopsis } = parsed as {
    newTitle: string;
    logline: string;
    synopsis: string;
  };
  return {
    newTitle: newTitle.trim(),
    logline: logline.trim(),
    synopsis: synopsis.trim(),
  };
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
    const { newTitle, logline, synopsis } = await generateWithAI(
      movieA,
      movieB,
      recent,
    );
    return NextResponse.json({
      titleA: movieA.title,
      titleB: movieB.title,
      newTitle,
      logline,
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
