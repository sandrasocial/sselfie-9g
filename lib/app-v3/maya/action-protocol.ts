export type MayaActionStatus =
  | "recommended"
  | "previewing"
  | "awaiting_confirmation"
  | "executing"
  | "succeeded"
  | "failed"
  | "undone"

export type MayaActionKind =
  | "create_image"
  | "create_caption"
  | "create_both"
  | "apply_to_post"
  | "improve_caption"
  | "create_grid"
  | "update_grid"
  | "continue_lesson"

export interface MayaActionDescriptor {
  id: string
  taskId: string
  kind: MayaActionKind
  title: string
  reason: string
  target?: { feedId?: number; postId?: number; lessonId?: number }
  creditCost: number
  requiresConfirmation: boolean
  canUndo: boolean
  idempotencyKey: string
  status: MayaActionStatus
}

export type MayaActionInput = Omit<MayaActionDescriptor, "status">

export type MayaActionEvent =
  | { type: "preview" }
  | { type: "request_confirmation" }
  | { type: "execute" }
  | { type: "succeed" }
  | { type: "fail" }
  | { type: "retry" }
  | { type: "undo" }
  | { type: "cancel" }

const SAFE_ID = /^[a-zA-Z0-9:_-]{8,160}$/

function requireText(value: string, field: string, maxLength: number): string {
  const clean = value.trim()
  if (!clean || clean.length > maxLength) {
    throw new Error(`Invalid Maya action ${field}`)
  }
  return clean
}

function optionalPositiveInteger(value: number | undefined, field: string): number | undefined {
  if (value === undefined) return undefined
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid Maya action ${field}`)
  return value
}

/**
 * Creates the small, inert command description rendered by Maya. Execution still belongs to
 * the existing feature-specific endpoints; this descriptor never grants mutation authority.
 */
export function createMayaAction(input: MayaActionInput): MayaActionDescriptor {
  const id = requireText(input.id, "id", 160)
  const taskId = requireText(input.taskId, "taskId", 160)
  const idempotencyKey = requireText(input.idempotencyKey, "idempotencyKey", 160)
  if (!SAFE_ID.test(idempotencyKey)) throw new Error("Invalid Maya action idempotencyKey")
  if (!Number.isInteger(input.creditCost) || input.creditCost < 0 || input.creditCost > 99) {
    throw new Error("Invalid Maya action creditCost")
  }

  const target = input.target
    ? {
        feedId: optionalPositiveInteger(input.target.feedId, "feedId"),
        postId: optionalPositiveInteger(input.target.postId, "postId"),
        lessonId: optionalPositiveInteger(input.target.lessonId, "lessonId"),
      }
    : undefined

  return {
    ...input,
    id,
    taskId,
    title: requireText(input.title, "title", 160),
    reason: requireText(input.reason, "reason", 320),
    target,
    idempotencyKey,
    status: "recommended",
  }
}

function expectStatus(
  descriptor: MayaActionDescriptor,
  allowed: MayaActionStatus[],
  event: MayaActionEvent["type"]
) {
  if (!allowed.includes(descriptor.status)) {
    throw new Error(`Cannot ${event} Maya action from ${descriptor.status}`)
  }
}

/** Pure lifecycle reducer shared by every Maya inline action. */
export function mayaActionReducer(
  descriptor: MayaActionDescriptor,
  event: MayaActionEvent
): MayaActionDescriptor {
  switch (event.type) {
    case "preview":
      expectStatus(descriptor, ["recommended"], event.type)
      return { ...descriptor, status: "previewing" }
    case "request_confirmation":
      expectStatus(descriptor, ["previewing"], event.type)
      return { ...descriptor, status: "awaiting_confirmation" }
    case "execute":
      expectStatus(descriptor, ["previewing", "awaiting_confirmation"], event.type)
      return { ...descriptor, status: "executing" }
    case "succeed":
      expectStatus(descriptor, ["executing"], event.type)
      return { ...descriptor, status: "succeeded" }
    case "fail":
      expectStatus(descriptor, ["executing"], event.type)
      return { ...descriptor, status: "failed" }
    case "retry":
      expectStatus(descriptor, ["failed"], event.type)
      return { ...descriptor, status: "awaiting_confirmation" }
    case "undo":
      expectStatus(descriptor, ["succeeded"], event.type)
      if (!descriptor.canUndo) throw new Error("This Maya action does not support undo")
      return { ...descriptor, status: "undone" }
    case "cancel":
      expectStatus(descriptor, ["previewing", "awaiting_confirmation", "failed"], event.type)
      return { ...descriptor, status: "recommended" }
  }
}

/**
 * Client-instance guard for repeat taps and lost React event boundaries. The paid generation
 * route independently enforces the same idempotency key server-side, so a reload is safe too.
 */
export class MayaActionExecutor<Result> {
  private readonly inFlight = new Map<string, Promise<Result>>()
  private readonly completed = new Map<string, Result>()

  run(
    descriptor: MayaActionDescriptor,
    execute: (action: MayaActionDescriptor) => Promise<Result>
  ): Promise<Result> {
    if (!descriptor.idempotencyKey) {
      return Promise.reject(new Error("Maya action idempotencyKey is required"))
    }
    if (this.completed.has(descriptor.idempotencyKey)) {
      return Promise.resolve(this.completed.get(descriptor.idempotencyKey) as Result)
    }
    const pending = this.inFlight.get(descriptor.idempotencyKey)
    if (pending) return pending

    const execution = execute(descriptor)
      .then(result => {
        this.completed.set(descriptor.idempotencyKey, result)
        return result
      })
      .finally(() => {
        this.inFlight.delete(descriptor.idempotencyKey)
      })
    this.inFlight.set(descriptor.idempotencyKey, execution)
    return execution
  }
}

export type MayaActionAdapters<Result> = Partial<
  Record<MayaActionKind, (action: MayaActionDescriptor) => Promise<Result>>
>

export function executeMayaActionAdapter<Result>(
  descriptor: MayaActionDescriptor,
  adapters: MayaActionAdapters<Result>
): Promise<Result> {
  const adapter = adapters[descriptor.kind]
  if (!adapter) {
    return Promise.reject(new Error(`No adapter is available for ${descriptor.kind}`))
  }
  return adapter(descriptor)
}

export function mayaActionCreditLabel(creditCost: number): string {
  if (creditCost === 0) return "No credits"
  return `${creditCost} ${creditCost === 1 ? "credit" : "credits"}`
}

export function restoreMayaActionStatus(
  descriptor: MayaActionDescriptor,
  status: Extract<MayaActionStatus, "succeeded" | "undone">
): MayaActionDescriptor {
  return { ...descriptor, status }
}

/** Stable, provider-safe key. It contains no member text and fits the existing generate route. */
export function mayaActionIdempotencyKey(
  ...parts: Array<string | number | null | undefined>
): string {
  const source = parts.map(part => String(part ?? "")).join("|")
  let first = 2166136261
  let second = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    first ^= source.charCodeAt(index)
    first = Math.imul(first, 16777619)
    second ^= source.charCodeAt(source.length - index - 1)
    second = Math.imul(second, 16777619)
  }
  return `maya-action-${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}`
}
