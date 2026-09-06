import { getWorkbookContextForMaya } from "@/lib/academy/workbook-answers"
import { renderMemoryContext } from "./memory-facts"
import "server-only"
import { getMemory } from "./memory-store"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getMayaHomeBrandContext } from "@/lib/maya/home-brand-context"

/** The same current facts and approved voice examples travel through every Suite caption path. */
export async function getMayaWritingContext(
  authUserId: string | null,
  userId: string,
  requestedLength?: string
) {
  const [memory, context] = await Promise.all([
    getMemory(userId),
    authUserId ? getUserContextForMaya(authUserId) : getWorkbookContextForMaya(userId),
  ])
  const facts = memory.facts ?? {}
  const hasLengthRequest = /short|brief|one sentence|one line|long|detailed|standard|concise/i.test(
    requestedLength || ""
  )
  const preference = (hasLengthRequest ? requestedLength : facts.length?.value) || ""
  const length: "short" | "standard" | "long" =
    /short|brief|one sentence|one line|concise|1-60/i.test(preference)
      ? "short"
      : /long|detailed/i.test(preference)
        ? "long"
        : "standard"
  return {
    memberContext: [
      getMayaHomeBrandContext(context),
      context.includes("## CURRENT MEMBER MEMORY") ? "" : renderMemoryContext(memory),
    ]
      .filter(Boolean)
      .join("\n\n"),
    approvedExamples: Object.values(facts)
      .filter(f => f.key.startsWith("example-") && f.value)
      .map(f => f.value!),
    length,
  }
}
