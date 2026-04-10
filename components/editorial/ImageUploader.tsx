"use client"

import type React from "react"
import { useCallback, useRef } from "react"

type Props = {
  onFile: (file: File) => void
  className?: string
}

export function ImageUploader({ onFile, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (!file || !file.type.startsWith("image/")) return
      onFile(file)
    },
    [onFile],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Upload image"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="w-full rounded-lg border border-dashed border-[#e5e5e5] bg-white px-4 py-8 text-center text-sm text-[#0a0a0a] transition-opacity hover:opacity-80"
      >
        Drop an image here or click to upload
        <span className="mt-1 block text-xs font-normal text-[#666666]">JPG, PNG, WebP</span>
      </button>
    </div>
  )
}
