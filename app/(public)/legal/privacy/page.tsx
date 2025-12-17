import type { Metadata } from "next"
import { LegalPageLayout } from "@/components/legal/LegalPageLayout"
import { LegalSection } from "@/components/legal/LegalSection"
import { LegalList } from "@/components/legal/LegalList"
import { generateMetadata as genMeta } from "@/lib/seo"
import { OrganizationSchema } from "@/components/seo/JsonLd"

export const metadata: Metadata = genMeta({
  title: "Privacy Policy",
  description:
    "Learn how Africa Patreon collects, uses and protects your data in line with GDPR, African privacy laws and payment partner requirements.",
  url: "/legal/privacy",
})

export default function PrivacyPage() {
  return (
    <>
      <OrganizationSchema />
      <LegalPageLayout
        title="Privacy Policy"
        subtitle="This Privacy Policy explains what data we collect, how we use it, how we share it with payment providers, and what rights you have over your personal information."
      >
        <LegalSection id="scope" heading="1. Scope and Applicability">
          <p>
            This Privacy Policy applies to all users of Africa Patreon, including creators, fans,
            and visitors. We are committed to protecting your privacy and complying with applicable
            data protection laws, including:
          </p>
          <LegalList
            items={[
              "General Data Protection Regulation (GDPR) for EU users",
              "California Consumer Privacy Act (CCPA) for California residents",
              "African data protection laws in applicable jurisdictions",
              "Payment card industry (PCI) standards for payment data",
            ]}
          />
        </LegalSection>

        <LegalSection id="data-collected" heading="2. Data We Collect">
          <p>
            <strong>Account Information:</strong> Name, email address, username, password (hashed),
            profile information, and preferences.
          </p>
          <p>
            <strong>Payment Information:</strong> Payment method details (processed by third-party
            providers), billing address, transaction history, and payment preferences. We do not
            store full card numbers or mobile money PINs.
          </p>
          <p>
            <strong>Creator Information:</strong> Business information, KYC documents (ID, proof of
            address), payout details, tax information, and content you publish.
          </p>
          <p>
            <strong>Usage Data:</strong> IP address, device information, browser type, pages
            visited, time spent, and interaction patterns.
          </p>
          <p>
            <strong>Communication Data:</strong> Messages sent through the Platform, support
            tickets, and feedback you provide.
          </p>
        </LegalSection>

        <LegalSection id="payment-providers" heading="3. Payment Provider Data Sharing">
          <p>
            When you make a payment, we share necessary information with payment processors:
          </p>
          <p>
            <strong>Stripe:</strong> Card details, billing address, and transaction data are
            processed by Stripe in accordance with their privacy policy. Stripe may collect
            additional fraud prevention data.
          </p>
          <p>
            <strong>Paystack:</strong> Payment information for Nigerian, Ghanaian, and South
            African transactions is processed by Paystack. They may collect device fingerprinting
            and location data for fraud prevention.
          </p>
          <p>
            <strong>Flutterwave:</strong> Pan-African payments are processed by Flutterwave, which
            may collect mobile money account details, phone numbers, and transaction metadata.
          </p>
          <p>
            <strong>M-Pesa (via Flutterwave/Paystack):</strong> Mobile money transactions require
            sharing your phone number and transaction amount with the M-Pesa provider. This data is
            handled according to Safaricom&apos;s privacy policy.
          </p>
        </LegalSection>

        <LegalSection id="data-use" heading="4. How We Use Your Data">
          <p>We use your data to:</p>
          <LegalList
            items={[
              "Process payments and manage subscriptions",
              "Verify creator identity (KYC) and enable payouts",
              "Prevent fraud, abuse, and money laundering",
              "Provide customer support and respond to inquiries",
              "Send important account and transaction notifications",
              "Improve the Platform and develop new features",
              "Comply with legal obligations and enforce our policies",
              "Analyze usage patterns to enhance user experience",
            ]}
          />
        </LegalSection>

        <LegalSection id="data-storage" heading="5. Data Storage and Security">
          <p>
            Your data is stored on secure servers with encryption at rest and in transit. We use:
          </p>
          <LegalList
            items={[
              "SSL/TLS encryption for all data transmission",
              "Encrypted databases for sensitive information",
              "Regular security audits and vulnerability assessments",
              "Access controls and authentication requirements",
              "Backup systems with encrypted storage",
            ]}
          />
          <p>
            Payment data is never stored on our servers. All payment processing is handled by
            PCI-DSS certified third-party providers.
          </p>
        </LegalSection>

        <LegalSection id="cookies" heading="6. Cookies and Analytics">
          <p>
            We use cookies and similar technologies to:
          </p>
          <LegalList
            items={[
              "Maintain your login session",
              "Remember your preferences",
              "Analyze Platform usage and performance",
              "Prevent fraud and abuse",
            ]}
          />
          <p>
            We use analytics services (such as Google Analytics) that may set cookies. You can
            control cookies through your browser settings. See our{" "}
            <a href="/legal/cookies" className="text-blue-600 hover:text-blue-700">
              Cookie Policy
            </a>{" "}
            for details.
          </p>
        </LegalSection>

        <LegalSection id="data-sharing" heading="7. Data Sharing">
          <p>We may share your data with:</p>
          <LegalList
            items={[
              "Payment processors (Stripe, Paystack, Flutterwave) for transaction processing",
              "KYC/AML service providers for identity verification",
              "Cloud hosting providers for data storage",
              "Customer support tools for assistance",
              "Legal authorities when required by law or to protect rights",
            ]}
          />
          <p>
            We do not sell your personal data to third parties for marketing purposes.
          </p>
        </LegalSection>

        <LegalSection id="user-rights" heading="8. Your Rights">
          <p>Depending on your location, you may have the right to:</p>
          <LegalList
            items={[
              "Access your personal data",
              "Correct inaccurate data",
              "Delete your data (subject to legal retention requirements)",
              "Export your data in a portable format",
              "Object to processing of your data",
              "Withdraw consent where processing is based on consent",
              "Lodge a complaint with a data protection authority",
            ]}
          />
          <p>
            To exercise these rights, contact us at privacy@africapatreon.com or through{" "}
            <a href="/contact" className="text-blue-600 hover:text-blue-700">
              our support page
            </a>
            .
          </p>
        </LegalSection>

        <LegalSection id="data-retention" heading="9. Data Retention">
          <p>
            We retain your data for as long as necessary to provide services, comply with legal
            obligations, resolve disputes, and enforce agreements. Specifically:
          </p>
          <LegalList
            items={[
              "Account data: Until account deletion or 7 years after last activity",
              "Payment records: 7 years for tax and legal compliance",
              "KYC documents: 5 years after account closure or as required by law",
              "Support communications: 3 years",
            ]}
          />
        </LegalSection>

        <LegalSection id="international-transfers" heading="10. International Data Transfers">
          <p>
            Your data may be transferred to and processed in countries outside your jurisdiction,
            including the United States, where our payment processors and cloud providers operate.
            We ensure appropriate safeguards are in place, including:
          </p>
          <LegalList
            items={[
              "Standard contractual clauses for EU data transfers",
              "Adequacy decisions where applicable",
              "Encryption and security measures",
            ]}
          />
        </LegalSection>

        <LegalSection id="children" heading="11. Children&apos;s Privacy">
          <p>
            Africa Patreon is not intended for users under 18 years of age. We do not knowingly
            collect personal information from children. If we become aware that we have collected
            data from a child, we will delete it immediately.
          </p>
        </LegalSection>

        <LegalSection id="changes" heading="12. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. Material changes will be
            communicated via email or Platform notification. Continued use of the Platform after
            changes constitutes acceptance of the updated policy.
          </p>
        </LegalSection>

        <LegalSection id="contact" heading="13. Contact Us">
          <p>
            For privacy-related questions or to exercise your rights, contact us at
            privacy@africapatreon.com or visit{" "}
            <a href="/contact" className="text-blue-600 hover:text-blue-700">
              our support page
            </a>
            .
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </LegalSection>
      </LegalPageLayout>
    </>
  )
}

