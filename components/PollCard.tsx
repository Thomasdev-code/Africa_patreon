"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import type { PublicPoll } from "@/lib/types"
import Link from "next/link"

interface PollCardProps {
  poll: PublicPoll
  creatorUsername: string
  onVote?: () => void
}

export default function PollCard({
  poll,
  creatorUsername,
  onVote,
}: PollCardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [selectedOption, setSelectedOption] = useState<string | null>(
    poll.userVote?.optionId || null
  )
  const [isVoting, setIsVoting] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [isLoadingResults, setIsLoadingResults] = useState(false)
  const [hasVoted, setHasVoted] = useState(poll.hasVoted || false)

  const isEnded = poll.isEnded || (poll.endsAt && new Date(poll.endsAt) < new Date())
  const showResults = hasVoted || !poll.hideResultsUntilEnd || isEnded

  useEffect(() => {
    if (showResults && !results && !isLoadingResults) {
      fetchResults()
    }
  }, [showResults])

  const fetchResults = async () => {
    setIsLoadingResults(true)
    try {
      const res = await fetch(`/api/polls/results/${poll.id}`)
      const data = await res.json()
      if (res.ok) {
        setResults(data)
      }
    } catch (err) {
      console.error("Failed to fetch results", err)
    } finally {
      setIsLoadingResults(false)
    }
  }

  const handleVote = async () => {
    if (!selectedOption) return

    if (!session?.user) {
      router.push("/login")
      return
    }

    if (session.user.role !== "fan") {
      alert("Only fans can vote on polls")
      return
    }

    setIsVoting(true)
    try {
      const res = await fetch("/api/polls/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId: poll.id,
          optionId: selectedOption,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || "Failed to vote")
        return
      }

      setHasVoted(true)
      await fetchResults()
      if (onVote) onVote()
    } catch (err) {
      console.error("Vote error:", err)
      alert("An error occurred while voting")
    } finally {
      setIsVoting(false)
    }
  }

  const canVote = session?.user?.role === "fan" && !hasVoted && !isEnded
  const needsSubscription = poll.resultsLocked && !hasVoted

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      {/* Poll Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {poll.question}
          </h3>
          {poll.tierName && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              🔒 {poll.tierName} Tier Required
            </span>
          )}
          {poll.endsAt && (
            <p className="text-xs text-gray-500 mt-1">
              {isEnded ? "Ended" : `Ends ${new Date(poll.endsAt).toLocaleDateString()}`}
            </p>
          )}
        </div>
      </div>

      {/* Lock Overlay */}
      {needsSubscription && !hasVoted && (
        <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-800 mb-2">
            This poll requires a subscription to the <strong>{poll.tierName}</strong> tier.
          </p>
          <Link
            href={`/creator/${creatorUsername}/subscribe`}
            className="inline-block px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors"
          >
            Subscribe to Vote
          </Link>
        </div>
      )}

      {/* Poll Options */}
      {!hasVoted && canVote && !needsSubscription && (
        <div className="space-y-3 mb-4">
          {poll.options.map((option) => (
            <label
              key={option.id}
              className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                selectedOption === option.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name={`poll-${poll.id}`}
                value={option.id}
                checked={selectedOption === option.id}
                onChange={(e) => setSelectedOption(e.target.value)}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-900 flex-1">{option.text}</span>
            </label>
          ))}
          <button
            onClick={handleVote}
            disabled={!selectedOption || isVoting}
            className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isVoting ? "Voting..." : "Vote"}
          </button>
        </div>
      )}

      {/* Results */}
      {(hasVoted || showResults) && (
        <div className="space-y-3">
          {isLoadingResults ? (
            <div className="space-y-2">
              {poll.options.map((_, idx) => (
                <div
                  key={idx}
                  className="h-10 bg-gray-200 rounded animate-pulse"
                />
              ))}
            </div>
          ) : results ? (
            results.options.map((option: any) => {
              const isUserVote = results.userVote?.optionId === option.id
              return (
                <div key={option.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-medium ${isUserVote ? "text-blue-600" : "text-gray-900"}`}>
                      {option.text}
                      {isUserVote && " ✓"}
                    </span>
                    <span className="text-gray-600">
                      {option.voteCount || 0} votes (
                      {option.percentage?.toFixed(1) || 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isUserVote ? "bg-blue-600" : "bg-gray-400"
                      }`}
                      style={{
                        width: `${option.percentage || 0}%`,
                      }}
                    />
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              Loading results...
            </p>
          )}
          {results && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Total votes: {results.totalVotes || 0}
            </p>
          )}
        </div>
      )}

      {/* Not logged in message */}
      {!session?.user && !hasVoted && !needsSubscription && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-600 mb-3">
            Sign in to vote on this poll
          </p>
          <Link
            href="/login"
            className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      )}
    </div>
  )
}

