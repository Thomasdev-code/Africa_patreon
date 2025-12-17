import { NextRequest, NextResponse } from "next/server"
import { prisma, executeWithReconnect } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q")?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json({
        creators: [],
        posts: [],
        polls: [],
        audio: [],
      })
    }

    const searchTerm = `%${query}%`

    // Search creators (username, name from user, bio, tags)
    const creators = await executeWithReconnect(() =>
      prisma.creatorProfile.findMany({
        where: {
          OR: [
            { username: { contains: query, mode: "insensitive" } },
            { bio: { contains: query, mode: "insensitive" } },
            { tags: { hasSome: [query] } },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        take: 10,
      })
    )

    // Search posts (title, content)
    const posts = await executeWithReconnect(() =>
      prisma.post.findMany({
        where: {
          isPublished: true,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
          ],
        },
        include: {
          creator: {
            include: {
              creatorProfile: {
                select: {
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
      })
    )

    // Search polls (question)
    const polls = await executeWithReconnect(() =>
      prisma.poll.findMany({
        where: {
          isPublished: true,
          question: { contains: query, mode: "insensitive" },
        },
        include: {
          creator: {
            include: {
              creatorProfile: {
                select: {
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
      })
    )

    // Search audio (posts with mediaType="audio" and title/content match)
    const audio = await executeWithReconnect(() =>
      prisma.post.findMany({
        where: {
          isPublished: true,
          mediaType: "audio",
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
          ],
        },
        include: {
          creator: {
            include: {
              creatorProfile: {
                select: {
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
      })
    )

    // Format results
    const formattedCreators = creators.map((creator) => ({
      id: creator.id,
      type: "creator",
      username: creator.username,
      bio: creator.bio,
      avatarUrl: creator.avatarUrl,
      userId: creator.userId,
    }))

    const formattedPosts = posts.map((post) => ({
      id: post.id,
      type: "post",
      title: post.title,
      content: post.content.substring(0, 200),
      mediaUrl: post.mediaUrl,
      mediaType: post.mediaType,
      creatorUsername: post.creator.creatorProfile?.username,
      creatorAvatarUrl: post.creator.creatorProfile?.avatarUrl,
      createdAt: post.createdAt,
    }))

    const formattedPolls = polls.map((poll) => ({
      id: poll.id,
      type: "poll",
      question: poll.question,
      creatorUsername: poll.creator.creatorProfile?.username,
      creatorAvatarUrl: poll.creator.creatorProfile?.avatarUrl,
      createdAt: poll.createdAt,
    }))

    const formattedAudio = audio.map((audioPost) => ({
      id: audioPost.id,
      type: "audio",
      title: audioPost.title,
      content: audioPost.content.substring(0, 200),
      mediaUrl: audioPost.mediaUrl,
      creatorUsername: audioPost.creator.creatorProfile?.username,
      creatorAvatarUrl: audioPost.creator.creatorProfile?.avatarUrl,
      createdAt: audioPost.createdAt,
    }))

    return NextResponse.json({
      creators: formattedCreators,
      posts: formattedPosts,
      polls: formattedPolls,
      audio: formattedAudio,
      query,
    })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

