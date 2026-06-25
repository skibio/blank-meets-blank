/**
 * The single pitch-generation entry point the UI depends on.
 *
 * It calls the secure server route (`/api/pitch`), which generates the pitch
 * with an AI model. If the request fails — network error, non-OK response, or a
 * malformed body — it transparently falls back to local generation so the user
 * always gets a pitch. The API key lives only on the server; it is never
 * referenced here or anywhere else in the browser bundle.
 */

import {
  generateLocalPitch,
  type PitchInput,
  type PitchResult,
} from "./generator";

export type { PitchInput, PitchResult } from "./generator";

/**
 * A lightweight record of a pitch already shown this session. Passing the last
 * few back to the route gives the otherwise-stateless model "memory" so it can
 * deliberately go somewhere new — the only reliable way to get run-to-run
 * novelty, especially when the same two films are pitched again.
 */
export interface RecentPitch {
  title: string;
  logline: string;
}

/** True when a value has the full PitchResult shape we expect from the route. */
function isPitchResult(value: unknown): value is PitchResult {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.titleA === "string" &&
    typeof v.titleB === "string" &&
    typeof v.newTitle === "string" &&
    typeof v.synopsis === "string"
  );
}

export async function generatePitch(
  input: PitchInput,
  recent: RecentPitch[] = [],
): Promise<PitchResult> {
  try {
    const res = await fetch("/api/pitch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, recent }),
    });
    if (!res.ok) throw new Error(`Pitch request failed: ${res.status}`);

    const data: unknown = await res.json();
    if (!isPitchResult(data)) throw new Error("Malformed pitch response");
    return data;
  } catch (err) {
    // Never break the experience — fall back to deterministic local generation.
    console.warn("Falling back to local pitch generation:", err);
    return generateLocalPitch(input);
  }
}
