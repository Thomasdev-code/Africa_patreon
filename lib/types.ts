export type UserRole = "fan" | "creator" | "admin"

export interface User {
  id: string
  email: string
  role: UserRole
  isOnboarded: boolean
}

export interface SessionUser {
  id: string
  role: UserRole
  isOnboarded: boolean
}

export interface MembershipTier {
  name: string
  price: number
}

export interface CreatorProfile {
  id: string
  userId: string
  username: string
  bio: string
  avatarUrl: string | null
  bannerUrl: string | null
  tiers: MembershipTier[]
  createdAt: Date
  updatedAt: Date
}

export interface CreateCreatorProfileInput {
  username: string
  bio: string
  avatarUrl?: string
  bannerUrl?: string
  tiers: MembershipTier[]
}

export interface UpdateCreatorProfileInput {
  username?: string
  bio?: string
  avatarUrl?: string
  bannerUrl?: string
  tiers?: MembershipTier[]
}

export type SubscriptionStatus = "active" | "cancelled" | "pending"

export type PaymentProvider = "flutterwave" | "paystack" | "stripe"

export interface Subscription {
  id: string
  fanId: string
  creatorId: string
  tierName: string
  tierPrice: number
  status: SubscriptionStatus
  paymentProvider: PaymentProvider | null
  paymentReference: string | null
  startDate: Date
  endDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateSubscriptionInput {
  creatorId: string
  tierName: string
  tierPrice: number
}

export interface SubscriptionWithCreator {
  id: string
  tierName: string
  tierPrice: number
  status: SubscriptionStatus
  startDate: Date
  creator: {
    id: string
    username: string
    avatarUrl: string | null
  }
}

export interface SubscriberInfo {
  id: string
  fanId: string
  tierName: string
  tierPrice: number
  status: SubscriptionStatus
  startDate: Date
  fan: {
    id: string
    email: string
  }
}

export type MediaType = "image" | "video" | "audio" | null

export interface Post {
  id: string
  creatorId: string
  title: string
  content: string
  mediaType: MediaType
  mediaUrl: string | null
  tierName: string | null
  isPublished: boolean
  isPPV?: boolean
  ppvPrice?: number | null
  ppvCurrency?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface PostWithCreator extends Post {
  creator: {
    id: string
    username: string
    avatarUrl: string | null
  }
}

export interface CreatePostInput {
  title: string
  content: string
  mediaType?: MediaType
  mediaUrl?: string
  tierName?: string | null
  isPublished?: boolean
  isPPV?: boolean
  ppvPrice?: number | null
  ppvCurrency?: string | null
}

export interface UpdatePostInput {
  title?: string
  content?: string
  mediaType?: MediaType
  mediaUrl?: string
  tierName?: string | null
  isPublished?: boolean
  isPPV?: boolean
  ppvPrice?: number | null
  ppvCurrency?: string | null
}

export interface PostPreview {
  id: string
  title: string
  content: string
  mediaType: MediaType
  mediaUrl: string | null
  tierName: string | null
  isLocked: boolean
  isPublished: boolean
  isPPV?: boolean
  ppvPrice?: number | null
  ppvCurrency?: string | null
  hasPurchasedPPV?: boolean
  createdAt: Date
  creator?: {
    id: string
    username: string
    avatarUrl: string | null
  }
}

// Legacy notification type (kept for backward compatibility)
export interface LegacyNotification {
  id: string
  fanId: string
  postId: string
  message: string
  isRead: boolean
  createdAt: Date
  post?: {
    id: string
    title: string
    creatorId: string
  }
}

// Analytics Types
export interface SubscriberDataPoint {
  date: string
  count: number
  tierName?: string
}

export interface SubscriberAnalytics {
  total: number
  byTier: Record<string, number>
  growth: SubscriberDataPoint[]
  period: "daily" | "weekly" | "monthly"
}

export interface RevenueDataPoint {
  date: string
  revenue: number
  tierName?: string
}

export interface RevenueAnalytics {
  totalMonthly: number
  totalAllTime: number
  byTier: Record<string, { count: number; monthlyRevenue: number }>
  growth: RevenueDataPoint[]
  period: "daily" | "weekly" | "monthly"
  changeFromLastPeriod?: number
}

export interface PostUnlockStats {
  postId: string
  postTitle: string
  unlockCount: number
  tierName: string | null
  createdAt: Date
}

export interface UnlocksAnalytics {
  totalUnlocks: number
  topPosts: PostUnlockStats[]
  unlocksByTier: Record<string, number>
}

// Comments Types
export interface Comment {
  id: string
  postId: string
  userId: string
  replyToId: string | null
  content: string
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    email: string
    role: UserRole
    creatorProfile?: {
      username: string
      avatarUrl: string | null
    }
  }
  replies?: Comment[]
}

export interface CreateCommentInput {
  postId: string
  content: string
  replyToId?: string | null
}

// Messages Types
export type MessageType = "text" | "image" | "audio"

export interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string | null
  mediaUrl: string | null
  mediaType: string | null
  read: boolean
  createdAt: Date
  sender: {
    id: string
    email: string
    role: UserRole
    creatorProfile?: {
      username: string
      avatarUrl: string | null
    }
  }
  receiver: {
    id: string
    email: string
    role: UserRole
    creatorProfile?: {
      username: string
      avatarUrl: string | null
    }
  }
}

