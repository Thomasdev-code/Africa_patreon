import { useState, useEffect, useCallback } from "react"
import type { NotificationData } from "@/lib/types"

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      const data = await res.json()

      if (res.ok) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
        setError("")
      } else {
        setError(data.error || "Failed to load notifications")
      }
    } catch (err) {
      console.error("Notifications fetch error:", err)
      setError("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const res = await fetch(`/api/notifications/${notificationId}/read`, {
          method: "PUT",
        })

        if (res.ok) {
          await fetchNotifications()
        }
      } catch (err) {
        console.error("Mark as read error:", err)
      }
    },
    [fetchNotifications]
  )

  const markAllAsRead = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "PUT",
      })

      if (res.ok) {
        await fetchNotifications()
      }
    } catch (err) {
      console.error("Mark all as read error:", err)
    }
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  }
}

