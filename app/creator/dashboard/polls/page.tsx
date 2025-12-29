"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import type { Poll, CreatePollInput } from "@/lib/types"

export default function CreatorPollsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [polls, setPolls] = useState<Poll[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Create poll form state
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState<string[]>(["", ""])
  const [tierName, setTierName] = useState<string | null>(null)
  const [hideResultsUntilEnd, setHideResultsUntilEnd] = useState(false)
  const [endsAt, setEndsAt] = useState("")
  const [availableTiers, setAvailableTiers] = useState<
    { name: string; price: number }[]
  >([])

  useEffect(() => {
    if (session?.user?.role !== "creator") {
      router.push("/creator/dashboard")
      return
    }
    fetchPolls()
    fetchProfile()
  }, [session])

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/creator/me")
      const data = await res.json()
      if (res.ok && data.profile) {
        setAvailableTiers(data.profile.tiers || [])
      }
    } catch (err) {
      console.error("Failed to fetch profile", err)
    }
  }

  const fetchPolls = async () => {
    try {
      const res = await fetch("/api/creator/me")
      const data = await res.json()
      if (!res.ok || !data.profile) {
        setError("Failed to load profile")
        return
      }

      const pollsRes = await fetch(`/api/polls/${data.profile.username}`)
      const pollsData = await pollsRes.json()
      if (pollsRes.ok) {
        setPolls(pollsData.polls || [])
      }
    } catch (err) {
      console.error("Failed to fetch polls", err)
      setError("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""])
    }
  }

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!question.trim()) {
      setError("Question is required")
      return
    }

    const validOptions = options.filter((opt) => opt.trim().length > 0)
    if (validOptions.length < 2) {
      setError("At least 2 options are required")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/polls/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          options: validOptions.map((opt) => opt.trim()),
          tierName: tierName || null,
          hideResultsUntilEnd,
          endsAt: endsAt || null,
        } as CreatePollInput),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to create poll")
        return
      }

      // Reset form
      setQuestion("")
      setOptions(["", ""])
      setTierName(null)
      setHideResultsUntilEnd(false)
      setEndsAt("")
      setShowCreateModal(false)
      setError("")

      // Refresh polls list
      await fetchPolls()
    } catch (err) {
      console.error("Create poll error:", err)
      setError("An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Polls</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Create Poll
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Create Poll Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Create New Poll
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setError("")
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreatePoll}>
                  {/* Question */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Poll Question *
                    </label>
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="What would you like to ask your fans?"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Options */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Options * (at least 2, max 10)
                    </label>
                    <div className="space-y-2">
                      {options.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) =>
                              handleOptionChange(index, e.target.value)
                            }
                            placeholder={`Option ${index + 1}`}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                          {options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(index)}
                              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {options.length < 10 && (
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                      >
                        + Add Option
                      </button>
                    )}
                  </div>

                  {/* Tier Lock */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Require Subscription Tier (Optional)
                    </label>
                    <select
                      value={tierName || ""}
                      onChange={(e) =>
                        setTierName(e.target.value || null)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Free (All fans can vote)</option>
                      {availableTiers.map((tier) => (
                        <option key={tier.name} value={tier.name}>
                          {tier.name} (${tier.price}/month)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Hide Results */}
                  <div className="mb-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={hideResultsUntilEnd}
                        onChange={(e) =>
                          setHideResultsUntilEnd(e.target.checked)
                        }
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        Hide results until poll ends
                      </span>
                    </label>
                  </div>

                  {/* End Date */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? "Creating..." : "Create Poll"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false)
                        setError("")
                      }}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Polls List */}
        {polls.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 mb-4">No polls yet.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Poll
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {polls.map((poll) => (
              <div
                key={poll.id}
                className="bg-white rounded-lg shadow-md border border-gray-200 p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {poll.question}
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      {poll.tierName && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          🔒 {poll.tierName}
                        </span>
                      )}
                      {poll.endsAt && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Ends {new Date(poll.endsAt).toLocaleDateString()}
                        </span>
                      )}
                      {poll.hideResultsUntilEnd && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Results Hidden
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {poll.options?.length || 0} options •{" "}
                  {(poll.options?.reduce((sum, opt) => sum + (opt.voteCount || 0), 0) || 0)} votes • Created{" "}
                  {new Date(poll.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

