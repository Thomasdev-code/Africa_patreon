"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface EarningsSummary {
  totalEarnings: number
  totalWithdrawn: number
  totalPending: number
  availableBalance: number
}

export default function WithdrawPage() {
  const router = useRouter()
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<"mpesa" | "bank" | "stripe_connected_account">("mpesa")
  const [accountDetails, setAccountDetails] = useState({
    phoneNumber: "",
    accountNumber: "",
    bankName: "",
    accountName: "",
    routingNumber: "",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchEarnings()
  }, [])

  const fetchEarnings = async () => {
    try {
      const res = await fetch("/api/payouts/my-payouts")
      const data = await res.json()

      if (res.ok) {
        setEarnings(data.summary)
      }
    } catch (err) {
      console.error("Earnings fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) {
      setError("Please enter a valid amount")
      return
    }

    if (!earnings || amountNum > earnings.availableBalance) {
      setError(
        `Insufficient balance. Available: $${earnings?.availableBalance.toFixed(2) || 0}`
      )
      return
    }

    // Validate account details based on method
    if (method === "mpesa" && !accountDetails.phoneNumber) {
      setError("Phone number is required for M-Pesa")
      return
    }

    if (method === "bank") {
      if (!accountDetails.accountNumber || !accountDetails.bankName || !accountDetails.accountName) {
        setError("Account number, bank name, and account name are required")
        return
      }
    }

    setIsSubmitting(true)

    try {
      const res = await fetch("/api/payouts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          method: method,
          accountDetails:
            method === "mpesa"
              ? { phoneNumber: accountDetails.phoneNumber }
              : method === "bank"
              ? {
                  accountNumber: accountDetails.accountNumber,
                  bankName: accountDetails.bankName,
                  accountName: accountDetails.accountName,
                  routingNumber: accountDetails.routingNumber,
                }
              : {},
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        setAmount("")
        setAccountDetails({
          phoneNumber: "",
          accountNumber: "",
          bankName: "",
          accountName: "",
          routingNumber: "",
        })
        fetchEarnings()
      } else {
        setError(data.error || "Withdrawal request failed")
      }
    } catch (err) {
      console.error("Withdrawal error:", err)
      setError("An error occurred. Please try again.")
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <Link
            href="/creator/earnings"
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Earnings
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Request Withdrawal
          </h1>

          {/* Available Balance */}
          {earnings && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Available Balance</p>
              <p className="text-3xl font-bold text-blue-600">
                ${earnings.availableBalance.toFixed(2)}
              </p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              Withdrawal request submitted successfully! It will be reviewed by our team.
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Withdrawal Method
              </label>
              <select
                value={method}
                onChange={(e) =>
                  setMethod(
                    e.target.value as "mpesa" | "bank" | "stripe_connected_account"
                  )
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="mpesa">M-Pesa</option>
                <option value="bank">Bank Transfer</option>
                <option value="stripe_connected_account">Stripe Connected Account</option>
              </select>
            </div>

            {/* Account Details */}
            {method === "mpesa" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={accountDetails.phoneNumber}
                  onChange={(e) =>
                    setAccountDetails({
                      ...accountDetails,
                      phoneNumber: e.target.value,
                    })
                  }
                  placeholder="254712345678"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter phone number in international format (e.g., 254712345678)
                </p>
              </div>
            )}

            {method === "bank" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={accountDetails.accountName}
                    onChange={(e) =>
                      setAccountDetails({
                        ...accountDetails,
                        accountName: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={accountDetails.accountNumber}
                    onChange={(e) =>
                      setAccountDetails({
                        ...accountDetails,
                        accountNumber: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={accountDetails.bankName}
                    onChange={(e) =>
                      setAccountDetails({
                        ...accountDetails,
                        bankName: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Routing Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={accountDetails.routingNumber}
                    onChange={(e) =>
                      setAccountDetails({
                        ...accountDetails,
                        routingNumber: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {method === "stripe_connected_account" && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Stripe Connected Account withdrawals require account verification.
                  Please ensure your Stripe account is connected and verified.
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Request Withdrawal"}
              </button>
              <Link
                href="/creator/earnings"
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

