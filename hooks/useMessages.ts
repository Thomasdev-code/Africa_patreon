import { useState, useEffect, useCallback } from "react"
import type { Message, Conversation, CreateMessageInput } from "@/lib/types"

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/conversations")
      const data = await res.json()

      if (res.ok) {
        setConversations(data.conversations || [])
        setError("")
      } else {
        setError(data.error || "Failed to load conversations")
      }
    } catch (err) {
      console.error("Conversations fetch error:", err)
      setError("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
    // Poll for new conversations every 30 seconds
    const interval = setInterval(fetchConversations, 30000)
    return () => clearInterval(interval)
  }, [fetchConversations])

  return {
    conversations,
    isLoading,
    error,
    refresh: fetchConversations,
  }
}

export function useMessages(userId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchMessages = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/messages/conversation?userId=${userId}`)
      const data = await res.json()

      if (res.ok) {
        setMessages(data.messages || [])
        setError("")
      } else {
        setError(data.error || "Failed to load messages")
      }
    } catch (err) {
      console.error("Messages fetch error:", err)
      setError("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchMessages()
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  const sendMessage = useCallback(
    async (input: CreateMessageInput) => {
      try {
        const res = await fetch("/api/messages/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "Failed to send message")
        }

        await fetchMessages()
        return data.message
      } catch (err) {
        console.error("Message send error:", err)
        throw err
      }
    },
    [fetchMessages]
  )

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    refresh: fetchMessages,
  }
}

