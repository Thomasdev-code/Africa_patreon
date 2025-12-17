"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/payments/payment-utils"

interface PaymentStats {
  totalEarnings: number
  availableBalance: number
  pendingPayouts: number
  totalWithdrawn: number
  currency: string
}

interface PayoutHistory {
  id: string
  amount: number
  currency: string
  method: string
  status: string
  createdAt: string
}

export default function CreatorPaymentsPage() {
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [history, setHistory] = useState<PayoutHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const [statsRes, historyRes] = await Promise.all([
        fetch("/api/creator/earnings"),
        fetch("/api/payouts/withdraw"),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats({
          totalEarnings: statsData.totalEarnings || 0,
          availableBalance: statsData.availableBalance || 0,
          pendingPayouts: statsData.pendingPayouts || 0,
          totalWithdrawn: statsData.totalWithdrawn || 0,
          currency: statsData.currency || "USD",
        })
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json()
        setHistory(historyData.history || [])
      }
    } catch (error) {
      console.error("Error fetching payments:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      pending: "secondary",
      processing: "secondary",
      failed: "destructive",
      cancelled: "outline",
    }

    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
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
        <h1 className="text-3xl font-bold">Payments & Earnings</h1>
        <p className="text-muted-foreground">Manage your earnings and withdrawals</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatCurrency(stats.totalEarnings, stats.currency) : "$0.00"}
            </div>
            <p className="text-xs text-muted-foreground">All-time earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatCurrency(stats.availableBalance, stats.currency) : "$0.00"}
            </div>
            <p className="text-xs text-muted-foreground">Ready to withdraw</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatCurrency(stats.pendingPayouts, stats.currency) : "$0.00"}
            </div>
            <p className="text-xs text-muted-foreground">Processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawn</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatCurrency(stats.totalWithdrawn, stats.currency) : "$0.00"}
            </div>
            <p className="text-xs text-muted-foreground">All-time withdrawals</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="withdraw" className="space-y-4">
        <TabsList>
          <TabsTrigger value="withdraw">Request Withdrawal</TabsTrigger>
          <TabsTrigger value="history">Withdrawal History</TabsTrigger>
        </TabsList>

        <TabsContent value="withdraw" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request Withdrawal</CardTitle>
              <CardDescription>
                Withdraw your earnings to your preferred payment method
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href="/creator/withdraw">
                <Button>Go to Withdrawal Page</Button>
              </a>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal History</CardTitle>
              <CardDescription>View all your past withdrawal requests</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-muted-foreground">No withdrawal history yet</p>
              ) : (
                <div className="space-y-4">
                  {history.map((payout) => (
                    <div
                      key={payout.id}
                      className="flex items-center justify-between border-b pb-4"
                    >
                      <div>
                        <p className="font-medium">
                          {formatCurrency(payout.amount, payout.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payout.method} • {new Date(payout.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {getStatusBadge(payout.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

