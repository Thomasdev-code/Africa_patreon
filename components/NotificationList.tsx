"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { NotificationWithPost } from "@/lib/types"

interface NotificationListProps {
  onNotificationClick?: (notificationId: string, postId: string) => void
  showUnreadOnly?: boolean
}

export default function NotificationList({
  onNotificationClick,
  showUnreadOnly = false,
}: NotificationListProps) {
  const [notifications, setNotifications] = useState<NotificationWithPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

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
        const filtered = showUnreadOnly
          ? data.notifications.filter((n: NotificationWithPost) => !n.isRead)
          : data.notifications
        setNotifications(filtered)
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (err) {
      console.error("Notifications fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PUT",
      })

      if (res.ok) {
        setNotifications(
          notifications.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        )
        setUnreadCount(Math.max(0, unreadCount - 1))
      }
    } catch (err) {
      console.error("Mark as read error:", err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "PUT",
      })

      if (res.ok) {
        setNotifications(notifications.map((n) => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      console.error("Mark all as read error:", err)
    }
  }

  const handleNotificationClick = (notification: NotificationWithPost) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id)
    }

    if (onNotificationClick) {
      onNotificationClick(notification.id, notification.postId)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-4 text-gray-600">Loading notifications...</div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        <p>No notifications yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {!showUnreadOnly && unreadCount > 0 && (
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-600">
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </span>
          <button
            onClick={handleMarkAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Mark all as read
          </button>
        </div>
      )}

      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
            notification.isRead
              ? "bg-white border-gray-200"
              : "bg-blue-50 border-blue-200"
          }`}
          onClick={() => handleNotificationClick(notification)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-900">{notification.message}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(notification.createdAt).toLocaleString()}
              </p>
            </div>
            {!notification.isRead && (
              <div className="ml-2 w-2 h-2 bg-blue-600 rounded-full"></div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

