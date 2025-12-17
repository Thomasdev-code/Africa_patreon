"use client"

import { useEffect } from "react"

export default function ContentProtection() {
  useEffect(() => {
    // Disable right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    // Disable common keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12 (DevTools), Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
        (e.ctrlKey && e.key === "U") ||
        (e.ctrlKey && e.key === "S") ||
        (e.ctrlKey && e.key === "P")
      ) {
        e.preventDefault()
        return false
      }
    }

    // Disable text selection on images and videos
    const handleSelectStart = (e: Event) => {
      const target = e.target
      if (!(target instanceof Element)) return

      const tag = target.tagName
      if (
        tag === "IMG" ||
        tag === "VIDEO" ||
        tag === "AUDIO" ||
        target.closest("img, video, audio")
      ) {
        e.preventDefault()
        return false
      }
    }

    // Disable drag and drop
    const handleDragStart = (e: DragEvent) => {
      const target = e.target
      if (!(target instanceof Element)) return

      const tag = target.tagName
      if (
        tag === "IMG" ||
        tag === "VIDEO" ||
        tag === "AUDIO" ||
        target.closest("img, video, audio")
      ) {
        e.preventDefault()
        return false
      }
    }

    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("selectstart", handleSelectStart)
    document.addEventListener("dragstart", handleDragStart)

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("selectstart", handleSelectStart)
      document.removeEventListener("dragstart", handleDragStart)
    }
  }, [])

  return null
}

