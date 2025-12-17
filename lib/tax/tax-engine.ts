/**
 * Tax Engine
 * Handles VAT/Tax calculations for global and African regions
 */

export interface TaxCalculation {
  taxRate: number
  taxAmount: number
  totalAmount: number
  countryCode: string
  taxType: string
}

/**
 * Get tax rate for a country
 */
export function getTaxRate(countryCode: string): {
  rate: number
  type: string
} {
  const code = countryCode.toUpperCase()

  // EU countries - VAT for digital goods (varies by country, using average)
  const euCountries: Record<string, number> = {
    AT: 20, // Austria
    BE: 21, // Belgium
    BG: 20, // Bulgaria
    HR: 25, // Croatia
    CY: 19, // Cyprus
    CZ: 21, // Czech Republic
    DK: 25, // Denmark
    EE: 20, // Estonia
    FI: 24, // Finland
    FR: 20, // France
    DE: 19, // Germany
    GR: 24, // Greece
    HU: 27, // Hungary
    IE: 23, // Ireland
    IT: 22, // Italy
    LV: 21, // Latvia
    LT: 21, // Lithuania
    LU: 17, // Luxembourg
    MT: 18, // Malta
    NL: 21, // Netherlands
    PL: 23, // Poland
    PT: 23, // Portugal
    RO: 19, // Romania
    SK: 20, // Slovakia
    SI: 22, // Slovenia
    ES: 21, // Spain
    SE: 25, // Sweden
  }

  if (euCountries[code]) {
    return {
      rate: euCountries[code],
      type: "VAT",
    }
  }

  // African countries
  const africanTaxRates: Record<string, number> = {
    KE: 16, // Kenya VAT 16%
    NG: 7.5, // Nigeria VAT 7.5%
    ZA: 15, // South Africa VAT 15%
    GH: 12.5, // Ghana VAT 12.5%
    TZ: 18, // Tanzania VAT 18%
    UG: 18, // Uganda VAT 18%
    ET: 15, // Ethiopia VAT 15%
    EG: 14, // Egypt VAT 14%
    MA: 20, // Morocco VAT 20%
    TN: 19, // Tunisia VAT 19%
    DZ: 19, // Algeria VAT 19%
  }

  if (africanTaxRates[code]) {
    return {
      rate: africanTaxRates[code],
      type: "VAT",
    }
  }

  // Other countries - no tax by default (can be extended)
  return {
    rate: 0,
    type: "NONE",
  }
}

/**
 * Calculate tax for an amount
 */
export function calculateTax(
  amount: number,
  countryCode: string
): TaxCalculation {
  const { rate, type } = getTaxRate(countryCode)
  const taxAmount = (amount * rate) / 100
  const totalAmount = amount + taxAmount

  return {
    taxRate: rate,
    taxAmount,
    totalAmount,
    countryCode: countryCode.toUpperCase(),
    taxType: type,
  }
}

/**
 * Calculate tax for subscription
 */
export function calculateSubscriptionTax(
  subscriptionAmount: number,
  countryCode: string
): TaxCalculation {
  return calculateTax(subscriptionAmount, countryCode)
}

/**
 * Format tax breakdown for display
 */
export function formatTaxBreakdown(calculation: TaxCalculation): {
  subtotal: string
  tax: string
  total: string
  taxRate: string
} {
  const subtotal = calculation.totalAmount - calculation.taxAmount

  return {
    subtotal: subtotal.toFixed(2),
    tax: calculation.taxAmount.toFixed(2),
    total: calculation.totalAmount.toFixed(2),
    taxRate: `${calculation.taxRate}% ${calculation.taxType}`,
  }
}

/**
 * Check if country requires tax
 */
export function requiresTax(countryCode: string): boolean {
  const { rate } = getTaxRate(countryCode)
  return rate > 0
}

