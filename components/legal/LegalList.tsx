import type { ReactNode } from "react"

interface LegalListProps {
  items: ReactNode[]
  ordered?: boolean
  className?: string
}

export function LegalList({ items, ordered = false, className = "" }: LegalListProps) {
  const ListTag = ordered ? "ol" : "ul"

  return (
    <ListTag className={`list-disc pl-6 space-y-2 ${className}`}>
      {items.map((item, index) => (
        <li key={index} className="text-gray-700">
          {item}
        </li>
      ))}
    </ListTag>
  )
}

