"use client"

import { useState, FormEvent } from "react"
import MediaUploader from "@/components/MediaUploader"
import type { CreatePostInput, UpdatePostInput, MembershipTier, MediaType } from "@/lib/types"

interface PostFormProps {
  initialData?: {
    title?: string
    content?: string
    mediaType?: MediaType
    mediaUrl?: string | null
    tierName?: string | null
    isPublished?: boolean
  }
  tiers?: MembershipTier[]
  onSubmit: (data: CreatePostInput | UpdatePostInput) => Promise<void>
  isLoading?: boolean
  submitLabel?: string
}

export default function PostForm({
  initialData,
  tiers = [],
  onSubmit,
  isLoading = false,
  submitLabel = "Create Post",
}: PostFormProps) {
  const [title, setTitle] = useState(initialData?.title || "")
  const [content, setContent] = useState(initialData?.content || "")
  const [mediaType, setMediaType] = useState<MediaType>(initialData?.mediaType || null)
  const [mediaUrl, setMediaUrl] = useState(initialData?.mediaUrl || "")
  const [tierName, setTierName] = useState(initialData?.tierName || "")
  const [isPublished, setIsPublished] = useState(
    initialData?.isPublished || false
  )
  const [isPPV, setIsPPV] = useState(initialData?.isPPV || false)
  const [ppvPrice, setPpvPrice] = useState(
    initialData?.ppvPrice ? initialData.ppvPrice.toString() : ""
  )
  const [ppvCurrency, setPpvCurrency] = useState(initialData?.ppvCurrency || "USD")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    await onSubmit({
      title: title.trim(),
      content: content.trim(),
      mediaType: mediaType,
      mediaUrl: mediaUrl.trim() || undefined,
      tierName: isPPV ? null : (tierName || null), // PPV posts can't have tier restrictions
      isPublished: isPublished,
      isPPV: isPPV,
      ppvPrice: isPPV && ppvPrice ? parseFloat(ppvPrice) : null,
      ppvCurrency: isPPV ? ppvCurrency : null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Title *
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter post title"
          required
          disabled={isLoading}
        />
      </div>

      {/* Content */}
      <div>
        <label
          htmlFor="content"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Content * (Markdown supported)
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder="Write your post content here... (Markdown supported)"
          required
          disabled={isLoading}
        />
        <p className="mt-1 text-sm text-gray-500">
          You can use Markdown formatting for rich text
        </p>
      </div>

      {/* Media Upload */}
      <MediaUploader
        onUploadComplete={(url, type) => {
          setMediaUrl(url)
          setMediaType(type)
        }}
        currentMediaUrl={mediaUrl}
        currentMediaType={mediaType}
        disabled={isLoading}
      />

      {/* PPV Toggle */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isPPV"
          checked={isPPV}
          onChange={(e) => {
            setIsPPV(e.target.checked)
            if (e.target.checked) {
              setTierName("") // Clear tier selection when PPV is enabled
            }
          }}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          disabled={isLoading}
        />
        <label
          htmlFor="isPPV"
          className="ml-2 block text-sm font-medium text-gray-700"
        >
          Make this a Pay-Per-View (PPV) post
        </label>
      </div>
      <p className="text-sm text-gray-500 -mt-2 mb-4">
        PPV posts are purchased individually. Cannot be combined with tier restrictions.
      </p>

      {/* PPV Price (shown when PPV is enabled) */}
      {isPPV && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
          <div>
            <label
              htmlFor="ppvPrice"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              PPV Price (USD) *
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                id="ppvPrice"
                value={ppvPrice}
                onChange={(e) => setPpvPrice(e.target.value)}
                min="0.01"
                step="0.01"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required={isPPV}
                disabled={isLoading}
              />
              <select
                value={ppvCurrency}
                onChange={(e) => setPpvCurrency(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="USD">USD</option>
                <option value="KES">KES</option>
                <option value="NGN">NGN</option>
                <option value="GHS">GHS</option>
                <option value="ZAR">ZAR</option>
              </select>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Price will be automatically converted to fan's local currency based on their country
            </p>
          </div>
        </div>
      )}

      {/* Tier Selection (hidden when PPV is enabled) */}
      {!isPPV && (
        <div>
          <label
            htmlFor="tierName"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Lock to Tier (Optional)
          </label>
          <select
            id="tierName"
            value={tierName}
            onChange={(e) => setTierName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="">Free Post (Public)</option>
            {tiers.map((tier) => (
              <option key={tier.name} value={tier.name}>
                {tier.name} Tier (${tier.price}/month)
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Leave blank for free content, or select a tier to lock this post
          </p>
        </div>
      )}

      {/* Publish Toggle */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isPublished"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          disabled={isLoading}
        />
        <label
          htmlFor="isPublished"
          className="ml-2 block text-sm text-gray-700"
        >
          Publish immediately
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Saving..." : submitLabel}
      </button>
    </form>
  )
}

