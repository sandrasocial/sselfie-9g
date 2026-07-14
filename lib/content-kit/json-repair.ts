// Pure JSON extraction + repair for LLM output. No server-only import so tests can load it.

export function extractJsonArray(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf("[")
  const end = candidate.lastIndexOf("]")
  if (start === -1 || end === -1) throw new Error("LLM response contained no JSON array")
  return repairAndParseJson(candidate.slice(start, end + 1))
}

/**
 * Parse LLM-emitted JSON, repairing the two failures models actually produce inside long
 * prompt strings: raw newlines/tabs inside a string value, and an unescaped inner double
 * quote (the parser then dies with "Expected ',' or ']' after array element"). Direct parse
 * is tried first so valid JSON never pays the repair cost; the repair walks the text with an
 * in-string state machine and only rewrites characters that make the JSON invalid.
 */
export function repairAndParseJson(slice: string): any {
  try {
    return JSON.parse(slice)
  } catch {
    // fall through to repair
  }
  const repaired = repairJsonText(slice)
  try {
    return JSON.parse(repaired)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`LLM JSON unparseable even after repair: ${message}`)
  }
}

function repairJsonText(input: string): string {
  const out: string[] = []
  let inString = false
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (!inString) {
      if (ch === '"') inString = true
      out.push(ch)
      continue
    }
    // Inside a string value.
    if (ch === "\\") {
      // Keep any escape sequence as-is (including \" and \\).
      out.push(ch)
      if (i + 1 < input.length) {
        out.push(input[i + 1])
        i++
      }
      continue
    }
    if (ch === "\n") {
      out.push("\\n")
      continue
    }
    if (ch === "\r") {
      continue
    }
    if (ch === "\t") {
      out.push("\\t")
      continue
    }
    if (ch === '"') {
      // Closing quote only if what follows (after whitespace) is JSON structure; otherwise
      // it is an unescaped quote INSIDE the value (e.g. the model echoed "Camera + lens").
      let j = i + 1
      while (j < input.length && /[ \t\r\n]/.test(input[j])) j++
      const next = input[j]
      const structural = next === "," || next === "}" || next === "]" || next === ":" || next === undefined
      if (structural) {
        inString = false
        out.push(ch)
      } else {
        out.push('\\"')
      }
      continue
    }
    out.push(ch)
  }
  // Remove trailing commas before ] or } (another common model slip).
  return out.join("").replace(/,\s*([\]}])/g, "$1")
}
