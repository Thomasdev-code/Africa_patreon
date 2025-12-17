/**
 * JSON-LD Schema Components
 * Structured data for SEO
 */

interface JsonLdProps {
  data: Record<string, any>
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

/**
 * Organization Schema
 */
export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Africa Patreon",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://africapatreon.com",
    logo: `${process.env.NEXT_PUBLIC_APP_URL || "https://africapatreon.com"}/logo.png`,
    description:
      "A subscription platform that helps African creators earn recurring income from fans worldwide.",
    sameAs: [
      // Add your social media URLs here
      // "https://twitter.com/AfricaPatreon",
      // "https://facebook.com/AfricaPatreon",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      email: "support@africapatreon.com", // Update with your email
    },
  }

  return <JsonLd data={schema} />
}

/**
 * Website Schema
 */
export function WebsiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Africa Patreon",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://africapatreon.com",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL || "https://africapatreon.com"}/discover?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }

  return <JsonLd data={schema} />
}

/**
 * Creator Profile Schema
 */
export function CreatorProfileSchema({
  name,
  username,
  bio,
  avatarUrl,
  url,
}: {
  name: string
  username: string
  bio: string
  avatarUrl?: string
  url: string
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    identifier: username,
    description: bio,
    image: avatarUrl,
    url,
    sameAs: [], // Add creator's social links if available
  }

  return <JsonLd data={schema} />
}

/**
 * Breadcrumbs Schema
 */
export function BreadcrumbsSchema({
  items,
}: {
  items: Array<{ name: string; url: string }>
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return <JsonLd data={schema} />
}

