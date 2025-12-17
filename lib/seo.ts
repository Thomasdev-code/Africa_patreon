/**
 * Global SEO Configuration
 * Centralized SEO settings for Africa Patreon
 */

export const seoConfig = {
  // Default metadata
  defaultTitle: "Africa Patreon - Support African Creators",
  defaultDescription:
    "Africa Patreon is a subscription platform that helps African creators earn recurring income from fans worldwide. Support creators with Stripe, Paystack, Flutterwave, and M-Pesa.",
  defaultImage: "/og-image.png", // You should add this image
  defaultKeywords: [
    "Africa Patreon",
    "African creators",
    "creator economy",
    "subscription platform",
    "support creators",
    "M-Pesa payments",
    "Paystack",
    "Flutterwave",
    "Stripe Africa",
    "creator monetization",
    "membership platform",
    "African content creators",
  ],
  domain: process.env.NEXT_PUBLIC_APP_URL || "https://africapatreon.com",
  siteName: "Africa Patreon",
  twitterHandle: "@AfricaPatreon", // Update with your actual handle
  locale: "en_US",
  type: "website",
} as const

/**
 * Generate Open Graph metadata
 */
export function generateOpenGraph({
  title,
  description,
  image,
  url,
  type = "website",
}: {
  title: string
  description: string
  image?: string
  url?: string
  type?: "website" | "article" | "profile"
}) {
  const imageUrl = image
    ? image.startsWith("http")
      ? image
      : `${seoConfig.domain}${image}`
    : `${seoConfig.domain}${seoConfig.defaultImage}`

  return {
    title,
    description,
    url: url || seoConfig.domain,
    siteName: seoConfig.siteName,
    images: [
      {
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: title,
      },
    ],
    locale: seoConfig.locale,
    type,
  }
}

/**
 * Generate Twitter Card metadata
 */
export function generateTwitterCard({
  title,
  description,
  image,
}: {
  title: string
  description: string
  image?: string
}) {
  const imageUrl = image
    ? image.startsWith("http")
      ? image
      : `${seoConfig.domain}${image}`
    : `${seoConfig.domain}${seoConfig.defaultImage}`

  return {
    card: "summary_large_image",
    title,
    description,
    images: [imageUrl],
    creator: seoConfig.twitterHandle,
  }
}

/**
 * Generate full metadata object
 */
export function generateMetadata({
  title,
  description,
  keywords,
  image,
  url,
  type = "website",
  noindex = false,
  nofollow = false,
}: {
  title?: string
  description?: string
  keywords?: string[]
  image?: string
  url?: string
  type?: "website" | "article" | "profile"
  noindex?: boolean
  nofollow?: boolean
}) {
  const fullTitle = title
    ? `${title} | ${seoConfig.siteName}`
    : seoConfig.defaultTitle
  const fullDescription = description || seoConfig.defaultDescription
  const fullKeywords = keywords
    ? [...seoConfig.defaultKeywords, ...keywords]
    : seoConfig.defaultKeywords

  return {
    title: fullTitle,
    description: fullDescription,
    keywords: fullKeywords.join(", "),
    openGraph: generateOpenGraph({
      title: fullTitle,
      description: fullDescription,
      image,
      url,
      type,
    }),
    twitter: generateTwitterCard({
      title: fullTitle,
      description: fullDescription,
      image,
    }),
    robots: {
      index: !noindex,
      follow: !nofollow,
      googleBot: {
        index: !noindex,
        follow: !nofollow,
      },
    },
    alternates: {
      canonical: url || seoConfig.domain,
    },
  }
}

