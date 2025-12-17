import type { MembershipTier } from "@/lib/types"

interface TierCardProps {
  tier: MembershipTier
  onSubscribe?: () => void
  showSubscribe?: boolean
  isCreator?: boolean
}

export default function TierCard({
  tier,
  onSubscribe,
  showSubscribe = false,
  isCreator = false,
}: TierCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
        <div className="text-right">
          <span className="text-2xl font-bold text-green-600">
            ${tier.price}
          </span>
          <span className="text-gray-600 text-sm">/month</span>
        </div>
      </div>
      {showSubscribe && !isCreator && (
        <button
          onClick={onSubscribe}
          className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Subscribe
        </button>
      )}
    </div>
  )
}

