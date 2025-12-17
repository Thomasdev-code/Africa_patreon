"use client"

interface ReferralShareButtonsProps {
  link: string
  title?: string
}

export default function ReferralShareButtons({
  link,
  title = "Join Africa Patreon and support amazing creators!",
}: ReferralShareButtonsProps) {
  const shareText = `${title} ${link}`

  const shareToWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`
    window.open(url, "_blank")
  }

  const shareToTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(title)}`
    window.open(url, "_blank")
  }

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
    window.open(url, "_blank")
  }

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`
    window.open(url, "_blank")
  }

  const copyLink = () => {
    navigator.clipboard.writeText(link)
    alert("Link copied to clipboard!")
  }

  return (
    <div className="mt-4">
      <p className="text-sm mb-3 text-blue-100">Share on:</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={shareToWhatsApp}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <span>📱</span> WhatsApp
        </button>
        <button
          onClick={shareToTelegram}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <span>✈️</span> Telegram
        </button>
        <button
          onClick={shareToTwitter}
          className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <span>🐦</span> X (Twitter)
        </button>
        <button
          onClick={shareToFacebook}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <span>👤</span> Facebook
        </button>
        <button
          onClick={copyLink}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
        >
          📋 Copy Link
        </button>
      </div>
    </div>
  )
}

