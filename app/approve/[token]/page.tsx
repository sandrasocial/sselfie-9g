import { getAdminActionByToken } from "@/lib/admin/action-queue"

export const dynamic = "force-dynamic"

function StatusMessage({ status, error }: { status: string; error?: string | null }) {
  const copy =
    status === "completed"
      ? "Done. You can close this page."
      : status === "dismissed"
        ? "Dismissed. Nothing was sent."
        : status === "failed"
          ? error || "That did not work. Nothing else will run until it is reviewed."
          : status === "executing"
            ? "This is already being handled."
            : "This approval is no longer open."
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <p className="font-serif text-2xl text-stone-950">{copy}</p>
    </div>
  )
}

export default async function ApproveActionPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  let action = null
  let invalidMessage: string | null = null
  try {
    action = await getAdminActionByToken(token)
  } catch (error) {
    invalidMessage = error instanceof Error ? error.message : "This approval link is not valid."
  }

  const draft = action?.kind === "send_ig_reply" ? String(action.payload.draft || "") : ""

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-12 text-stone-950">
      <div className="mx-auto max-w-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">SSELFIE approval</p>
        <h1 className="mt-3 font-serif text-4xl font-light">One last look.</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Opening this page never sends anything. The action only runs after you press the final button.
        </p>

        <div className="mt-8">
          {invalidMessage ? (
            <StatusMessage status="invalid" error={invalidMessage} />
          ) : !action ? (
            <StatusMessage status="invalid" />
          ) : action.status !== "pending" ? (
            <StatusMessage status={action.status} error={action.last_error} />
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <p className="text-xs uppercase tracking-wide text-stone-500">{action.source}</p>
              <h2 className="mt-2 font-serif text-2xl">{action.title}</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-700">{action.summary}</p>

              <form action={`/api/admin-actions/${encodeURIComponent(token)}`} method="post" className="mt-6">
                {action.kind === "send_ig_reply" && (
                  <label className="block">
                    <span className="text-xs uppercase tracking-wide text-stone-500">Reply</span>
                    <textarea
                      name="message"
                      defaultValue={draft}
                      maxLength={2000}
                      rows={8}
                      className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 p-4 text-sm leading-6 outline-none focus:border-stone-950"
                    />
                  </label>
                )}
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    name="decision"
                    value="approve"
                    className="rounded-full bg-stone-950 px-6 py-3 text-sm text-white"
                  >
                    {action.kind === "send_ig_reply" ? "Send this reply" : "Send this email"}
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="dismiss"
                    className="rounded-full border border-stone-300 px-6 py-3 text-sm text-stone-700"
                  >
                    Dismiss — don&apos;t send
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
