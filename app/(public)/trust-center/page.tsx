import type { Metadata } from "next"
import Link from "next/link"
import { PageHeader } from "@/components/PageHeader"
import { PageContent } from "@/components/PageContent"
import { LegalSection } from "@/components/legal/LegalSection"
import { LegalList } from "@/components/legal/LegalList"
import { generateMetadata as genMeta } from "@/lib/seo"
import { OrganizationSchema } from "@/components/seo/JsonLd"

export const metadata: Metadata = genMeta({
  title: "Trust Center",
  description:
    "Learn how Africa Patreon protects creators and fans with secure payments, fraud prevention, KYC verification, and platform safety measures.",
  url: "/trust-center",
})

export default function TrustCenterPage() {
  return (
    <>
      <OrganizationSchema />
      <PageHeader
        eyebrow="Trust & Safety"
        title="Trust Center"
        subtitle="Your safety and security are our top priorities. Learn how we protect creators, fans, and payments on Africa Patreon."
      />
      <PageContent>
        <div className="mb-12">
          <p className="text-lg text-gray-700 mb-6">
            Africa Patreon is built with security, compliance, and trust at its core. This page
            explains the measures we take to protect you, your payments, and your content.
          </p>
        </div>

        <LegalSection id="platform-safety" heading="Platform Safety">
          <p>
            We maintain a safe environment for creators and fans through:
          </p>
          <LegalList
            items={[
              "Automated fraud detection and monitoring systems",
              "Manual review of suspicious accounts and transactions",
              "Community reporting tools and responsive moderation",
              "Clear community guidelines and anti-scam policies",
              "Regular security audits and vulnerability assessments",
            ]}
          />
          <p className="mt-4">
            Read our{" "}
            <Link href="/legal/community-guidelines" className="text-blue-600 hover:text-blue-700">
              Community Guidelines
            </Link>{" "}
            and{" "}
            <Link href="/legal/anti-scam" className="text-blue-600 hover:text-blue-700">
              Anti-Scam Rules
            </Link>{" "}
            to learn more.
          </p>
        </LegalSection>

        <LegalSection id="payment-protection" heading="Payment Protection">
          <p>
            Your payments are protected through:
          </p>
          <LegalList
            items={[
              "PCI-DSS certified payment processors (Stripe, Paystack, Flutterwave)",
              "Encrypted payment data transmission (SSL/TLS)",
              "No storage of full card numbers or mobile money PINs on our servers",
              "Fraud detection algorithms that flag suspicious transactions",
              "Chargeback protection and dispute resolution processes",
            ]}
          />
          <p className="mt-4">
            Payment processing is handled by industry-leading providers with proven security
            track records. We never see or store your full payment credentials.
          </p>
        </LegalSection>

        <LegalSection id="withdrawal-security" heading="Withdrawal Security">
          <p>
            Creator payouts are secured through:
          </p>
          <LegalList
            items={[
              "KYC (Know Your Customer) verification before payouts",
              "Multi-factor authentication for payout requests",
              "Encrypted payout information storage",
              "Automated fraud checks on withdrawal patterns",
              "Manual review for high-value or unusual payouts",
            ]}
          />
          <p className="mt-4">
            Creators must complete identity verification before requesting payouts. This protects
            both creators and the platform from fraud and money laundering.
          </p>
        </LegalSection>

        <LegalSection id="fraud-prevention" heading="Fraud Prevention">
          <p>
            Our multi-layered fraud prevention includes:
          </p>
          <LegalList
            items={[
              "Real-time transaction monitoring and anomaly detection",
              "Device fingerprinting and behavioral analysis",
              "IP address and location verification",
              "Chargeback rate monitoring and risk scoring",
              "Automated account flagging for manual review",
            ]}
          />
          <p className="mt-4">
            Suspicious accounts are automatically flagged and reviewed by our security team.
            Accounts with high fraud risk may be suspended pending investigation.
          </p>
        </LegalSection>

        <LegalSection id="kyc-aml" heading="KYC/AML Compliance">
          <p>
            We comply with Know Your Customer (KYC) and Anti-Money Laundering (AML) requirements:
          </p>
          <LegalList
            items={[
              "Identity verification for creators requesting payouts",
              "Document verification (government ID, proof of address)",
              "Ongoing monitoring of transaction patterns",
              "Suspicious activity reporting to relevant authorities",
              "Compliance with applicable financial regulations",
            ]}
          />
          <p className="mt-4">
            KYC verification helps prevent fraud, money laundering, and identity theft. All
            verification data is encrypted and stored securely.
          </p>
        </LegalSection>

        <LegalSection id="data-security" heading="Data Security">
          <p>
            Your personal data is protected through:
          </p>
          <LegalList
            items={[
              "End-to-end encryption for sensitive data",
              "Regular security audits and penetration testing",
              "Access controls and authentication requirements",
              "Secure data centers with physical security",
              "Regular backups and disaster recovery plans",
            ]}
          />
          <p className="mt-4">
            Read our{" "}
            <Link href="/legal/privacy" className="text-blue-600 hover:text-blue-700">
              Privacy Policy
            </Link>{" "}
            to learn more about how we handle your data.
          </p>
        </LegalSection>

        <LegalSection id="reporting" heading="Reporting Issues">
          <p>
            If you encounter security issues, fraud, or suspicious activity:
          </p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>
              Visit our{" "}
              <Link href="/contact" className="text-blue-600 hover:text-blue-700">
                support page
              </Link>{" "}
              or email security@africapatreon.com
            </li>
            <li>Provide details: account names, transaction IDs, screenshots</li>
            <li>Describe the issue clearly</li>
          </ol>
          <p className="mt-4">
            We investigate all reports promptly and take appropriate action.
          </p>
        </LegalSection>

        <LegalSection id="legal-pages" heading="Legal & Policy Documents">
          <p>For detailed information, please review:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Link
              href="/legal/terms"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Terms of Service
            </Link>
            <Link
              href="/legal/privacy"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Privacy Policy
            </Link>
            <Link
              href="/legal/refund-policy"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Refund Policy
            </Link>
            <Link
              href="/legal/anti-scam"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Anti-Scam Rules
            </Link>
            <Link
              href="/legal/community-guidelines"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Community Guidelines
            </Link>
            <Link
              href="/legal/cookies"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Cookie Policy
            </Link>
            <Link
              href="/legal/disclaimer"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Disclaimer
            </Link>
            <Link
              href="/legal/impressum"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Impressum
            </Link>
          </div>
        </LegalSection>

        <LegalSection id="contact" heading="Questions?">
          <p>
            For trust and safety questions, contact us at{" "}
            <Link href="/contact" className="text-blue-600 hover:text-blue-700">
              our support page
            </Link>{" "}
            or email trust@africapatreon.com.
          </p>
        </LegalSection>
      </PageContent>
    </>
  )
}

