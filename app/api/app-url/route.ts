import { NextResponse } from "next/server"
import { getAppUrl } from "@/lib/app-url"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({ url: getAppUrl() })
}

