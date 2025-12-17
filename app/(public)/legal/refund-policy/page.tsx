import type { Metadata } from "next"
import { LegalPageLayout } from "@/components/legal/LegalPageLayout"
import { LegalSection } from "@/components/legal/LegalSection"
import { LegalList } from "@/components/legal/LegalList"
import { generateMetadata as genMeta } from "@/lib/seo"

export const metadata: Metadata = genMeta({
  title: "Refund Policy",
  description:
    "Understand how refunds, mistaken charges, chargebacks and creator payout delays are handled on Africa Patreon.",
  url: "/legal/refund-policy",
})

export default function RefundPolicyPage() {
  return (
    <LegalPageLayout
      title="Refund Policy"
      subtitle="Africa Patreon is built for digital memberships and content. This policy explains when payments are refundable, how mistakes are handled, and what happens if you file a chargeback."
    >
      <LegalSection id="digital-subscriptions" heading="1. Digital Subscriptions & One-Time Unlocks">
        <p>
          Africa Patreon enables creators to offer digital memberships, exclusive content and
          one‑time unlocks. Because access is delivered immediately and cannot be
          &quot;returned&quot; like a physical product,{" "}
          <strong>payments are generally non‑refundable</strong> once a subscription period has
          started or content has been unlocked.
        </p>
        <p>
          However, we recognize that mistakes and technical issues can occur. This policy explains
          how we handle those situations fairly for fans and creators.
        </p>
      </LegalSection>

      <LegalSection id="non-refundable" heading="2. Non-Refundable Transactions">
        <p>The following are generally non-refundable:</p>
        <LegalList
          items={[
            "Active subscription periods where content has been accessed",
            "One-time content unlocks that have been delivered",
            "Creator benefits or perks that have been provided",
            "Payments made more than 7 days ago (unless required by law)",
          ]}
        />
      </LegalSection>

      <LegalSection id="refundable" heading="3. When Refunds May Be Issued">
        <p>We may issue refunds at our discretion for:</p>
        <LegalList
          items={[
            "Duplicate charges due to technical errors",
            "Charges made without authorization (fraud)",
            "Technical failures that prevent content delivery",
            "Creator account termination before subscription period ends",
            "Cases where required by applicable consumer protection laws",
          ]}
        />
      </LegalSection>

      <LegalSection id="mistaken-charges" heading="4. Mistaken or Duplicate Charges">
        <p>
          If you notice a duplicate charge or believe you were charged in error:
        </p>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Contact us within 7 days of the transaction</li>
          <li>Provide transaction details (reference number, date, amount)</li>
          <li>Explain the nature of the error</li>
        </ol>
        <p>
          We will investigate and issue a refund if the charge was indeed a mistake. Refunds are
          processed to the original payment method within 5-10 business days.
        </p>
      </LegalSection>

      <LegalSection id="chargebacks" heading="5. Chargebacks">
        <p>
          If you file a chargeback with your bank or payment provider instead of requesting a
          refund through us:
        </p>
        <LegalList
          items={[
            "We will investigate the claim and may provide evidence to your bank",
            "Creator payouts related to the disputed transaction may be temporarily held",
            "If the chargeback is successful, the amount plus fees will be deducted from creator earnings",
            "Frequent chargebacks may result in account suspension",
          ]}
        />
        <p>
          <strong>We encourage you to contact us first</strong> before filing a chargeback, as we
          can often resolve issues more quickly and fairly for both parties.
        </p>
      </LegalSection>

      <LegalSection id="creator-payouts" heading="6. Creator Payout Delays">
        <p>
          If a creator&apos;s payout is delayed due to a dispute or chargeback:
        </p>
        <LegalList
          items={[
            "We will notify the creator of the delay and reason",
            "Payouts may be held for up to 90 days to resolve disputes",
            "Once resolved, payouts will be processed according to the outcome",
            "If the dispute is resolved in the creator's favor, the full amount will be paid",
          ]}
        />
      </LegalSection>

      <LegalSection id="process" heading="7. Refund Request Process">
        <p>To request a refund:</p>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Visit our{" "}
            <a href="/contact" className="text-blue-600 hover:text-blue-700">
              support page
            </a>{" "}
            or email support@africapatreon.com
          </li>
          <li>Include your account email and transaction reference number</li>
          <li>Explain why you are requesting a refund</li>
          <li>We will review your request within 5 business days</li>
        </ol>
      </LegalSection>

      <LegalSection id="contact" heading="8. Contact Us">
        <p>
          For refund requests or questions about this policy, contact us at{" "}
          <a href="/contact" className="text-blue-600 hover:text-blue-700">
            our support page
          </a>{" "}
          or email support@africapatreon.com.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}

