import Link from "next/link"

export function PublicNav() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold text-gray-900 hover:text-gray-700">
          Africa Patreon
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/discover"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Discover
          </Link>
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

