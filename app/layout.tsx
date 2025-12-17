import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { Navbar } from "@/components/Navbar"
import { PublicNav } from "@/components/PublicNav"
import { Footer } from "@/components/Footer"
import ContentProtection from "@/components/ContentProtection"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Africa Patreon - Support African Creators",
  description: "The platform for African creators to monetize their content",
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
