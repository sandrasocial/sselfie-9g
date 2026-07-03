// SSELFIE Studio 3.0 - concept payload salvage (STORY-GENERATION fix, 2026-07-03).
//
// Why this exists: Maya presents directions via the emit_concepts tool. When the model's
// tool-call JSON is cut mid-stream (output token ceiling) or fails schema validation, the
// AI SDK marks the call invalid: `input` is cleared and the raw payload survives on
// `rawInput`. For a schema failure rawInput is a parsed OBJECT (the old `?.concepts`
// fallback covers it), but for a truncated stream rawInput is the raw STRING of
// half-finished JSON - and every card the member watched stream in vanished at finish.
// Live evidence (2026-07-02 19:00Z): story-slide emit_concepts logged `count: null` twice
// in a row, zero cards rendered, zero generations. Story sequences carry the heaviest
// payload (a full creative plan per concept), so they hit this hardest.
//
// This module rescues every COMPLETE concept object out of a truncated payload so the
// member still gets the directions that finished streaming instead of a dead end.
// Pure + unit-testable (tests/story-generation.test.ts).

export interface SalvagedConceptsPayload {
  format?: string
  concepts: unknown[]
}

/** Balanced-brace walk that is string/escape aware. Returns complete top-level objects. */
function extractCompleteObjects(raw: string, from: number): unknown[] {
  const objects: unknown[] = []
  let depth = 0
  let inString = false
  let escaped = false
  let objStart = -1

  for (let i = from; i < raw.length; i++) {
    const ch = raw[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === "\\") escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === "{") {
      if (depth === 0) objStart = i
      depth++
    } else if (ch === "}") {
      depth--
      if (depth === 0 && objStart >= 0) {
        try {
          objects.push(JSON.parse(raw.slice(objStart, i + 1)))
        } catch {
          // A malformed chunk never blocks later complete ones.
        }
        objStart = -1
      }
    } else if (ch === "]" && depth === 0) {
      break
    }
  }
  return objects
}

/** Bounded deep search for a `concepts` array the model buried under a wrapper key
 *  (live 2026-07-03: an invalid story-sequence call parsed as an object with NO top-level
 *  concepts array - the payload shape itself was wrong, not just a missing field). */
function findNestedConcepts(
  value: unknown,
  depth: number
): { format?: string; concepts: unknown[] } | null {
  if (!value || typeof value !== "object" || depth > 4) return null
  const obj = value as Record<string, unknown>
  if (Array.isArray(obj.concepts)) {
    return {
      format: typeof obj.format === "string" ? obj.format : undefined,
      concepts: obj.concepts,
    }
  }
  for (const key of Object.keys(obj)) {
    const child = obj[key]
    if (Array.isArray(child)) continue
    const found = findNestedConcepts(child, depth + 1)
    if (found) {
      return {
        format:
          found.format ?? (typeof obj.format === "string" ? (obj.format as string) : undefined),
        concepts: found.concepts,
      }
    }
  }
  return null
}

/**
 * Recover `{ format, concepts }` from an emit_concepts payload of ANY shape:
 * - a parsed object (schema-invalid but complete JSON): passed through, including
 *   wrapper shapes where `concepts` sits one or more levels deep,
 * - a raw string of truncated JSON: every complete concept object is extracted,
 * - anything else: null.
 */
export function salvageConceptsPayload(raw: unknown): SalvagedConceptsPayload | null {
  if (raw && typeof raw === "object") {
    const found = findNestedConcepts(raw, 0)
    if (!found) return null
    return { format: found.format, concepts: found.concepts }
  }

  if (typeof raw !== "string" || raw.trim().length === 0) return null

  // Complete JSON that simply failed schema validation upstream.
  try {
    return salvageConceptsPayload(JSON.parse(raw))
  } catch {
    // Truncated - fall through to the balanced-brace salvage.
  }

  const format = raw.match(/"format"\s*:\s*"([^"]+)"/)?.[1]
  const conceptsKey = raw.indexOf('"concepts"')
  if (conceptsKey < 0) return null
  const arrayStart = raw.indexOf("[", conceptsKey)
  if (arrayStart < 0) return null

  const concepts = extractCompleteObjects(raw, arrayStart + 1)
  if (concepts.length === 0) return null
  return { format, concepts }
}
