"use client"

import { useState, useEffect } from "react"
import { getCurrencySymbol } from "@/lib/payments/currency"

export type PaymentProviderOption =
  | "stripe"
  | "paystack"
  | "flutterwave"
  | "mpesa_flutterwave"
  | "mpesa_paystack"

interface ProviderSelectModalProps {
  creatorId: string
  tierId?: string
  tierName: string
  tierPrice: number
  recommendedProvider?: PaymentProviderOption
  country?: string
  onSelect: (provider: PaymentProviderOption) => void
  onClose: () => void
}

interface ProviderPriceInfo {
  provider: PaymentProviderOption
  currency: string
  price: number
  priceUSD: number
}

export default function ProviderSelectModal({
  creatorId,
  tierId,
  tierName,
  tierPrice,
  recommendedProvider,
  country,
  onSelect,
  onClose,
}: ProviderSelectModalProps) {
  const [selectedProvider, setSelectedProvider] =
    useState<PaymentProviderOption | null>(recommendedProvider || null)
  const [providerPrices, setProviderPrices] = useState<Record<string, ProviderPriceInfo>>({})
  const [isLoadingPrices, setIsLoadingPrices] = useState(false)

  // Fetch prices for all providers
  useEffect(() => {
    const fetchPrices = async () => {
      setIsLoadingPrices(true)
      const prices: Record<string, ProviderPriceInfo> = {}
      
      const providers: PaymentProviderOption[] = [
        "stripe",
        "paystack",
        "flutterwave",
        "mpesa_flutterwave",
        "mpesa_paystack",
      ]

      try {
        await Promise.all(
          providers.map(async (provider) => {
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

              const res = await fetch(
                `/api/payments/price-info?tierId=${tierId || ""}&priceUSD=${tierPrice}&country=${country || "US"}&provider=${apiProvider}`
              )
              if (res.ok) {
                const data = await res.json()
                prices[provider] = {
                  provider,
                  currency: data.currency,
                  price: data.price,
                  priceUSD: data.priceUSD,
                }
              }
            } catch (err) {
              console.error(`Failed to fetch price for ${provider}:`, err)
            }
          })
        )
        setProviderPrices(prices)
      } catch (err) {
        console.error("Failed to fetch provider prices:", err)
      } finally {
        setIsLoadingPrices(false)
      }
    }

    fetchPrices()
  }, [tierId, tierPrice, country])

  const providers: Array<{
    id: PaymentProviderOption
    name: string
    description: string
    icon: string
    available: boolean
  }> = [
    {
      id: "stripe",
      name: "Stripe",
      description: "Credit & Debit Cards (Global)",
      icon: "💳",
      available: true,
    },
    {
      id: "paystack",
      name: "Paystack",
      description: "Nigeria, Ghana, Kenya",
      icon: "🇳🇬",
      available: true,
    },
    {
      id: "flutterwave",
      name: "Flutterwave",
      description: "Pan-Africa Payment Gateway",
      icon: "🌍",
      available: true,
    },
    {
      id: "mpesa_flutterwave",
      name: "M-Pesa (Flutterwave)",
      description: "Mobile Money via Flutterwave",
      icon: "📱",
      available: true,
    },
    {
      id: "mpesa_paystack",
      name: "M-Pesa (Paystack)",
      description: "Mobile Money via Paystack",
      icon: "📱",
      available: true,
    },
  ]

  const handleConfirm = () => {
    if (selectedProvider) {
      onSelect(selectedProvider)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Select Payment Method
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Subscription Info */}
        <div className="border-b border-gray-200 px-6 py-4">
          <p className="text-sm text-gray-600">Subscribing to:</p>
          <p className="text-lg font-semibold text-gray-900">{tierName}</p>
          {isLoadingPrices ? (
            <p className="text-sm text-gray-600">Loading prices...</p>
          ) : (
            <p className="text-sm text-gray-600">
              ${tierPrice}/month (USD)
            </p>
          )}
        </div>

        {/* Provider Options */}
        <div className="px-6 py-4">
          <p className="mb-4 text-sm font-medium text-gray-700">
            Choose your preferred payment method:
          </p>
          <div className="space-y-2">
            {providers.map((provider) => {
              const isRecommended = recommendedProvider === provider.id
              const isSelected = selectedProvider === provider.id
              const priceInfo = providerPrices[provider.id]

              // Get currency symbol and format price
              const getPriceDisplay = () => {
                if (isLoadingPrices) {
                  return <span className="text-xs text-gray-500">Loading...</span>
                }
                
                if (priceInfo) {
                  const currencySymbol = getCurrencySymbol(priceInfo.currency as any)
                  const formattedPrice = new Intl.NumberFormat("en-US", {
                    minimumFractionDigits: priceInfo.currency === "KES" || priceInfo.currency === "NGN" ? 0 : 2,
                    maximumFractionDigits: priceInfo.currency === "KES" || priceInfo.currency === "NGN" ? 0 : 2,
                  }).format(priceInfo.price)
                  
                  return (
                    <div className="flex flex-col items-end">
                      <span className="font-semibold text-gray-900">
                        {currencySymbol}{formattedPrice}
                      </span>
                      {priceInfo.priceUSD !== priceInfo.price && (
                        <span className="text-xs text-gray-500">
                          ≈ ${priceInfo.priceUSD.toFixed(2)}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 mt-1">
                        {priceInfo.currency}
                      </span>
                    </div>
                  )
                }
                
                return <span className="text-xs text-gray-500">${tierPrice}</span>
              }

              return (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.id)}
                  disabled={!provider.available}
                  className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  } ${!provider.available ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{provider.icon}</span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-gray-900">
                            {provider.name}
                          </p>
                          {isRecommended && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {provider.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getPriceDisplay()}
                      {isSelected && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                          <svg
                            className="h-3 w-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedProvider}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

