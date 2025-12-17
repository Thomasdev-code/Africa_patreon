"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Avatar from "@/components/Avatar"
import MessageInput from "@/components/MessageInput"
import type { Conversation, Message } from "@/lib/types"

interface ChatWindowProps {
  conversation: Conversation
  onMessageSent: () => void
}

export default function ChatWindow({
  conversation,
  onMessageSent,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [conversation.userId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      const res = await fetch(
        `/api/messages/conversation?userId=${conversation.userId}`
      )
      const data = await res.json()

      if (res.ok) {
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error("Messages fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const handleMessageSent = () => {
    fetchMessages()
    onMessageSent()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Avatar
            src={conversation.avatarUrl}
            alt={conversation.username}
            size="md"
          />
          <div>
            <h3 className="font-semibold text-gray-900">
              {conversation.username}
            </h3>
            <p className="text-sm text-gray-500">Active now</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {isLoading ? (
          <div className="text-center text-gray-600">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isSender = message.senderId !== conversation.userId
            const senderUsername =
              message.sender.creatorProfile?.username ||
              message.sender.email.split("@")[0]

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isSender ? "justify-end" : "justify-start"}`}
              >
                {!isSender && (
                  <Avatar
                    src={message.sender.creatorProfile?.avatarUrl || null}
                    alt={senderUsername}
                    size="sm"
                  />
                )}
                <div
                  className={`max-w-md ${
                    isSender ? "order-2" : "order-1"
                  }`}
                >
                  <div
                    className={`rounded-lg p-3 ${
                      isSender
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-900 border border-gray-200"
                    }`}
                  >
                    {message.content && (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                    {message.mediaUrl && (
                      <div className="mt-2">
                        {message.mediaType === "image" ? (
                          <div className="relative w-full h-48 rounded overflow-hidden">
                            <Image
                              src={message.mediaUrl}
                              alt="Message attachment"
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : message.mediaType === "audio" ? (
                          <audio src={message.mediaUrl} controls className="w-full" />
                        ) : (
                          <a
                            href={message.mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View attachment
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <p
                    className={`text-xs text-gray-500 mt-1 ${
                      isSender ? "text-right" : "text-left"
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
                {isSender && (
                  <Avatar
                    src={message.sender.creatorProfile?.avatarUrl || null}
                    alt={senderUsername}
                    size="sm"
                  />
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <MessageInput
          receiverId={conversation.userId}
          onMessageSent={handleMessageSent}
        />
      </div>
    </div>
  )
}

