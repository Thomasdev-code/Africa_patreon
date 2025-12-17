"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function PaymentSettingsPage() {
  const [kycStatus, setKycStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchKycStatus()
  }, [])

  const fetchKycStatus = async () => {
    try {
      // Fetch KYC status
      const res = await fetch("/api/kyc/status")
      if (res.ok) {
        const data = await res.json()
        setKycStatus(data.status)
      }
    } catch (error) {
      console.error("Error fetching KYC status:", error)
    } finally {
      setLoading(false)
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
        <h1 className="text-3xl font-bold">Payment Settings</h1>
        <p className="text-muted-foreground">Manage your payment methods and preferences</p>
      </div>

      <Tabs defaultValue="kyc" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kyc">KYC Verification</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="kyc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>KYC Verification</CardTitle>
              <CardDescription>
                Complete KYC verification to enable withdrawals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {kycStatus === "approved" ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">✓ KYC Verified</p>
                  <p className="text-sm text-green-600">
                    Your identity has been verified. You can now request withdrawals.
                  </p>
                </div>
              ) : kycStatus === "pending" ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 font-medium">⏳ KYC Pending</p>
                  <p className="text-sm text-yellow-600">
                    Your KYC submission is under review. We'll notify you once it's approved.
                  </p>
                </div>
              ) : kycStatus === "rejected" ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-medium">✗ KYC Rejected</p>
                  <p className="text-sm text-red-600">
                    Your KYC submission was rejected. Please resubmit with correct documents.
                  </p>
                  <Button className="mt-4" onClick={() => window.location.href = "/creator/kyc"}>
                    Resubmit KYC
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    Complete KYC verification to enable withdrawals. You'll need to provide:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Government-issued ID</li>
                    <li>Selfie photo</li>
                    <li>Proof of address</li>
                  </ul>
                  <Button onClick={() => window.location.href = "/creator/kyc"}>
                    Start KYC Verification
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Manage your preferred payment methods for withdrawals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Payment methods are configured when you request a withdrawal.
              </p>
              <Button onClick={() => window.location.href = "/creator/withdraw"}>
                Go to Withdrawal Page
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Preferences</CardTitle>
              <CardDescription>
                Configure your payment preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Input value="USD" readOnly />
                <p className="text-sm text-muted-foreground">
                  Currency preferences coming soon
                </p>
              </div>
              <div className="space-y-2">
                <Label>Auto-Payout Threshold</Label>
                <Input type="number" placeholder="0.00" />
                <p className="text-sm text-muted-foreground">
                  Automatically request payout when balance reaches this amount
                </p>
              </div>
              <Button>Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

