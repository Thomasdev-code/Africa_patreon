import Image from "next/image"

interface BannerProps {
  src?: string | null
  alt: string
  className?: string
}

export default function Banner({ src, alt, className = "" }: BannerProps) {
  if (!src) {
    return (
      <div
        className={`w-full h-64 bg-gradient-to-r from-blue-500 to-purple-600 ${className}`}
      >
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-white text-xl font-semibold">{alt}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full h-64 relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        priority
      />
    </div>
  )
}

