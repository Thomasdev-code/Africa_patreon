import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Prisma } from "@prisma/client"
import type { MembershipTier, MediaType } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely parses Prisma JSON field to MembershipTier[]
 * Returns empty array if value is not a valid array of tiers
 */
export function parseMembershipTiers(value: unknown): MembershipTier[] {
  // Return empty array if value is null or undefined
  if (value === null || value === undefined) {
    return []
  }

  // Return empty array if value is not an array
  if (!Array.isArray(value)) {
    return []
  }

  // Filter and validate each item
  return value.filter((item): item is MembershipTier => {
    // Check if item is an object
    if (typeof item !== "object" || item === null) {
      return false
    }

    // Check if item has required fields with correct types
    return (
      "name" in item &&
      "price" in item &&
      typeof item.name === "string" &&
      typeof item.price === "number"
    )
  })
}

/**
 * Safely serializes MembershipTier[] to Prisma.InputJsonValue
 * Ensures values are JSON-serializable (no functions, no classes)
 */
export function serializeMembershipTiers(tiers: MembershipTier[]): Prisma.InputJsonValue {
  // Return empty array if tiers is empty
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return []
  }

  // Map to plain objects with only serializable values
  return tiers.map((tier) => ({
    name: String(tier.name),
    price: Number(tier.price),
  }))
}

/**
 * Safely parses Prisma string field to MediaType
 * Returns null if value is not a valid MediaType
 * Validates against allowed values: "image", "video", "audio", or null
 */
export function parseMediaType(value: unknown): MediaType {
  // Return null if value is null or undefined
  if (value === null || value === undefined) {
    return null
  }

  // Return null if value is not a string
  if (typeof value !== "string") {
    return null
  }

  // Validate against allowed MediaType values (explicit checks to avoid type assertions)
  if (value === "image") {
    return "image"
  }
  if (value === "video") {
    return "video"
  }
  if (value === "audio") {
    return "audio"
  }

  // Return null for invalid values
  return null
}
