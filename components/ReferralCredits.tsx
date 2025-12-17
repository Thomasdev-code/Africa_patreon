"use client"

import { useState } from "react"
import type { ReferralCredit } from "@/lib/types"

interface ReferralCreditsProps {
  credits: ReferralCredit[]
  onWithdraw: () => void
}

export default function ReferralCredits({
  credits,
  onWithdraw,
}: ReferralCreditsProps) {
  const [showWithdrawForm, setShowWithdrawForm] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const availableCredits = credits
    .filter((c) => c.status === "available")
    .reduce((sum, c) => sum + c.amount, 0)

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const amount = parseFloat(withdrawAmount)
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount")
      return
    }

    if (amount > availableCredits) {
      setError("Insufficient credits")
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch("/api/referrals/credits/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          paymentMethod: "bank_transfer", // Default
          accountDetails: {}, // Would collect in production
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Withdrawal failed")
        return
      }

      alert("Withdrawal request submitted successfully!")
      setShowWithdrawForm(false)
      setWithdrawAmount("")
      onWithdraw()
    } catch (err) {
      console.error("Withdrawal error:", err)
      setError("An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Referral Credits</h2>
        {availableCredits > 0 && (
          <button
            onClick={() => setShowWithdrawForm(!showWithdrawForm)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {showWithdrawForm ? "Cancel" : "Withdraw"}
          </button>
        )}
      </div>

      {/* Available Credits */}
      <div className="bg-green-50 rounded-lg p-4 mb-6 border border-green-200">
        <p className="text-sm text-green-600 font-medium mb-1">
          Available Credits
        </p>
        <p className="text-3xl font-bold text-green-900">
          ${availableCredits.toFixed(2)}
        </p>
      </div>

      {/* Withdraw Form */}
      {showWithdrawForm && (
        <form onSubmit={handleWithdraw} className="mb-6 p-4 bg-gray-50 rounded-lg">
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Withdrawal Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={availableCredits}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              placeholder={`Max: $${availableCredits.toFixed(2)}`}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Processing..." : "Submit Withdrawal Request"}
          </button>
        </form>
      )}

      {/* Credits History */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Credits History
        </h3>
        {credits.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No credits yet</p>
        ) : (
          <div className="space-y-2">
            {credits.map((credit) => (
              <div
                key={credit.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {credit.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(credit.createdAt).toLocaleDateString()} •{" "}
                    {credit.type}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${
                      credit.status === "withdrawn"
                        ? "text-gray-600"
                        : credit.status === "available"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {credit.status === "withdrawn" ? "-" : "+"}$
                    {credit.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {credit.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

