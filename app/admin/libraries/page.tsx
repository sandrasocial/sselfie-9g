"use client"

import { useEffect, useMemo, useState } from "react"
import { AdminLoadingState } from "@/components/admin/shared/admin-loading-state"
import { AdminErrorState } from "@/components/admin/shared/admin-error-state"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

type LibraryTab = "outfits" | "locations" | "objects"

interface OutfitRow {
  id: number
  outfit_name: string
  fashion_style: string | null
  category_fit: string[] | null
  outfit_base: string | null
  outfit_style: string | null
  outfit_layer: string | null
  description: string | null
  enabled: boolean
}

interface LocationRow {
  id: number
  location_name: string
  location_type: string | null
  category_fit: string[] | null
  description: string | null
  indoor: boolean | null
  public: boolean | null
  enabled: boolean
}

interface ObjectRow {
  id: number
  object_name: string
  object_type: string | null
  category_fit: string[] | null
  description: string | null
  position_type: string | null
  enabled: boolean
}

const emptyOutfit: Omit<OutfitRow, "id"> = {
  outfit_name: "",
  fashion_style: "",
  category_fit: [],
  outfit_base: "",
  outfit_style: "",
  outfit_layer: "",
  description: "",
  enabled: true,
}

const emptyLocation: Omit<LocationRow, "id"> = {
  location_name: "",
  location_type: "",
  category_fit: [],
  description: "",
  indoor: null,
  public: null,
  enabled: true,
}

const emptyObject: Omit<ObjectRow, "id"> = {
  object_name: "",
  object_type: "",
  category_fit: [],
  description: "",
  position_type: "",
  enabled: true,
}

function listToString(value?: string[] | null) {
  if (!value) return ""
  return value.join(", ")
}

function stringToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function LibrariesAdminPage() {
  const [activeTab, setActiveTab] = useState<LibraryTab>("outfits")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [outfits, setOutfits] = useState<OutfitRow[]>([])
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [objects, setObjects] = useState<ObjectRow[]>([])

  const [selectedOutfitId, setSelectedOutfitId] = useState<number | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null)
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null)

  const [outfitForm, setOutfitForm] = useState(emptyOutfit)
  const [locationForm, setLocationForm] = useState(emptyLocation)
  const [objectForm, setObjectForm] = useState(emptyObject)

  const [outfitModalOpen, setOutfitModalOpen] = useState(false)
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [objectModalOpen, setObjectModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: LibraryTab; id: number; label: string } | null>(
    null,
  )
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [outfitFilterFashion, setOutfitFilterFashion] = useState("")
  const [outfitFilterCategory, setOutfitFilterCategory] = useState("")
  const [locationFilterCategory, setLocationFilterCategory] = useState("")
  const [objectFilterCategory, setObjectFilterCategory] = useState("")

  const loadOutfits = async () => {
    const res = await fetch("/api/admin/libraries/outfits")
    if (!res.ok) throw new Error("Failed to load outfits")
    const data = await res.json()
    setOutfits(data.rows || [])
  }

  const loadLocations = async () => {
    const res = await fetch("/api/admin/libraries/locations")
    if (!res.ok) throw new Error("Failed to load locations")
    const data = await res.json()
    setLocations(data.rows || [])
  }

  const loadObjects = async () => {
    const res = await fetch("/api/admin/libraries/objects")
    if (!res.ok) throw new Error("Failed to load objects")
    const data = await res.json()
    setObjects(data.rows || [])
  }

  const loadAll = async () => {
    try {
      setLoading(true)
      await Promise.all([loadOutfits(), loadLocations(), loadObjects()])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const handleSaveOutfit = async () => {
    const endpoint = selectedOutfitId
      ? `/api/admin/libraries/outfits/${selectedOutfitId}`
      : "/api/admin/libraries/outfits"
    const method = selectedOutfitId ? "PATCH" : "POST"

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(outfitForm),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Failed to save outfit")
      return
    }
    await loadOutfits()
    setSelectedOutfitId(null)
    setOutfitForm(emptyOutfit)
    setOutfitModalOpen(false)
    toast.success("Outfit saved")
  }

  const handleSaveLocation = async () => {
    const endpoint = selectedLocationId
      ? `/api/admin/libraries/locations/${selectedLocationId}`
      : "/api/admin/libraries/locations"
    const method = selectedLocationId ? "PATCH" : "POST"

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(locationForm),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Failed to save location")
      return
    }
    await loadLocations()
    setSelectedLocationId(null)
    setLocationForm(emptyLocation)
    setLocationModalOpen(false)
    toast.success("Location saved")
  }

  const handleSaveObject = async () => {
    const endpoint = selectedObjectId
      ? `/api/admin/libraries/objects/${selectedObjectId}`
      : "/api/admin/libraries/objects"
    const method = selectedObjectId ? "PATCH" : "POST"

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(objectForm),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Failed to save object")
      return
    }
    await loadObjects()
    setSelectedObjectId(null)
    setObjectForm(emptyObject)
    setObjectModalOpen(false)
    toast.success("Object saved")
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const endpoint =
      deleteTarget.type === "outfits"
        ? `/api/admin/libraries/outfits/${deleteTarget.id}`
        : deleteTarget.type === "locations"
        ? `/api/admin/libraries/locations/${deleteTarget.id}`
        : `/api/admin/libraries/objects/${deleteTarget.id}`
    const res = await fetch(endpoint, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Failed to delete")
      return
    }
    toast.success("Deleted successfully")
    setDeleteOpen(false)
    setDeleteTarget(null)
    await loadAll()
  }

  const filteredOutfits = useMemo(() => {
    return outfits.filter((row) => {
      const matchesFashion = outfitFilterFashion
        ? (row.fashion_style || "").toLowerCase() === outfitFilterFashion.toLowerCase()
        : true
      const matchesCategory = outfitFilterCategory
        ? (row.category_fit || []).some((item) => item.toLowerCase() === outfitFilterCategory.toLowerCase())
        : true
      return matchesFashion && matchesCategory
    })
  }, [outfits, outfitFilterFashion, outfitFilterCategory])

  const filteredLocations = useMemo(() => {
    return locations.filter((row) => {
      const matchesCategory = locationFilterCategory
        ? (row.category_fit || []).some((item) => item.toLowerCase() === locationFilterCategory.toLowerCase())
        : true
      return matchesCategory
    })
  }, [locations, locationFilterCategory])

  const filteredObjects = useMemo(() => {
    return objects.filter((row) => {
      const matchesCategory = objectFilterCategory
        ? (row.category_fit || []).some((item) => item.toLowerCase() === objectFilterCategory.toLowerCase())
        : true
      return matchesCategory
    })
  }, [objects, objectFilterCategory])

  if (loading) return <AdminLoadingState message="Loading libraries..." />
  if (error) return <AdminErrorState message={error} onRetry={loadAll} />

  return (
    <div className="px-6 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Feed Libraries</h1>
          <p className="text-sm text-stone-500">
            Manage reusable outfits, locations, and objects.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "outfits" && (
            <Button size="sm" onClick={() => {
              setSelectedOutfitId(null)
              setOutfitForm(emptyOutfit)
              setOutfitModalOpen(true)
            }}>
              + Add Outfit
            </Button>
          )}
          {activeTab === "locations" && (
            <Button size="sm" onClick={() => {
              setSelectedLocationId(null)
              setLocationForm(emptyLocation)
              setLocationModalOpen(true)
            }}>
              + Add Location
            </Button>
          )}
          {activeTab === "objects" && (
            <Button size="sm" onClick={() => {
              setSelectedObjectId(null)
              setObjectForm(emptyObject)
              setObjectModalOpen(true)
            }}>
              + Add Object
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {(["outfits", "locations", "objects"] as LibraryTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs uppercase tracking-wider border rounded-md ${
              activeTab === tab
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-200 text-stone-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "outfits" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              className="border border-stone-200 rounded-md px-3 py-2 text-sm"
              placeholder="Filter by fashion style"
              value={outfitFilterFashion}
              onChange={(event) => setOutfitFilterFashion(event.target.value)}
            />
            <input
              className="border border-stone-200 rounded-md px-3 py-2 text-sm"
              placeholder="Filter by category"
              value={outfitFilterCategory}
              onChange={(event) => setOutfitFilterCategory(event.target.value)}
            />
          </div>
          <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-600 uppercase tracking-wider text-xs">
                <tr>
                  <th className="text-left px-4 py-3">Outfit</th>
                  <th className="text-left px-4 py-3">Fashion Style</th>
                  <th className="text-left px-4 py-3">Categories</th>
                  <th className="text-left px-4 py-3">Enabled</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOutfits.map((row) => (
                  <tr key={row.id} className="border-t border-stone-200">
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900">{row.outfit_name}</div>
                      <div className="text-xs text-stone-500">{row.description}</div>
                    </td>
                    <td className="px-4 py-3">{row.fashion_style || "Unassigned"}</td>
                    <td className="px-4 py-3">{listToString(row.category_fit)}</td>
                    <td className="px-4 py-3">
                      <span className={row.enabled ? "text-emerald-600" : "text-rose-500"}>
                        {row.enabled ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOutfitId(row.id)
                          setOutfitForm({
                            outfit_name: row.outfit_name,
                            fashion_style: row.fashion_style || "",
                            category_fit: row.category_fit || [],
                            outfit_base: row.outfit_base || "",
                            outfit_style: row.outfit_style || "",
                            outfit_layer: row.outfit_layer || "",
                            description: row.description || "",
                            enabled: row.enabled,
                          })
                          setOutfitModalOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setDeleteTarget({ type: "outfits", id: row.id, label: row.outfit_name })
                          setDeleteOpen(true)
                        }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredOutfits.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                      No outfits found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "locations" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              className="border border-stone-200 rounded-md px-3 py-2 text-sm"
              placeholder="Filter by category"
              value={locationFilterCategory}
              onChange={(event) => setLocationFilterCategory(event.target.value)}
            />
          </div>
          <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-600 uppercase tracking-wider text-xs">
                <tr>
                  <th className="text-left px-4 py-3">Location</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Categories</th>
                  <th className="text-left px-4 py-3">Enabled</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.map((row) => (
                  <tr key={row.id} className="border-t border-stone-200">
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900">{row.location_name}</div>
                      <div className="text-xs text-stone-500">{row.description}</div>
                    </td>
                    <td className="px-4 py-3">{row.location_type || "Unassigned"}</td>
                    <td className="px-4 py-3">{listToString(row.category_fit)}</td>
                    <td className="px-4 py-3">
                      <span className={row.enabled ? "text-emerald-600" : "text-rose-500"}>
                        {row.enabled ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedLocationId(row.id)
                          setLocationForm({
                            location_name: row.location_name,
                            location_type: row.location_type || "",
                            category_fit: row.category_fit || [],
                            description: row.description || "",
                            indoor: row.indoor ?? null,
                            public: row.public ?? null,
                            enabled: row.enabled,
                          })
                          setLocationModalOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setDeleteTarget({ type: "locations", id: row.id, label: row.location_name })
                          setDeleteOpen(true)
                        }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredLocations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                      No locations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "objects" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              className="border border-stone-200 rounded-md px-3 py-2 text-sm"
              placeholder="Filter by category"
              value={objectFilterCategory}
              onChange={(event) => setObjectFilterCategory(event.target.value)}
            />
          </div>
          <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-600 uppercase tracking-wider text-xs">
                <tr>
                  <th className="text-left px-4 py-3">Object</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Categories</th>
                  <th className="text-left px-4 py-3">Enabled</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredObjects.map((row) => (
                  <tr key={row.id} className="border-t border-stone-200">
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900">{row.object_name}</div>
                      <div className="text-xs text-stone-500">{row.description}</div>
                    </td>
                    <td className="px-4 py-3">{row.object_type || "Unassigned"}</td>
                    <td className="px-4 py-3">{listToString(row.category_fit)}</td>
                    <td className="px-4 py-3">
                      <span className={row.enabled ? "text-emerald-600" : "text-rose-500"}>
                        {row.enabled ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedObjectId(row.id)
                          setObjectForm({
                            object_name: row.object_name,
                            object_type: row.object_type || "",
                            category_fit: row.category_fit || [],
                            description: row.description || "",
                            position_type: row.position_type || "",
                            enabled: row.enabled,
                          })
                          setObjectModalOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setDeleteTarget({ type: "objects", id: row.id, label: row.object_name })
                          setDeleteOpen(true)
                        }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredObjects.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                      No objects found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={outfitModalOpen} onOpenChange={setOutfitModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedOutfitId ? "Edit Outfit" : "Add Outfit"}</DialogTitle>
            <DialogDescription>Update outfit library details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <input
              className="w-full border border-stone-200 rounded-md px-3 py-2"
              placeholder="Outfit name"
              value={outfitForm.outfit_name}
              onChange={(event) => setOutfitForm({ ...outfitForm, outfit_name: event.target.value })}
            />
            <input
              className="w-full border border-stone-200 rounded-md px-3 py-2"
              placeholder="Fashion style"
              value={outfitForm.fashion_style || ""}
              onChange={(event) => setOutfitForm({ ...outfitForm, fashion_style: event.target.value })}
            />
            <input
              className="w-full border border-stone-200 rounded-md px-3 py-2"
              placeholder="Category fit (comma-separated)"
              value={listToString(outfitForm.category_fit)}
              onChange={(event) =>
                setOutfitForm({ ...outfitForm, category_fit: stringToList(event.target.value) })
              }
            />
            <input
              className="w-full border border-stone-200 rounded-md px-3 py-2"
              placeholder="Outfit base"
              value={outfitForm.outfit_base || ""}
              onChange={(event) => setOutfitForm({ ...outfitForm, outfit_base: event.target.value })}
            />
            <input
              className="w-full border border-stone-200 rounded-md px-3 py-2"
              placeholder="Outfit style"
              value={outfitForm.outfit_style || ""}
              onChange={(event) => setOutfitForm({ ...outfitForm, outfit_style: event.target.value })}
            />
            <input
              className="w-full border border-stone-200 rounded-md px-3 py-2"
              placeholder="Outfit layer"
              value={outfitForm.outfit_layer || ""}
              onChange={(event) => setOutfitForm({ ...outfitForm, outfit_layer: event.target.value })}
            />
            <textarea
              className="w-full border border-stone-200 rounded-md px-3 py-2"
              placeholder="Description"
              rows={3}
              value={outfitForm.description || ""}
              onChange={(event) => setOutfitForm({ ...outfitForm, description: event.target.value })}
            />
            <label className="flex items-center gap-2 text-xs text-stone-600">
              <input
                type="checkbox"
                checked={outfitForm.enabled}
                onChange={(event) => setOutfitForm({ ...outfitForm, enabled: event.target.checked })}
              />
              Enabled
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutfitModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveOutfit}>Save Outfit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={locationModalOpen} onOpenChange={setLocationModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedLocationId ? "Edit Location" : "Add Location"}</DialogTitle>
            <DialogDescription>Update location library details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <input
              className="w-full border border-stone-200 rounded-md px-3 py-2"
              placeholder="Location name"
              value={locationForm.location_name}
              onChange={(event) => setLocationForm({ ...locationForm, location_name: event.target.value })}
            />
            <input
              className="w-full border border-stone-200 rounded-md px-3 py-2"
              placeholder="Location type"
              value={locationForm.location_type || ""}
              onChange={(event) => setLocationForm({ ...locationForm, location_type: event.target.value })}
            />
            <input
              className="w-full border border-stone-200 rounded-md px-3 py-2"
              placeholder="Category fit (comma-separated)"
              value={listToString(locationForm.category_fit)}
              onChange={(event) =>
                setLocationForm({ ...locationForm, category_fit: stringToList(event.target.value) })
              }
            />
            <textarea
              className="w-full border border-stone-200 rounded-md px-3 py-2"
              placeholder="Description"
              rows={3}
              value={locationForm.description || ""}
              onChange={(event) => setLocationForm({ ...locationForm, description: event.target.value })}
            />
            <div className="flex gap-4 text-xs text-stone-600">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(locationForm.indoor)}
                  onChange={(event) => setLocationForm({ ...locationForm, indoor: event.target.checked })}
                />
                Indoor
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(locationForm.public)}
                  onChange={(event) => setLocationForm({ ...locationForm, public: event.target.checked })}
                />
                Public
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs text-stone-600">
              <input
                type="checkbox"
                checked={locationForm.enabled}
                onChange={(event) => setLocationForm({ ...locationForm, enabled: event.target.checked })}
              />
              Enabled
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocationModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLocation}>Save Location</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={objectModalOpen} onOpenChange={setObjectModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedObjectId ? "Edit Object" : "Add Object"}</DialogTitle>
            <DialogDescription>Update object library details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <input
              className="w-full border border-stone-200 rounded-md px-3 py-2"
              placeholder="Object name"
              value={objectForm.object_name}
              onChange={(event) => setObjectForm({ ...objectForm, object_name: event.target.value })}
            />
            <input
              className="w-full border border-stone-200 rounded-md px-3 py-2"
              placeholder="Object type"
              value={objectForm.object_type || ""}
              onChange={(event) => setObjectForm({ ...objectForm, object_type: event.target.value })}
            />
            <input
              className="w-full border border-stone-200 rounded-md px-3 py-2"
              placeholder="Category fit (comma-separated)"
              value={listToString(objectForm.category_fit)}
              onChange={(event) =>
                setObjectForm({ ...objectForm, category_fit: stringToList(event.target.value) })
              }
            />
            <textarea
              className="w-full border border-stone-200 rounded-md px-3 py-2"
              placeholder="Description"
              rows={3}
              value={objectForm.description || ""}
              onChange={(event) => setObjectForm({ ...objectForm, description: event.target.value })}
            />
            <input
              className="w-full border border-stone-200 rounded-md px-3 py-2"
              placeholder="Position type"
              value={objectForm.position_type || ""}
              onChange={(event) => setObjectForm({ ...objectForm, position_type: event.target.value })}
            />
            <label className="flex items-center gap-2 text-xs text-stone-600">
              <input
                type="checkbox"
                checked={objectForm.enabled}
                onChange={(event) => setObjectForm({ ...objectForm, enabled: event.target.checked })}
              />
              Enabled
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObjectModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveObject}>Save Object</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete item?</DialogTitle>
            <DialogDescription>
              This will delete <span className="font-semibold">{deleteTarget?.label}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
