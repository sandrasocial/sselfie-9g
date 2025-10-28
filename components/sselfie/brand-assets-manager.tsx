"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Upload, FileText, ImageIcon, Video, File, Trash2 } from "lucide-react"

interface BrandAsset {
  id: number
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  description: string | null
  created_at: string
}

export default function BrandAssetsManager() {
  const [assets, setAssets] = useState<BrandAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchAssets()
  }, [])

  const fetchAssets = async () => {
    try {
      const response = await fetch("/api/brand-assets")
      if (response.ok) {
        const data = await response.json()
        setAssets(data.assets)
      }
    } catch (error) {
      console.error("[v0] Error fetching assets:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0])
    }
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/brand-assets/upload", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        await fetchAssets()
      } else {
        console.error("[v0] Upload failed")
      }
    } catch (error) {
      console.error("[v0] Upload error:", error)
    } finally {
      setUploading(false)
    }
  }

  const deleteAsset = async (assetId: number) => {
    try {
      const response = await fetch("/api/brand-assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      })

      if (response.ok) {
        setAssets(assets.filter((a) => a.id !== assetId))
      }
    } catch (error) {
      console.error("[v0] Delete error:", error)
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <ImageIcon size={20} />
    if (fileType.startsWith("video/")) return <Video size={20} />
    if (fileType.includes("pdf")) return <FileText size={20} />
    return <File size={20} />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-stone-50 to-stone-100/50 rounded-2xl p-6 border border-stone-200/60">
        <div className="text-center text-stone-500">Loading assets...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-wide text-stone-950">Brand Assets</h3>
          <p className="text-xs text-stone-600 mt-1">Upload files for Maya to use in your content strategy</p>
        </div>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? "border-stone-900 bg-stone-100"
            : "border-stone-300 bg-gradient-to-br from-stone-50 to-stone-100/50 hover:border-stone-400"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,video/*,.pdf,.doc,.docx"
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-stone-900 rounded-xl flex items-center justify-center">
            <Upload size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-950">
              {uploading ? "Uploading..." : "Drop files here or click to upload"}
            </p>
            <p className="text-xs text-stone-600 mt-1">PDFs, images, videos, and documents</p>
          </div>
        </div>
      </div>

      {assets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white/60 rounded-xl p-4 border border-stone-200/40 hover:border-stone-300 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  {getFileIcon(asset.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-950 truncate">{asset.file_name}</p>
                  <p className="text-xs text-stone-600">{formatFileSize(asset.file_size)}</p>
                  {asset.description && <p className="text-xs text-stone-500 mt-1">{asset.description}</p>}
                </div>
                <button
                  onClick={() => deleteAsset(asset.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-stone-100 rounded-lg"
                >
                  <Trash2 size={16} className="text-stone-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-stone-500 text-sm">
          No assets uploaded yet. Upload files to help Maya understand your brand better.
        </div>
      )}
    </div>
  )
}
