"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSession } from "next-auth/react"
import Avatar from "@/components/Avatar"
import LockedContentOverlay from "@/components/LockedContentOverlay"
import CommentsSection from "@/components/CommentsSection"
import LikeButton from "@/components/LikeButton"
import ProviderSelectModal from "@/components/payments/ProviderSelectModal"
import WatermarkOverlay from "@/components/WatermarkOverlay"
import { getCurrencySymbol } from "@/lib/payments/currency"
import type { PostPreview } from "@/lib/types"

interface PostCardProps {
  post: PostPreview
  showCreator?: boolean
  onUnlock?: () => void
  showComments?: boolean
}

export default function PostCard({
  post,
  showCreator = false,
  onUnlock,
  showComments = false,
}: PostCardProps) {
  const { data: session } = useSession()
  const [showCommentsSection, setShowCommentsSection] = useState(showComments)
  const [likeCount, setLikeCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isLoadingLikes, setIsLoadingLikes] = useState(true)
  const [isUnlockingPPV, setIsUnlockingPPV] = useState(false)
  const [showProviderModal, setShowProviderModal] = useState(false)
  const [hasPurchasedPPV, setHasPurchasedPPV] = useState(post.hasPurchasedPPV || false)
  const [userCountry, setUserCountry] = useState<string>("US")
  const [ppvPriceInfo, setPpvPriceInfo] = useState<{ price: number; currency: string } | null>(null)
  const [signedMediaUrl, setSignedMediaUrl] = useState<string | null>(null)
  const [mediaToken, setMediaToken] = useState<string | null>(null)
  const contentPreview = post.content.length > 200
    ? post.content.substring(0, 200) + "..."
    : post.content

  // Detect user country
  useEffect(() => {
    const savedCountry = localStorage.getItem("userCountry")
    if (savedCountry) {
      setUserCountry(savedCountry)
    } else {
      fetch("https://ipapi.co/json/")
        .then((res) => res.json())
        .then((data) => {
          if (data.country_code) {
            setUserCountry(data.country_code)
            localStorage.setItem("userCountry", data.country_code)
          }
        })
        .catch(() => {})
    }
  }, [])

  // Check PPV purchase status
  useEffect(() => {
    if (post.isPPV && session?.user && session.user.role === "fan") {
      const checkPPV = async () => {
        try {
          const res = await fetch(`/api/ppv/check?postId=${post.id}`)
          const data = await res.json()
          if (res.ok) {
            setHasPurchasedPPV(data.hasPurchased || false)
            if (data.post?.ppvPrice && data.post?.ppvCurrency) {
              setPpvPriceInfo({
                price: data.post.ppvPrice,
                currency: data.post.ppvCurrency,
              })
            }
          }
        } catch (err) {
          console.error("Failed to check PPV status", err)
        }
      }
      checkPPV()
    }
  }, [post.id, post.isPPV, session])

  // Fetch PPV price info
  useEffect(() => {
    if (post.isPPV && post.ppvPrice && post.ppvCurrency && !ppvPriceInfo) {
      // Fetch converted price for user's country
      fetch(`/api/payments/price-info?priceUSD=${post.ppvPrice}&country=${userCountry}`)
        .then((res) => {
          if (res.ok) {
            return res.json()
          }
          throw new Error("Failed to fetch price")
        })
        .then((data) => {
          if (data.price && data.currency) {
            setPpvPriceInfo({
              price: data.price,
              currency: data.currency,
            })
          } else {
            // Fallback to post currency
            setPpvPriceInfo({
              price: post.ppvPrice || 0,
              currency: post.ppvCurrency || "USD",
            })
          }
        })
        .catch(() => {
          // Fallback to post currency
          setPpvPriceInfo({
            price: post.ppvPrice || 0,
            currency: post.ppvCurrency || "USD",
          })
        })
    }
  }, [post.isPPV, post.ppvPrice, post.ppvCurrency, userCountry])

  // Fetch signed media URL if content is unlocked
  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!post.mediaUrl || post.isLocked || (post.isPPV && !hasPurchasedPPV)) {
        return
      }

      // Only fetch signed URL for video and audio
      if (post.mediaType === "video" || post.mediaType === "audio") {
        try {
          const res = await fetch(`/api/media/signed?postId=${post.id}`)
          const data = await res.json()
          if (res.ok && data.url) {
            setSignedMediaUrl(data.url)
            if (data.token) {
              setMediaToken(data.token)
            }
          }
        } catch (err) {
          console.error("Failed to fetch signed URL", err)
          // Fallback to original URL
          setSignedMediaUrl(post.mediaUrl)
        }
      } else {
        setSignedMediaUrl(post.mediaUrl)
      }
    }

    fetchSignedUrl()
  }, [post.id, post.mediaUrl, post.mediaType, post.isLocked, post.isPPV, hasPurchasedPPV])

  // Fetch initial like status
  useEffect(() => {
    const fetchLikes = async () => {
      try {
        const res = await fetch(`/api/posts/${post.id}/likes`)
        const data = await res.json()
        if (res.ok) {
          setLikeCount(data.likeCount || 0)
          setIsLiked(data.isLiked || false)
        }
      } catch (err) {
        console.error("Failed to fetch likes", err)
      } finally {
        setIsLoadingLikes(false)
      }
    }

    if (!post.isLocked && !(post.isPPV && !hasPurchasedPPV)) {
      fetchLikes()
    }
  }, [post.id, post.isLocked, post.isPPV, hasPurchasedPPV])

  const renderMedia = () => {
    const mediaUrl = signedMediaUrl || post.mediaUrl
    const isLocked = post.isLocked || (post.isPPV && !hasPurchasedPPV)
    
    if (!mediaUrl) return null

    if (post.mediaType === "image" || (mediaUrl && mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
      return (
        <div className="w-full h-64 relative">
          {isLocked ? (
            <div className="relative w-full h-full">
              <Image
                src={mediaUrl}
                alt={post.title}
                fill
                className="object-cover blur-md"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-center">
                  <svg
                    className="mx-auto h-12 w-12 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <p className="text-sm font-medium">Locked Content</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full">
              <Image
                src={mediaUrl}
                alt={post.title}
                fill
                className="object-cover"
              />
              {post.creator && (
                <WatermarkOverlay
                  username={post.creator.username}
                  timestamp={new Date(post.createdAt)}
                  className="absolute"
                />
              )}
            </div>
          )}
        </div>
      )
    }

    if (post.mediaType === "video" || (mediaUrl && mediaUrl.match(/\.(mp4|webm|mov)$/i))) {
      return (
        <div className="w-full relative">
          {isLocked ? (
            <div className="relative w-full">
              <video
                src={mediaUrl}
                className="w-full max-h-96 blur-md pointer-events-none"
                muted
                loop
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-center">
                  <svg
                    className="mx-auto h-12 w-12 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <p className="text-sm font-medium">Locked Content</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full">
              <video
                src={mediaUrl}
                controls
                className="w-full max-h-96"
                controlsList="nodownload"
              >
                Your browser does not support the video tag.
              </video>
              {post.creator && (
                <WatermarkOverlay
                  username={post.creator.username}
                  timestamp={new Date(post.createdAt)}
                  className="absolute"
                />
              )}
            </div>
          )}
        </div>
      )
    }

    if (post.mediaType === "audio" || (mediaUrl && mediaUrl.match(/\.(mp3|wav|aac|m4a|ogg|flac)$/i))) {
      return (
        <div className="w-full p-4 bg-gray-50 rounded-lg relative">
          {isLocked ? (
            <div className="relative">
              <div className="blur-sm pointer-events-none">
                <audio src={mediaUrl} controls className="w-full opacity-50">
                  Your browser does not support the audio tag.
                </audio>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
                <div className="text-center p-4">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-600">Locked Content</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <audio
                src={mediaUrl}
                controls
                className="w-full"
                controlsList="nodownload"
              >
                Your browser does not support the audio tag.
              </audio>
              {post.creator && (
                <WatermarkOverlay
                  username={post.creator.username}
                  timestamp={new Date(post.createdAt)}
                  className="absolute top-4 right-4"
                />
              )}
            </>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
      {/* Media */}
      {renderMedia()}

      {/* Content */}
      <div className="p-6">
        {/* Creator Info */}
        {showCreator && post.creator && (
          <div className="flex items-center gap-3 mb-4">
            <Avatar
              src={post.creator.avatarUrl}
              alt={post.creator.username}
              size="sm"
            />
            <div>
              <Link
                href={`/creator/${post.creator.username}`}
                className="text-sm font-semibold text-gray-900 hover:text-blue-600"
              >
                @{post.creator.username}
              </Link>
            </div>
          </div>
        )}

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h3>

        {/* Tier Badge or PPV Badge */}
        {post.isPPV ? (
          <span className="inline-block bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-1 rounded mb-3">
            Pay-Per-View
          </span>
        ) : post.tierName ? (
          <span className="inline-block bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded mb-3">
            {post.tierName} Tier
          </span>
        ) : null}

        {/* PPV Unlock Button */}
        {post.isPPV && !hasPurchasedPPV && !post.isLocked && (
          <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Unlock this content
                </p>
                {ppvPriceInfo ? (
                  <p className="text-lg font-bold text-orange-600">
                    {getCurrencySymbol(ppvPriceInfo.currency as any)}
                    {new Intl.NumberFormat("en-US", {
                      minimumFractionDigits: ppvPriceInfo.currency === "KES" || ppvPriceInfo.currency === "NGN" ? 0 : 2,
                      maximumFractionDigits: ppvPriceInfo.currency === "KES" || ppvPriceInfo.currency === "NGN" ? 0 : 2,
                    }).format(ppvPriceInfo.price)}
                  </p>
                ) : post.ppvPrice ? (
                  <p className="text-lg font-bold text-orange-600">
                    ${(post.ppvPrice / 100).toFixed(2)}
                  </p>
                ) : null}
              </div>
              <button
                onClick={() => {
                  if (!session) {
                    window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
                    return
                  }
                  setShowProviderModal(true)
                }}
                disabled={isUnlockingPPV}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUnlockingPPV ? "Processing..." : "Unlock"}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="relative">
          {(post.isLocked || (post.isPPV && !hasPurchasedPPV)) ? (
            post.isPPV ? (
              <div className="relative">
                <div className="blur-sm pointer-events-none">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
                  <div className="text-center p-6">
                    <p className="text-gray-600 mb-4">This content is locked</p>
                    {ppvPriceInfo ? (
                      <p className="text-2xl font-bold text-orange-600 mb-4">
                        {getCurrencySymbol(ppvPriceInfo.currency as any)}
                        {new Intl.NumberFormat("en-US", {
                          minimumFractionDigits: ppvPriceInfo.currency === "KES" || ppvPriceInfo.currency === "NGN" ? 0 : 2,
                          maximumFractionDigits: ppvPriceInfo.currency === "KES" || ppvPriceInfo.currency === "NGN" ? 0 : 2,
                        }).format(ppvPriceInfo.price)}
                      </p>
                    ) : null}
                    <button
                      onClick={() => {
                        if (!session) {
                          window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
                          return
                        }
                        setShowProviderModal(true)
                      }}
                      disabled={isUnlockingPPV}
                      className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
                    >
                      {isUnlockingPPV ? "Processing..." : "Unlock Content"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <LockedContentOverlay
                tierName={post.tierName || "Premium"}
                onUnlock={onUnlock}
              />
            )
          ) : (
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
            </div>
          )}
        </div>

        {/* Date, Likes, and Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <p className="text-xs text-gray-500">
              {new Date(post.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            {!post.isLocked && !(post.isPPV && !hasPurchasedPPV) && !isLoadingLikes && (
              <LikeButton
                postId={post.id}
                initialLikeCount={likeCount}
                initialIsLiked={isLiked}
                onLikeChange={(liked, count) => {
                  setIsLiked(liked)
                  setLikeCount(count)
                }}
              />
            )}
          </div>
          {!post.isLocked && (post.isPPV ? hasPurchasedPPV : true) && (
            <button
              onClick={() => setShowCommentsSection(!showCommentsSection)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showCommentsSection ? "Hide" : "Show"} Comments
            </button>
          )}
        </div>
      </div>

      {/* Comments Section */}
      {showCommentsSection && !post.isLocked && (post.isPPV ? hasPurchasedPPV : true) && post.creator && (
        <div className="px-6 pb-6">
          <CommentsSection
            postId={post.id}
            creatorId={post.creator.id}
            canComment={!post.isLocked && (post.isPPV ? hasPurchasedPPV : true)}
            refreshInterval={5000}
          />
        </div>
      )}

      {/* PPV Provider Selection Modal */}
      {showProviderModal && post.isPPV && post.ppvPrice && (
        <ProviderSelectModal
          creatorId={post.creator?.id || ""}
          tierId="ppv"
          tierName="PPV Post"
          tierPrice={post.ppvPrice / 100}
          recommendedProvider="paystack"
          country={userCountry}
          onSelect={async (provider) => {
            setIsUnlockingPPV(true)
            setShowProviderModal(false)
            try {
              const res = await fetch("/api/ppv/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  postId: post.id,
                  provider: provider === "mpesa_paystack" ? "MPESA_PAYSTACK" : "PAYSTACK",
                  country: userCountry,
                }),
              })

              const data = await res.json()

              if (!res.ok) {
                alert(data.error || "Purchase failed")
                setIsUnlockingPPV(false)
                return
              }

              if (data.payment_url) {
                window.location.href = data.payment_url
              } else if (data.unlocked) {
                setHasPurchasedPPV(true)
                setIsUnlockingPPV(false)
                // Refresh page to show unlocked content
                window.location.reload()
              }
            } catch (err) {
              console.error("PPV purchase error:", err)
              alert("An error occurred. Please try again.")
              setIsUnlockingPPV(false)
            }
          }}
          onClose={() => setShowProviderModal(false)}
        />
      )}
    </div>
  )
}

