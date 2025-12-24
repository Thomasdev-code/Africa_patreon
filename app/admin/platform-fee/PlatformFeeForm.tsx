"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

interface PlatformFeeFormProps {
  currentFee: number
  updateFee: (formData: FormData) => Promise<void>
}

export function PlatformFeeForm({ currentFee, updateFee }: PlatformFeeFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    
    const formData = new FormData(e.currentTarget)
    const feePercent = Number(formData.get("feePercent"))
    
    // Client-side validation
    if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 100) {
      setError("Fee percent must be between 0 and 100")
      return
    }

    startTransition(async () => {
      try {
        await updateFee(formData)
        setSuccess(`Platform fee successfully updated to ${feePercent}%`)
        router.refresh()
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccess("")
        }, 5000)
      } catch (err: any) {
        console.error("Platform fee update error:", err)
        setError(err.message || "Failed to update platform fee. Please try again.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium text-green-800">{success}</p>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="feePercent" className="block text-sm font-medium text-gray-700 mb-2">
          Platform Fee Percentage (%)
        </label>
        <div className="flex items-center gap-4">
          <input
            id="feePercent"
            name="feePercent"
            type="number"
            step="0.1"
            min="0"
            max="100"
            defaultValue={currentFee}
            required
            disabled={isPending}
            className="flex-1 rounded-md border border-gray-300 px-4 py-3 text-lg font-semibold shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="text-lg font-medium text-gray-700">%</span>
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-sm text-gray-600">
            <strong>Important:</strong> Changes apply immediately to all new payments. Existing payments are not affected.
          </p>
          <p className="text-xs text-gray-500">
            • Minimum: 0% (no platform fee)
            <br />
            • Maximum: 100% (all revenue to platform)
            <br />
            • Recommended range: 5-15% for sustainable operations
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Updating...
            </>
          ) : (
            <>
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Update Platform Fee
            </>
          )}
        </button>
        <p className="text-xs text-gray-500">
          This action will be logged for audit purposes.
        </p>
      </div>
    </form>
  )
}

