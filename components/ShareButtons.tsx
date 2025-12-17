"use client"

interface ShareButtonsProps {
  referralLink: string
  referralCode: string
}

export default function ShareButtons({
  referralLink,
  referralCode,
}: ShareButtonsProps) {
  const shareText = `Join me on Africa Patreon! Use my referral code: ${referralCode} - ${referralLink}`

  const shareToWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`
    window.open(url, "_blank")
  }

  const shareToTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`
    window.open(url, "_blank")
  }

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
    window.open(url, "_blank")
  }

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`
    window.open(url, "_blank")
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Share on Social Media
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={shareToWhatsApp}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <span>📱</span> WhatsApp
        </button>
        <button
          onClick={shareToTelegram}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <span>✈️</span> Telegram
        </button>
        <button
          onClick={shareToTwitter}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <span>🐦</span> X (Twitter)
        </button>
        <button
          onClick={shareToFacebook}
          className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2"
        >
          <span>👤</span> Facebook
        </button>
      </div>
    </div>
  )
}

