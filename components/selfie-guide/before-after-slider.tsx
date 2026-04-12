"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"

type BeforeAfterSliderProps = {
  beforeSrc: string
  afterSrc: string
  beforeAlt: string
  afterAlt: string
  beforeLabel?: string
  afterLabel?: string
  width: number
  height: number
}

export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  beforeLabel = "Before",
  afterLabel = "After",
  width,
  height,
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50) // percent
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const updatePosition = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    setPosition((x / rect.width) * 100)
  }, [])

  const stopDragging = useCallback(() => {
    dragging.current = false
    setIsDragging(false)
  }, [])

  const startDragging = useCallback(
    (clientX: number) => {
      dragging.current = true
      setIsDragging(true)
      updatePosition(clientX)
    },
    [updatePosition],
  )

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startDragging(e.clientX)
    },
    [startDragging],
  )

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (event: MouseEvent) => {
      if (!dragging.current) return
      updatePosition(event.clientX)
    }

    const handleMouseUp = () => {
      stopDragging()
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (!dragging.current || event.touches.length === 0) return
      event.preventDefault()
      updatePosition(event.touches[0].clientX)
    }

    const handleTouchEnd = () => {
      stopDragging()
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    window.addEventListener("touchmove", handleTouchMove, { passive: false })
    window.addEventListener("touchend", handleTouchEnd)
    window.addEventListener("touchcancel", handleTouchEnd)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleTouchEnd)
      window.removeEventListener("touchcancel", handleTouchEnd)
    }
  }, [isDragging, stopDragging, updatePosition])

  const onTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 0) return
      startDragging(e.touches[0].clientX)
    },
    [startDragging],
  )

  const aspectRatio = height / width

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "600px",
        margin: "0 auto",
        position: "relative",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
        borderRadius: "3px",
        overflow: "hidden",
        border: "1px solid rgba(195,190,182,0.25)",
      }}
    >
      {/* Aspect ratio box */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          paddingBottom: `${aspectRatio * 100}%`,
          cursor: isDragging ? "grabbing" : "ew-resize",
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={(e) => updatePosition(e.clientX)}
      >
        {/* After image (full, underneath) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
          }}
        >
          <Image
            src={afterSrc}
            alt={afterAlt}
            fill
            loading="lazy"
            sizes="(max-width: 600px) 100vw, 600px"
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
            style={{ objectFit: "cover" }}
          />
        </div>

        {/* Before image (clipped to left side) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: `inset(0 ${100 - position}% 0 0)`,
            WebkitClipPath: `inset(0 ${100 - position}% 0 0)`,
            transition: isDragging ? "none" : "clip-path 0.04s linear",
          }}
        >
          <Image
            src={beforeSrc}
            alt={beforeAlt}
            fill
            loading="lazy"
            sizes="(max-width: 600px) 100vw, 600px"
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
            style={{ objectFit: "cover" }}
          />
        </div>

        {/* Divider line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${position}%`,
            width: "1px",
            backgroundColor: "rgba(240,237,232,0.7)",
            transform: "translateX(-50%)",
            pointerEvents: "none",
          }}
        >
          {/* Drag handle */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "rgba(13,12,11,0.85)",
              border: "1px solid rgba(195,190,182,0.4)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
          >
            <span style={{ color: "#f0ede8", fontSize: "10px", lineHeight: 1 }}>◂</span>
            <span style={{ color: "#f0ede8", fontSize: "10px", lineHeight: 1 }}>▸</span>
          </div>
        </div>

        {/* Labels */}
        <span
          style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            fontSize: "9px",
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(240,237,232,0.8)",
            backgroundColor: "rgba(13,12,11,0.55)",
            backdropFilter: "blur(6px)",
            padding: "3px 8px",
            borderRadius: "999px",
            pointerEvents: "none",
          }}
        >
          {beforeLabel}
        </span>
        <span
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            fontSize: "9px",
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(240,237,232,0.8)",
            backgroundColor: "rgba(13,12,11,0.55)",
            backdropFilter: "blur(6px)",
            padding: "3px 8px",
            borderRadius: "999px",
            pointerEvents: "none",
          }}
        >
          {afterLabel}
        </span>
      </div>
    </div>
  )
}
