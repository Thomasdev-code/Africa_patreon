"use client"

import Avatar from "@/components/Avatar"
import type { Conversation } from "@/lib/types"

interface ChatSidebarProps {
  conversations: Conversation[]
  selectedUserId: string | null
  onSelectConversation: (conversation: Conversation) => void
  isLoading: boolean
}

export default function ChatSidebar({
  conversations,
  selectedUserId,
  onSelectConversation,
  isLoading,
}: ChatSidebarProps) {
  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-600">Loading conversations...</div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-sm">No conversations yet</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {conversations.map((conversation) => {
        const isSelected = conversation.userId === selectedUserId
        const lastMessage = conversation.lastMessage

        return (
          <button
            key={conversation.userId}
            onClick={() => onSelectConversation(conversation)}
            className={`w-full p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left ${
              isSelected ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar
                  src={conversation.avatarUrl}
                  alt={conversation.username}
                  size="md"
                />
                {conversation.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {conversation.unreadCount > 9
                      ? "9+"
                      : conversation.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-900 truncate">
                    {conversation.username}
                  </span>
                  {lastMessage && (
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatTime(lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                {lastMessage && (
                  <p className="text-sm text-gray-600 truncate">
                    {lastMessage.content ||
                      (lastMessage.mediaType === "image"
                        ? "📷 Image"
                        : lastMessage.mediaType === "audio"
                        ? "🎵 Audio"
                        : "Media")}
                  </p>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

