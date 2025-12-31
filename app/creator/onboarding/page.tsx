"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { CreateCreatorProfileInput, MembershipTier } from "@/lib/types"

export default function CreatorOnboarding() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState<Partial<CreateCreatorProfileInput>>({
    username: "",
    bio: "",
    avatarUrl: "",
    bannerUrl: "",
    tiers: [{ name: "Bronze", price: 5 }],
  })
  const router = useRouter()

  const updateFormData = (field: keyof CreateCreatorProfileInput, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addTier = () => {
    const currentTiers = formData.tiers || []
    setFormData({
      ...formData,
      tiers: [...currentTiers, { name: "", price: 0 }],
    })
  }

  const removeTier = (index: number) => {
    const currentTiers = formData.tiers || []
    if (currentTiers.length > 1) {
      setFormData({
        ...formData,
        tiers: currentTiers.filter((_, i) => i !== index),
      })
    }
  }

  const updateTier = (
    index: number,
    field: keyof MembershipTier,
    value: string | number
  ) => {
    const currentTiers = formData.tiers || []
    const updated = [...currentTiers]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, tiers: updated })
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError("")

    // Validate required fields
    if (!formData.username || !formData.bio || !formData.tiers || formData.tiers.length === 0) {
      setError("Please complete all required fields")
      setIsLoading(false)
      return
    }

    // Validate tiers
    const validTiers = formData.tiers.filter(
      (tier) => tier.name.trim() && tier.price > 0
    )

    if (validTiers.length === 0) {
      setError("Please add at least one valid tier with a name and price")
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch("/api/creator/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username.trim(),
          bio: formData.bio.trim(),
          avatarUrl: formData.avatarUrl?.trim() || undefined,
          bannerUrl: formData.bannerUrl?.trim() || undefined,
          tiers: validTiers,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || "Failed to create profile")
        setIsLoading(false)
        return
      }

      // Refresh session to update isOnboarded status
      // This ensures middleware recognizes the user as onboarded
      await fetch("/api/auth/session", { method: "GET", cache: "no-store" })
      
      // Small delay to ensure session is updated
      await new Promise((resolve) => setTimeout(resolve, 200))
      
      // Redirect to dashboard
      router.push("/creator/dashboard")
    } catch (err) {
      console.error("Onboarding error:", err)
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Creator Onboarding
            </h1>
            <p className="text-gray-600">
              Set up your creator profile to start connecting with your fans
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      step >= s
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {s}
                  </div>
                  {s < 4 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        step > s ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Username</span>
              <span>Bio</span>
              <span>Media</span>
              <span>Tiers</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Step Content */}
          <div className="mb-6">
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Step 1: Choose Your Username
                </h2>
                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Username *
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={formData.username}
                    onChange={(e) => updateFormData("username", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your-username"
                    pattern="[a-zA-Z0-9_-]{3,30}"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    3-30 characters, letters, numbers, underscores, or hyphens
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (formData.username && formData.username.trim().length >= 3) {
                      setStep(2)
                    } else {
                      setError("Please enter a valid username")
                    }
                  }}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Next: Bio
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Step 2: Write Your Bio
                </h2>
                <div>
                  <label
                    htmlFor="bio"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Bio *
                  </label>
                  <textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => updateFormData("bio", e.target.value)}
                    rows={6}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tell your fans about yourself, your content, and what they can expect..."
                    required
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.bio && formData.bio.trim().length > 0) {
                        setStep(3)
                      } else {
                        setError("Please enter a bio")
                      }
                    }}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Next: Media
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Step 3: Add Avatar & Banner
                </h2>
                <div>
                  <label
                    htmlFor="avatarUrl"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    id="avatarUrl"
                    value={formData.avatarUrl || ""}
                    onChange={(e) => updateFormData("avatarUrl", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="bannerUrl"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Banner URL
                  </label>
                  <input
                    type="url"
                    id="bannerUrl"
                    value={formData.bannerUrl || ""}
                    onChange={(e) => updateFormData("bannerUrl", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/banner.jpg"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Next: Tiers
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Step 4: Create Membership Tiers
                </h2>
                <p className="text-gray-600 mb-4">
                  Set up different membership levels for your fans to subscribe
                  to
                </p>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-700">
                      Membership Tiers *
                    </label>
                    <button
                      type="button"
                      onClick={addTier}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      + Add Tier
                    </button>
                  </div>
                  {(formData.tiers || []).map((tier, index) => (
                    <div key={index} className="flex gap-4 items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={tier.name}
                          onChange={(e) =>
                            updateTier(index, "name", e.target.value)
                          }
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Tier name (e.g., Bronze)"
                          required
                        />
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          value={tier.price}
                          onChange={(e) =>
                            updateTier(
                              index,
                              "price",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Price"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      {(formData.tiers || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTier(index)}
                          className="text-red-600 hover:text-red-700 px-2"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Creating Profile..." : "Complete Onboarding"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
