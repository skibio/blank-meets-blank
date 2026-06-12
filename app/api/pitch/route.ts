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

const MODEL = "claude-opus-4-8";

/** JSON shape we constrain the model to via structured outputs. */
const PITCH_SCHEMA = {
  type: "object",
  properties: {
    newTitle: {
      type: "string",
      description: "An original, evocative title for the invented film.",
    },
    synopsis: {
      type: "string",
      description:
        "A compelling 2-4 sentence synopsis for the invented film, blending the two source movies.",
    },
  },
  required: ["newTitle", "synopsis"],
  additionalProperties: false,
} as const;

function buildPrompt(a: Movie, b: Movie): string {
  return [
    `Pitch a brand-new, original fictional movie in the classic Hollywood "X meets Y" style.`,
    `The two source films are "${a.title}" and "${b.title}".`,
    ``,
    `Invent a NEW film that fuses their DNA — do not reuse either existing title.`,
    `Return:`,
    `- newTitle: an original, evocative title for the new film (not the name of a real movie).`,
    `- synopsis: 2-4 punchy sentences that sell the concept, blending the tone, genre, and ideas of both films into something that feels fresh and exciting.`,
    ``,
    `Be bold and specific. Write like a great one-page pitch, not a Wikipedia summary.`,
  ].join("\n");
}

/** Ask the model for a pitch. Throws on any error/refusal so the caller can fall back. */
async function generateWithAI(
  a: Movie,
  b: Movie,
): Promise<Pick<PitchResult, "newTitle" | "synopsis">> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      "You are a sharp, imaginative Hollywood pitch writer. You invent original films by combining two existing ones. Your titles are fresh and your synopses are vivid, concise, and exciting.",
    messages: [{ role: "user", content: buildPrompt(a, b) }],
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

export async function POST(request: Request) {
  // Parse the body defensively; treat anything unexpected as empty blanks.
  let input: PitchInput = { a: "", b: "" };
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object") {
      const b = body as Record<string, unknown>;
      input = {
        a: typeof b.a === "string" ? b.a : "",
        b: typeof b.b === "string" ? b.b : "",
      };
    }
  } catch {
    // Keep the empty default — both blanks become random films.
  }

  // Resolve the headline titles once, so AI and fallback agree on them.
  const [movieA, movieB] = resolvePair(input);

  try {
    const { newTitle, synopsis } = await generateWithAI(movieA, movieB);
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
