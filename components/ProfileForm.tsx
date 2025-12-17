"use client"

import { useState, FormEvent } from "react"
import type { MembershipTier, CreateCreatorProfileInput } from "@/lib/types"

interface ProfileFormProps {
  initialData?: {
    username?: string
    bio?: string
    avatarUrl?: string | null
    bannerUrl?: string | null
    tiers?: MembershipTier[]
  }
  onSubmit: (data: CreateCreatorProfileInput) => Promise<void>
  isLoading?: boolean
}

export default function ProfileForm({
  initialData,
  onSubmit,
  isLoading = false,
}: ProfileFormProps) {
  const [username, setUsername] = useState(initialData?.username || "")
  const [bio, setBio] = useState(initialData?.bio || "")
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatarUrl || "")
  const [bannerUrl, setBannerUrl] = useState(initialData?.bannerUrl || "")
  const [tiers, setTiers] = useState<MembershipTier[]>(
    initialData?.tiers || [{ name: "Bronze", price: 5 }]
  )

  const addTier = () => {
    setTiers([...tiers, { name: "", price: 0 }])
  }

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index))
  }

  const updateTier = (index: number, field: keyof MembershipTier, value: string | number) => {
    const updated = [...tiers]
    updated[index] = { ...updated[index], [field]: value }
    setTiers(updated)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Validate tiers
    const validTiers = tiers.filter(
      (tier) => tier.name.trim() && tier.price > 0
    )

    if (validTiers.length === 0) {
      alert("Please add at least one valid tier")
      return
    }

    await onSubmit({
      username: username.trim(),
      bio: bio.trim(),
      avatarUrl: avatarUrl.trim() || undefined,
      bannerUrl: bannerUrl.trim() || undefined,
      tiers: validTiers,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Username */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
          Username *
        </label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="your-username"
          required
          pattern="[a-zA-Z0-9_-]{3,30}"
          title="3-30 characters, letters, numbers, underscores, or hyphens"
        />
        <p className="mt-1 text-sm text-gray-500">
          3-30 characters, letters, numbers, underscores, or hyphens
        </p>
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
          Bio *
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Tell your fans about yourself..."
          required
        />
      </div>

      {/* Avatar URL */}
      <div>
        <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-700 mb-2">
          Avatar URL
        </label>
        <input
          type="url"
          id="avatarUrl"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com/avatar.jpg"
        />
      </div>

      {/* Banner URL */}
      <div>
        <label htmlFor="bannerUrl" className="block text-sm font-medium text-gray-700 mb-2">
          Banner URL
        </label>
        <input
          type="url"
          id="bannerUrl"
          value={bannerUrl}
          onChange={(e) => setBannerUrl(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com/banner.jpg"
        />
      </div>

      {/* Membership Tiers */}
      <div>
        <div className="flex justify-between items-center mb-4">
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
        <div className="space-y-4">
          {tiers.map((tier, index) => (
            <div key={index} className="flex gap-4 items-start">
              <div className="flex-1">
                <input
                  type="text"
                  value={tier.name}
                  onChange={(e) => updateTier(index, "name", e.target.value)}
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
                    updateTier(index, "price", parseFloat(e.target.value) || 0)
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Price"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              {tiers.length > 1 && (
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
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Saving..." : "Save Profile"}
      </button>
    </form>
  )
}

