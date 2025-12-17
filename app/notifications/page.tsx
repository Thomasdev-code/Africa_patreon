"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { NotificationData } from "@/lib/types"

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications")
      const data = await res.json()

      if (res.ok) {
        setNotifications(data.notifications || [])
      }
    } catch (err) {
      console.error("Notifications fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationClick = async (notification: NotificationData) => {
    // Mark as read
    if (!notification.isRead) {
      await fetch(`/api/notifications/${notification.id}/read`, {
        method: "PUT",
      })
      fetchNotifications()
    }

    // Navigate to link if available
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const handleMarkAllRead = async () => {
    await fetch("/api/notifications/read-all", {
      method: "PUT",
    })
    fetchNotifications()
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const getIcon = (type: NotificationData["type"]) => {
    switch (type) {
      case "comment":
      case "reply":
        return "💬"
      case "message":
        return "✉️"
      case "subscription":
        return "⭐"
      case "post":
        return "📝"
      default:
        return "🔔"
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Mark all as read
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-gray-600">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">No notifications yet</p>
              <p className="text-sm">
                You'll see notifications here when you receive comments, messages,
                or subscription updates.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full p-4 rounded-lg border text-left hover:bg-gray-50 transition-colors ${
                    !notification.isRead
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl flex-shrink-0">
                      {getIcon(notification.type)}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-gray-700 mb-2">{notification.body}</p>
                      <p className="text-sm text-gray-500">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

