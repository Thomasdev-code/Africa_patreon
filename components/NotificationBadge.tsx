"use client"

import { useState, useEffect } from "react"

export default function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchUnreadCount()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/notifications")
      const data = await res.json()

      if (res.ok) {
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (err) {
      // Silently fail
    }
  }

  if (unreadCount === 0) return null

  return (
    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  )
}

