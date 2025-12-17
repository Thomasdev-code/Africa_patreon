import type { ReactNode } from "react"
import Link from "next/link"

interface PageHeaderProps {
  title: string
  subtitle?: string
  eyebrow?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, eyebrow, actions }: PageHeaderProps) {
  return (
    <header className="border-b border-gray-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          {eyebrow && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 max-w-2xl text-sm text-gray-600 sm:text-base">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </header>
  )
}


