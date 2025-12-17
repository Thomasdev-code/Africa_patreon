import type { ReactNode } from "react"

interface PageContentProps {
  children: ReactNode
}

export function PageContent({ children }: PageContentProps) {
  return (
    <main className="bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <article className="prose prose-gray max-w-none prose-headings:scroll-mt-24 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-li:marker:text-gray-400 dark:prose-invert">
          {children}
        </article>
      </div>
    </main>
  )
}


