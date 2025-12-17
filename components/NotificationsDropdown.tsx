"use client"

import Link from "next/link"
import type { NotificationData } from "@/lib/types"

interface NotificationsDropdownProps {
  notifications: NotificationData[]
  isLoading: boolean
  onNotificationClick: (notification: NotificationData) => void
  onMarkAllRead: () => void
  onClose: () => void
}

export default function NotificationsDropdown({
  notifications,
  isLoading,
  onNotificationClick,
  onMarkAllRead,
  onClose,
}: NotificationsDropdownProps) {
  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(date).toLocaleDateString()
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
    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-gray-600">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => onNotificationClick(notification)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                  !notification.isRead ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">
                    {getIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {notification.title}
                      </h4>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {notification.body}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 text-center">
          <Link
            href="/notifications"
            onClick={onClose}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )
}

