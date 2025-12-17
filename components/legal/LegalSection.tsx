import type { ReactNode } from "react"

interface LegalSectionProps {
  id: string
  heading: string
  children: ReactNode
  level?: 2 | 3 | 4
}

export function LegalSection({
  id,
  heading,
  children,
  level = 2,
}: LegalSectionProps) {
  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements

  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="mb-8">
      <HeadingTag
        id={`${id}-heading`}
        className="text-2xl font-semibold text-gray-900 mb-4 scroll-mt-24"
      >
        {heading}
      </HeadingTag>
      <div className="prose prose-gray max-w-none">{children}</div>
    </section>
  )
}

