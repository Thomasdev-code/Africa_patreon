"use client"

import { motion } from "framer-motion"
import Link from "next/link"

interface CreatorCardProps {
  name: string
  username: string
  category: string
  avatarUrl?: string
  subscribers?: number
  delay?: number
}

export default function CreatorCard({
  name,
  username,
  category,
  avatarUrl,
  subscribers = 0,
  delay = 0,
}: CreatorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className="group"
    >
      <Link
        href={`/creator/${username}`}
        className="block bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
      >
        <div className="flex items-center space-x-4 mb-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-[#0d3b2e] to-[#f4c430] flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-white">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 group-hover:text-[#0d3b2e] transition-colors">
              {name}
            </h3>
            <p className="text-sm text-gray-500">@{username}</p>
          </div>
        </div>

        <div className="mb-4">
          <span className="inline-block px-3 py-1 bg-[#0d3b2e]/10 text-[#0d3b2e] text-xs font-medium rounded-full">
            {category}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span className="font-light">
            {subscribers.toLocaleString()} supporters
          </span>
          <span className="text-[#f4c430] font-semibold group-hover:underline">
            View Profile →
          </span>
        </div>
      </Link>
    </motion.div>
  )
}

