"use client"

import { useEffect, useRef } from "react"

interface WatermarkOverlayProps {
  username: string
  timestamp?: Date
  className?: string
}

export default function WatermarkOverlay({
  username,
  timestamp,
  className = "",
}: WatermarkOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = 400
    canvas.height = 200

    // Draw watermark
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
    ctx.font = "bold 24px Arial"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    const text = `@${username}`
    const timeText = timestamp
      ? timestamp.toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : new Date().toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })

    // Draw text with shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)"
    ctx.shadowBlur = 4
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2

    ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 20)
    ctx.font = "16px Arial"
    ctx.fillText(timeText, canvas.width / 2, canvas.height / 2 + 20)
  }, [username, timestamp])

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none select-none ${className}`}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10,
        opacity: 0.7,
      }}
    />
  )
}

