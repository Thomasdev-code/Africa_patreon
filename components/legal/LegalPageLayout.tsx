import type { ReactNode } from "react"
import { PageHeader } from "@/components/PageHeader"
import { PageContent } from "@/components/PageContent"

interface LegalPageLayoutProps {
  title: string
  subtitle?: string
  eyebrow?: string
  children: ReactNode
}

export function LegalPageLayout({
  title,
  subtitle,
  eyebrow = "Legal",
  children,
}: LegalPageLayoutProps) {
  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
      />
      <PageContent>{children}</PageContent>
    </>
  )
}

