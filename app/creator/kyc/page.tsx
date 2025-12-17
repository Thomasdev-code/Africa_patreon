"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface KycStatus {
  id: string
  status: "pending" | "approved" | "rejected"
  adminNotes?: string
  createdAt: string
  reviewedAt?: string
}

export default function KycPage() {
  const router = useRouter()
  const [kyc, setKyc] = useState<KycStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    fetchKyc()
  }, [])

  const fetchKyc = async () => {
    try {
      const res = await fetch("/api/kyc/submit")
      const data = await res.json()

      if (res.ok) {
        setKyc(data.kyc)
      }
    } catch (err) {
      console.error("KYC fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")
    setSuccess("")

    const formData = new FormData(e.currentTarget)
    const idDocument = formData.get("idDocument") as File
    const selfie = formData.get("selfie") as File
    const addressProof = formData.get("addressProof") as File

    if (!idDocument || !selfie) {
      setError("ID document and selfie are required")
      setIsSubmitting(false)
      return
    }

    try {
      const submitData = new FormData()
      submitData.append("idDocument", idDocument)
      submitData.append("selfie", selfie)
      if (addressProof) {
        submitData.append("addressProof", addressProof)
      }

      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        body: submitData,
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess("KYC documents submitted successfully! Awaiting admin review.")
        setKyc(data.kyc)
      } else {
        setError(data.error || "Failed to submit KYC documents")
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit KYC documents")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">KYC Verification</h1>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {kyc && kyc.status !== "pending" && (
          <div className="mb-6 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Current Status</h2>
            <div className="space-y-2">
              <p>
                <span className="font-semibold">Status:</span>{" "}
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    kyc.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {kyc.status.toUpperCase()}
                </span>
              </p>
              {kyc.adminNotes && (
                <p>
                  <span className="font-semibold">Admin Notes:</span> {kyc.adminNotes}
                </p>
              )}
              {kyc.reviewedAt && (
                <p>
                  <span className="font-semibold">Reviewed At:</span>{" "}
                  {new Date(kyc.reviewedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}

        {(!kyc || kyc.status === "rejected") && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Submit KYC Documents
            </h2>
            <p className="text-gray-600 mb-6">
              Please upload the following documents for verification. This is required
              to enable withdrawals.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID Document (Passport/National ID) *
                </label>
                <input
                  type="file"
                  name="idDocument"
                  accept="image/*,.pdf"
                  required
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selfie with ID Document *
                </label>
                <input
                  type="file"
                  name="selfie"
                  accept="image/*"
                  required
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proof of Address (Optional)
                </label>
                <input
                  type="file"
                  name="addressProof"
                  accept="image/*,.pdf"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit for Review"}
              </button>
            </form>
          </div>
        )}

        {kyc && kyc.status === "approved" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <p className="text-green-800">
              ✓ Your KYC verification has been approved. You can now request
              withdrawals.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

