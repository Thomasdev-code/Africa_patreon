import Image from "next/image"

interface AvatarProps {
  src?: string | null
  alt: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const sizeClasses = {
  sm: "w-12 h-12",
  md: "w-16 h-16",
  lg: "w-24 h-24",
  xl: "w-32 h-32",
}

export default function Avatar({ src, alt, size = "md", className = "" }: AvatarProps) {
  const sizeClass = sizeClasses[size]

  if (!src) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-gray-300 flex items-center justify-center ${className}`}
      >
        <span className="text-gray-600 font-semibold">
          {alt.charAt(0).toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    <div className={`${sizeClass} rounded-full overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={size === "sm" ? 48 : size === "md" ? 64 : size === "lg" ? 96 : 128}
        height={size === "sm" ? 48 : size === "md" ? 64 : size === "lg" ? 96 : 128}
        className="object-cover w-full h-full"
      />
    </div>
  )
}

