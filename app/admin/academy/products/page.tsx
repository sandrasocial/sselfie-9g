"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import type { AcademyProductDisplay } from "@/lib/academy-products"

type EditState = {
  name: string
  tagline: string
  description: string
  price_cents: number
  active: boolean
}

function formatEuro(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Please refresh and try again."
}

export default function AdminAcademyProductsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [products, setProducts] = useState<AcademyProductDisplay[]>([])
  const [editing, setEditing] = useState<Record<string, EditState | undefined>>({})

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.price - b.price)
  }, [products])

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/admin/academy/products", { credentials: "include" })

        if (response.status === 401 || response.status === 403) {
          router.push("/")
          return
        }

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error || "Failed to load academy products")
        }

        setProducts(Array.isArray(data.products) ? data.products : [])
      } catch (error: unknown) {
        toast({
          title: "Failed to load products",
          description: getErrorMessage(error),
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router, toast])

  const startEdit = (product: AcademyProductDisplay) => {
    setEditing((prev) => ({
      ...prev,
      [product.id]: {
        name: product.name,
        tagline: product.tagline,
        description: product.description,
        price_cents: product.price,
        active: product.active,
      },
    }))
  }

  const cancelEdit = (productId: string) => {
    setEditing((prev) => ({ ...prev, [productId]: undefined }))
  }

  const updateEdit = (productId: string, key: keyof EditState, value: string | boolean | number) => {
    setEditing((prev) => {
      const current = prev[productId]
      if (!current) return prev

      return {
        ...prev,
        [productId]: {
          ...current,
          [key]: value,
        },
      }
    })
  }

  const saveProduct = async (productId: string) => {
    const draft = editing[productId]
    if (!draft) return

    setSavingId(productId)

    try {
      const response = await fetch("/api/admin/academy/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          product_id: productId,
          name: draft.name,
          tagline: draft.tagline,
          description: draft.description,
          price_cents: Number.isFinite(draft.price_cents) ? draft.price_cents : 0,
          active: draft.active,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Failed to save")
      }

      const updatedProduct = data?.product as AcademyProductDisplay | null
      if (updatedProduct) {
        setProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)))
      }

      cancelEdit(productId)
      toast({
        title: "Saved",
        description: "Product changes are now live on academy pages.",
      })
    } catch (error: unknown) {
      toast({
        title: "Save failed",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-stone-50 p-8 text-stone-600">Loading products...</div>
  }

  return (
    <main className="min-h-screen bg-stone-50 p-6 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Academy Products</h1>
          <p className="mt-2 text-sm text-stone-600">
            Update names, taglines, and descriptions. Stripe prices must be changed in Stripe dashboard.
          </p>
          <p className="mt-2 text-sm font-medium text-amber-700">
            ⚠️ Stripe price IDs cannot be changed here. Contact developer to update actual prices.
          </p>
        </div>

        {sortedProducts.map((product) => {
          const draft = editing[product.id]
          const isEditing = Boolean(draft)
          const isSaving = savingId === product.id

          return (
            <Card key={product.id}>
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
                <CardDescription>ID: {product.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor={`${product.id}-name`}>Name</Label>
                      <Input
                        id={`${product.id}-name`}
                        value={draft?.name ?? ""}
                        onChange={(event) => updateEdit(product.id, "name", event.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${product.id}-tagline`}>Tagline</Label>
                      <Input
                        id={`${product.id}-tagline`}
                        value={draft?.tagline ?? ""}
                        onChange={(event) => updateEdit(product.id, "tagline", event.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${product.id}-description`}>Description</Label>
                      <Textarea
                        id={`${product.id}-description`}
                        value={draft?.description ?? ""}
                        onChange={(event) => updateEdit(product.id, "description", event.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${product.id}-price`}>Price Display (EUR cents)</Label>
                      <Input
                        id={`${product.id}-price`}
                        type="number"
                        min={0}
                        value={draft?.price_cents ?? 0}
                        onChange={(event) => updateEdit(product.id, "price_cents", Number(event.target.value))}
                      />
                    </div>

                    <label className="flex items-center gap-2 text-sm text-stone-700" htmlFor={`${product.id}-active`}>
                      <input
                        id={`${product.id}-active`}
                        type="checkbox"
                        checked={Boolean(draft?.active)}
                        onChange={(event) => updateEdit(product.id, "active", event.target.checked)}
                      />
                      Active product
                    </label>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-stone-700">
                      <span className="font-medium">Tagline:</span> {product.tagline}
                    </p>
                    <p className="text-sm text-stone-700">
                      <span className="font-medium">Description:</span> {product.description}
                    </p>
                    <p className="text-sm text-stone-700">
                      <span className="font-medium">Price display:</span> {formatEuro(product.price)} ({product.price} cents)
                    </p>
                    <p className="text-sm text-stone-700">
                      <span className="font-medium">Active:</span> {product.active ? "Yes" : "No"}
                    </p>
                    <p className="text-xs text-stone-500">
                      Stripe Price ID: {product.stripePriceId || "(missing env var)"}
                    </p>
                  </>
                )}
              </CardContent>

              <CardFooter className="gap-2">
                {isEditing ? (
                  <>
                    <Button onClick={() => saveProduct(product.id)} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="outline" onClick={() => cancelEdit(product.id)} disabled={isSaving}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => startEdit(product)}>
                    Edit
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>
      <Toaster />
    </main>
  )
}
