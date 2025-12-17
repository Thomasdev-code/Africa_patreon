import assert from "assert"
import {
  PLATFORM_FEE_PERCENT,
  calculatePlatformFee,
  calculateCreatorPayout,
} from "@/app/config/platform"

describe("platform fee helpers", () => {
  it("applies default percent to minor units", () => {
    const amount = 10000 // e.g., 100.00 in minor units
    const fee = calculatePlatformFee(amount)
    const expected = Math.floor((amount * PLATFORM_FEE_PERCENT) / 100)
    assert.strictEqual(fee, expected)
  })

  it("computes creator payout as amount - fee", () => {
    const amount = 12345
    const fee = calculatePlatformFee(amount)
    const payout = calculateCreatorPayout(amount)
    assert.strictEqual(payout, amount - fee)
  })
})

