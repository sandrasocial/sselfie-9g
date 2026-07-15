"use client"

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"

import { isCampaignData, type CampaignOrder } from "@/lib/campaign-outcome/types"
import { readAdminJson } from "@/lib/admin/safe-fetch-json"

function dateLabel(value: string | Date) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function CampaignOutcomeQueue() {
  const [orders, setOrders] = useState<CampaignOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setError("")
    try {
      const response = await fetch("/api/admin/campaigns", { cache: "no-store" })
      const data = await readAdminJson(response)
      if (!response.ok) throw new Error(data.error || "Could not load campaigns.")
      setOrders(data.orders || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load campaigns.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function act(orderId: number, action: "approve" | "regenerate" | "resend_delivery") {
    setBusy(orderId)
    setError("")
    try {
      const response = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action }),
      })
      const data = await readAdminJson(response)
      if (!response.ok)
        throw new Error(data.error || data.reason || "Could not update the campaign.")
      await load()
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Could not update the campaign."
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="border-b border-stone-200 pb-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
          Paid outcome QA
        </p>
        <h1 className="mt-2 font-serif text-4xl font-light">Campaigns</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Maya creates the work. Check the face, the words, and the offer before approving delivery.
        </p>
      </div>

      {error ? (
        <p className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {loading ? <p className="py-12 text-sm text-stone-500">Loading campaigns...</p> : null}
      {!loading && orders.length === 0 ? (
        <p className="mt-8 border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
          No campaign orders yet.
        </p>
      ) : null}

      <div className="mt-8 space-y-6">
        {orders.map(order => {
          const data = isCampaignData(order.campaign_data) ? order.campaign_data : null
          const isBusy = busy === order.id
          return (
            <article key={order.id} className="border border-stone-200 bg-white p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-serif text-2xl">
                      {order.customer_name || order.customer_email}
                    </h2>
                    <span className="bg-stone-100 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-stone-600">
                      {order.status.replaceAll("_", " ")}
                    </span>
                    {order.is_test_mode ? (
                      <span className="bg-blue-50 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-blue-700">
                        Test
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-stone-500">
                    {order.customer_email} · ordered {dateLabel(order.created_at)}
                  </p>
                  {order.what_she_sells ? (
                    <p className="mt-5 max-w-3xl text-sm leading-6">
                      <strong>Sells:</strong> {order.what_she_sells}
                    </p>
                  ) : null}
                  {order.promotion ? (
                    <p className="mt-2 max-w-3xl text-sm leading-6">
                      <strong>Promoting:</strong> {order.promotion}
                    </p>
                  ) : null}
                  {order.target_audience ? (
                    <p className="mt-2 max-w-3xl text-sm leading-6">
                      <strong>For:</strong> {order.target_audience}
                    </p>
                  ) : null}
                  {order.generation_error ? (
                    <p className="mt-4 max-w-3xl bg-red-50 p-3 text-xs leading-5 text-red-800">
                      {order.generation_error}
                    </p>
                  ) : null}
                </div>
                <a
                  href={`/campaign/order/${order.access_token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] uppercase tracking-[0.18em] underline underline-offset-4"
                >
                  Open buyer page
                </a>
              </div>

              {data ? (
                <div className="mt-7 space-y-8">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Six-photo mini shoot
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-6">
                      {data.photos.map(photo => (
                        <div key={photo.id} className="relative aspect-[2/3] bg-stone-100">
                          <Image
                            src={photo.visualUrl}
                            alt={photo.label}
                            fill
                            className="object-cover"
                            sizes="16vw"
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Feed copy
                    </p>
                    <div className="mt-3 grid gap-4 md:grid-cols-3">
                      {data.posts.map(post => (
                        <div key={post.role} className="border border-stone-200 p-4">
                          <p className="text-[9px] uppercase tracking-[0.2em] text-stone-500">
                            {post.role}
                          </p>
                          <p className="mt-2 font-serif text-xl">{post.headline}</p>
                          <p className="mt-3 line-clamp-5 whitespace-pre-wrap text-xs leading-5 text-stone-600">
                            {post.caption}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Seven-slide carousel
                    </p>
                    <div className="mt-3 grid grid-cols-4 gap-2 md:grid-cols-7">
                      {data.carousel.slides.map(slide => (
                        <div key={slide.index} className="relative aspect-[4/5] bg-stone-100">
                          <Image
                            src={slide.visualUrl}
                            alt={`Carousel ${slide.index}`}
                            fill
                            className="object-cover"
                            sizes="14vw"
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {data.storySequences.map(sequence => (
                    <div key={sequence.role}>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                        {sequence.title}
                      </p>
                      <div className="mt-3 grid grid-cols-5 gap-2">
                        {sequence.slides.map(slide => (
                          <div key={slide.index} className="relative aspect-[9/16] bg-stone-100">
                            <Image
                              src={slide.visualUrl}
                              alt={`${sequence.role} Story ${slide.index}`}
                              fill
                              className="object-cover"
                              sizes="20vw"
                              unoptimized
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3 border-t border-stone-200 pt-5">
                {order.status === "needs_qa" ? (
                  <button
                    disabled={isBusy}
                    onClick={() => void act(order.id, "approve")}
                    className="bg-stone-950 px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-white disabled:opacity-50"
                  >
                    Approve and deliver
                  </button>
                ) : null}
                {["generation_failed", "needs_qa", "delivered"].includes(order.status) ? (
                  <button
                    disabled={isBusy}
                    onClick={() => void act(order.id, "regenerate")}
                    className="border border-stone-950 px-5 py-3 text-[10px] uppercase tracking-[0.18em] disabled:opacity-50"
                  >
                    Regenerate
                  </button>
                ) : null}
                {order.status === "delivered" ? (
                  <button
                    disabled={isBusy}
                    onClick={() => void act(order.id, "resend_delivery")}
                    className="border border-stone-300 px-5 py-3 text-[10px] uppercase tracking-[0.18em] disabled:opacity-50"
                  >
                    Resend delivery email
                  </button>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
