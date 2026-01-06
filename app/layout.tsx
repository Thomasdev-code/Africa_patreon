import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { Navbar } from "@/components/Navbar"
import { PublicNav } from "@/components/PublicNav"
import Footer from "@/components/Footer"
import ContentProtection from "@/components/ContentProtection"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Africa Patreon – Empower African creators to earn from their fans",
  description: "Join Africa Patreon and turn your talent into income. Share your page, grow your audience, and get rewarded for every subscription. Secure payouts, instant updates, multiple payment options.",
  openGraph: {
    title: "Africa Patreon – Empower African creators to earn from their fans",
    description: "Join Africa Patreon and turn your talent into income. Share your page, grow your audience, and get rewarded for every subscription.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Africa Patreon – Empower African creators to earn from their fans",
    description: "Join Africa Patreon and turn your talent into income. Share your page, grow your audience, and get rewarded for every subscription.",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <ContentProtection />
          {children}
        </Providers>
      </body>
    </html>
  )
}
