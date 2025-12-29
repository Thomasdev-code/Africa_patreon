"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ChatSidebar from "@/components/ChatSidebar"
import ChatWindow from "@/components/ChatWindow"
import type { Conversation, Message } from "@/lib/types"

function MessagesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedUserId = searchParams.get("userId")

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (selectedUserId) {
      const conversation = conversations.find(
        (c) => c.userId === selectedUserId
      )
      if (conversation) {
        setSelectedConversation(conversation)
      }
    }
  }, [selectedUserId, conversations])

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/messages/conversations")
      const data = await res.json()

      if (res.ok) {
        setConversations(data.conversations || [])
      }
    } catch (err) {
      console.error("Conversations fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    router.push(`/messages?userId=${conversation.userId}`)
  }

  const handleMessageSent = () => {
    fetchConversations()
    if (selectedConversation) {
      // Refresh conversation
      const updated = conversations.find(
        (c) => c.userId === selectedConversation.userId
      )
      if (updated) {
        setSelectedConversation(updated)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Messages</h1>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="flex h-[600px]">
            {/* Sidebar */}
            <div className="w-1/3 border-r border-gray-200">
              <ChatSidebar
                conversations={conversations}
                selectedUserId={selectedUserId}
                onSelectConversation={handleSelectConversation}
                isLoading={isLoading}
              />
            </div>

            {/* Chat Window */}
            <div className="flex-1">
              {selectedConversation ? (
                <ChatWindow
                  conversation={selectedConversation}
                  onMessageSent={handleMessageSent}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <p className="text-lg mb-2">Select a conversation</p>
                    <p className="text-sm">
                      Choose a conversation from the sidebar to start messaging
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Loading messages...</p>
        </div>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}

