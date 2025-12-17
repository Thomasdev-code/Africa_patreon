"use client"

import type { PostUnlockStats } from "@/lib/types"

interface TopPostsListProps {
  posts: PostUnlockStats[]
}

export default function TopPostsList({ posts }: TopPostsListProps) {
  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top Unlocked Posts
        </h3>
        <p className="text-gray-600 text-center py-8">No unlock data yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Top Unlocked Posts
      </h3>
      <div className="space-y-3">
        {posts.map((post, index) => (
          <div
            key={post.postId}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">
                  {post.postTitle}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  {post.tierName && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      {post.tierName}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                {post.unlockCount}
              </div>
              <div className="text-xs text-gray-500">unlocks</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

