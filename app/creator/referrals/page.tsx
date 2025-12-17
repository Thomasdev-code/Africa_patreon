"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/payments/payment-utils"

interface ReferralStats {
  code: string | null
  referralLink: string | null
  isActive: boolean
  stats: {
    totalReferrals: number
    totalEarnings: number
    pendingPayouts: number
  }
  recentReferrals: any[]
}

export default function CreatorReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchReferrals()
  }, [])

  const fetchReferrals = async () => {
    try {
      const res = await fetch("/api/referrals/my-code")
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching referrals:", error)
    } finally {
      setLoading(false)
    }
  }

  const createCode = async () => {
    try {
      const res = await fetch("/api/referrals/create-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (res.ok) {
        await fetchReferrals()
      }
    } catch (error) {
      console.error("Error creating referral code:", error)
    }
  }

  const copyLink = () => {
    if (stats?.referralLink) {
      navigator.clipboard.writeText(stats.referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Referral Program</h1>
        <p className="text-muted-foreground">Earn commissions from referrals</p>
      </div>

      {!stats?.code ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Referral Code</CardTitle>
            <CardDescription>
              Generate a unique referral code to start earning commissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={createCode}>Create Referral Code</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.stats.totalReferrals}</div>
                <p className="text-xs text-muted-foreground">All-time referrals</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.stats.totalEarnings, "USD")}
                </div>
                <p className="text-xs text-muted-foreground">Commission earned</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.stats.pendingPayouts, "USD")}
                </div>
                <p className="text-xs text-muted-foreground">Awaiting payout</p>
              </CardContent>
            </Card>
          </div>

          {/* Referral Code */}
          <Card>
            <CardHeader>
              <CardTitle>Your Referral Code</CardTitle>
              <CardDescription>Share this link to earn commissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input value={stats.referralLink || ""} readOnly />
                <Button onClick={copyLink} variant="outline">
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={stats.isActive ? "default" : "secondary"}>
                  {stats.isActive ? "Active" : "Inactive"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Code: <strong>{stats.code}</strong>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Referrals */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Referrals</CardTitle>
              <CardDescription>Your latest referral conversions</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentReferrals.length === 0 ? (
                <p className="text-muted-foreground">No referrals yet</p>
              ) : (
                <div className="space-y-4">
                  {stats.recentReferrals.map((referral: any) => (
                    <div
                      key={referral.id}
                      className="flex items-center justify-between border-b pb-4"
                    >
                      <div>
                        <p className="font-medium">
                          {referral.type === "subscription" ? "Subscription" : "Signup"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(referral.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(referral.creditsEarned || 0, "USD")}
                        </p>
                        <Badge variant="outline">{referral.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