export interface CreateMessageInput {
  receiverId: string
  content?: string
  mediaUrl?: string
  mediaType?: string
}

export interface Conversation {
  userId: string
  username: string
  avatarUrl: string | null
  lastMessage: Message | null
  unreadCount: number
}

// Updated Notification Types
export type NotificationType =
  | "comment"
  | "reply"
  | "message"
  | "subscription"
  | "post"
  | "poll"
  | "poll_vote"
  | "chargeback"

export interface NotificationData {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  link: string | null
  isRead: boolean
  createdAt: Date
}

// Referral Types
export interface Referral {
  id: string
  referrerId: string
  referredUserId: string | null
  referralCode: string
  referralLink: string
  type: "click" | "signup" | "subscription"
  subscriptionId: string | null
  subscriptionValue: number | null
  creditsEarned: number
  status: "clicked" | "signed_up" | "converted" | "credited"
  clickedAt: Date
  convertedAt: Date | null
  createdAt: Date
}

export interface ReferralCredit {
  id: string
  userId: string
  referralId: string | null
  amount: number
  type: "signup" | "subscription" | "bonus" | "withdrawal" | "conversion"
  status: "pending" | "available" | "withdrawn" | "converted"
  description: string
  withdrawalId: string | null
  convertedTo: string | null
  createdAt: Date
}

export interface ReferralStats {
  totalClicks: number
  totalSignups: number
  totalConversions: number
  totalCreditsEarned: number
  availableCredits: number
  withdrawnCredits: number
  tierBreakdown: Record<string, {
    count: number
    credits: number
    revenue: number
  }>
  recentReferrals: Referral[]
}

export interface ReferralDashboard {
  referralCode: string
  referralLink: string
  stats: ReferralStats
  credits: ReferralCredit[]
}

// Poll Types
export interface Poll {
  id: string
  creatorId: string
  question: string
  tierName: string | null
  hideResultsUntilEnd: boolean
  endsAt: Date | null
  createdAt: Date
  updatedAt: Date
  isPublished?: boolean
  options?: PollOption[]
  creator?: {
    id: string
    username: string
    avatarUrl: string | null
  }
}

export interface PollOption {
  id: string
  pollId: string
  label: string
  createdAt: Date
  voteCount?: number
  percentage?: number
}

export interface CreatePollInput {
  question: string
  options: string[] // Array of option texts
  tierName?: string | null
  hideResultsUntilEnd?: boolean
  endsAt?: string | null // ISO date string
}

export interface PollResults {
  poll: Poll
  options: PollOption[]
  totalVotes: number
  userVote: {
    optionId: string | null
    hasVoted: boolean
  }
  resultsLocked: boolean
  resultsHidden: boolean
}

export interface PublicPoll extends Poll {
  options: PollOption[]
  totalVotes: number
  userVote?: {
    optionId: string | null
    hasVoted: boolean
  }
  resultsLocked: boolean
  resultsHidden: boolean
}


export interface ReferralStats {
  totalClicks: number
  totalSignups: number
  totalConversions: number
  totalCreditsEarned: number
  availableCredits: number
  pendingCredits: number
  withdrawnCredits: number
  tierBreakdown: Record<string, {
    count: number
    credits: number
    revenue: number
  }>
  recentReferrals: Referral[]
}

export interface ReferralCode {
  code: string
  link: string
  username?: string
}

