"use client"

import Link from "next/link"
import { useState } from "react"
import SearchBar from "@/components/SearchBar"

export function Navbar() {
  const [legalOpen, setLegalOpen] = useState(false)

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold text-gray-900 hover:text-gray-700">
          Africa Patreon
        </Link>
        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <SearchBar />
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/discover"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Discover
          </Link>
          <Link
            href="/trust-center"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Trust Center
          </Link>
          <div className="relative">
            <button
              onClick={() => setLegalOpen(!legalOpen)}
              className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1"
            >
              Legal
              <svg
                className={`w-4 h-4 transition-transform ${legalOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {legalOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                <div className="py-1">
                  <Link
                    href="/legal/terms"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setLegalOpen(false)}
                  >
                    Terms of Service
                  </Link>
                  <Link
                    href="/legal/privacy"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setLegalOpen(false)}
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    href="/legal/refund-policy"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setLegalOpen(false)}
                  >
                    Refund Policy
                  </Link>
                  <Link
                    href="/legal/anti-scam"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setLegalOpen(false)}
                  >
                    Anti-Scam Rules
                  </Link>
                  <Link
                    href="/legal/community-guidelines"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setLegalOpen(false)}
                  >
                    Community Guidelines
                  </Link>
                  <Link
                    href="/legal/impressum"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setLegalOpen(false)}
                  >
                    Impressum
                  </Link>
                </div>
              </div>
            )}
          </div>
          <Link
            href="/login"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </nav>
  )
}

