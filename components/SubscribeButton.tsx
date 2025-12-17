"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import type { MembershipTier } from "@/lib/types"
import ProviderSelectModal, {
  type PaymentProviderOption,
} from "@/components/payments/ProviderSelectModal"
import { getCurrencySymbol } from "@/lib/payments/currency"

interface SubscribeButtonProps {
  creatorId: string
  creatorUsername: string
  tier: MembershipTier
  isSubscribed?: boolean
  subscriptionId?: string
  onSubscribe?: () => void
  country?: string
}

interface PriceInfo {
  localPrice: number
  localCurrency: string
  priceUSD: number
  provider: string
}

export default function SubscribeButton({
  creatorId,
  creatorUsername,
  tier,
  isSubscribed = false,
  subscriptionId,
  onSubscribe,
  country,
}: SubscribeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showProviderModal, setShowProviderModal] = useState(false)
  const [priceInfo, setPriceInfo] = useState<PriceInfo | null>(null)
  const [isLoadingPrice, setIsLoadingPrice] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()

  // Fetch price info when component mounts or country changes
  useEffect(() => {
    if (isSubscribed) return
    
    const fetchPriceInfo = async () => {
      setIsLoadingPrice(true)
      try {
        // Call a new endpoint to get price info without creating payment
        const res = await fetch(`/api/payments/price-info?tierId=${tier.id}&priceUSD=${tier.price}&country=${country || "US"}`)
        if (res.ok) {
          const data = await res.json()
          setPriceInfo(data)
        }
      } catch (err) {
        console.error("Failed to fetch price info:", err)
      } finally {
        setIsLoadingPrice(false)
      }
    }

    fetchPriceInfo()
  }, [tier.id, tier.price, country, isSubscribed])

  // Determine recommended provider based on country
  const getRecommendedProvider = (): PaymentProviderOption => {
    if (!country) return "stripe"
    const countryCode = country.toUpperCase()
    
    // Kenya → Flutterwave (M-Pesa support)
    if (countryCode === "KE") return "flutterwave"
    // Nigeria → Paystack
    if (countryCode === "NG") return "paystack"
    // Ghana → Paystack
    if (countryCode === "GH") return "paystack"
    // Tanzania → Flutterwave (M-Pesa support)
    if (countryCode === "TZ") return "flutterwave"
    // Default → Stripe
    return "stripe"
  }

  const handleSubscribe = async (provider: PaymentProviderOption) => {
    if (!session) {
      router.push(`/login?callbackUrl=/creator/${creatorUsername}`)
      return
    }

    if (session.user.role === "creator") {
      alert("Creators cannot subscribe to other creators")
      return
    }

    setIsLoading(true)
    setError("")
    setShowProviderModal(false)

    try {
      // Convert provider option to API format
      let apiProvider: string
      if (provider === "mpesa_flutterwave") {
        apiProvider = "MPESA_FLW"
      } else if (provider === "mpesa_paystack") {
        apiProvider = "MPESA_PAYSTACK"
      } else {
        apiProvider = provider.toUpperCase()
      }

      // Use new unified payment API with required provider
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId,
          tierName: tier.name,
          tierId: tier.id,
          provider: apiProvider,
          country: country || "US",
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Subscription failed")
        setIsLoading(false)
        return
      }

      // Update price info from response
      if (data.price && data.currency) {
        setPriceInfo({
          localPrice: data.price,
          localCurrency: data.currency,
          priceUSD: data.priceUSD || tier.price,
          provider: data.provider,
        })
      }

      // Check for payment_url (new format) or redirectUrl (legacy)
      const paymentUrl = data.payment_url || data.redirectUrl

      if (paymentUrl) {
        // Redirect to payment provider
        window.location.href = paymentUrl
      } else {
        setError("Payment URL not received")
        setIsLoading(false)
      }
    } catch (err) {
      console.error("Subscribe error:", err)
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  const handleSubscribeClick = () => {
    if (!session) {
      router.push(`/login?callbackUrl=/creator/${creatorUsername}`)
      return
    }

    if (session.user.role === "creator") {
      alert("Creators cannot subscribe to other creators")
      return
    }

    // Show provider selection modal
    setShowProviderModal(true)
  }

  if (isSubscribed) {
    return (
      <div className="w-full">
        <button
          disabled
          className="w-full bg-green-600 text-white py-2 px-4 rounded-lg cursor-not-allowed font-medium"
        >
          ✓ Subscribed
        </button>
        <p className="text-sm text-gray-600 mt-1 text-center">
          You have an active subscription
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="w-full">
        {error && (
          <div className="mb-2 text-sm text-red-600 text-center">{error}</div>
        )}
        <button
          onClick={handleSubscribeClick}
          disabled={isLoading || isLoadingPrice}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            "Processing..."
          ) : isLoadingPrice ? (
            "Loading..."
          ) : priceInfo ? (
            <div className="flex flex-col items-center">
              <span className="text-lg font-semibold">
                Subscribe – {getCurrencySymbol(priceInfo.localCurrency as any)}
                {new Intl.NumberFormat("en-US", {
                  minimumFractionDigits: priceInfo.localCurrency === "KES" || priceInfo.localCurrency === "NGN" ? 0 : 2,
                  maximumFractionDigits: priceInfo.localCurrency === "KES" || priceInfo.localCurrency === "NGN" ? 0 : 2,
                }).format(priceInfo.localPrice)} / month
              </span>
              {priceInfo.priceUSD !== priceInfo.localPrice && (
                <span className="text-xs text-white/80">
                  (Approx ${priceInfo.priceUSD.toFixed(2)})
                </span>
              )}
            </div>
          ) : (
            `Subscribe – $${tier.price}/month`
          )}
        </button>
        {priceInfo && !isLoading && (
          <p className="text-xs text-gray-500 text-center mt-1">
            via {priceInfo.provider.replace(/_/g, " ")}
          </p>
        )}
      </div>

      {showProviderModal && (
        <ProviderSelectModal
          creatorId={creatorId}
          tierId={tier.id}
          tierName={tier.name}
          tierPrice={tier.price}
          recommendedProvider={getRecommendedProvider()}
          country={country}
          onSelect={handleSubscribe}
          onClose={() => setShowProviderModal(false)}
        />
      )}
    </>
  )
}

