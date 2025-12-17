import type { Metadata } from "next"
import { LegalPageLayout } from "@/components/legal/LegalPageLayout"
import { LegalSection } from "@/components/legal/LegalSection"
import { LegalList } from "@/components/legal/LegalList"
import { generateMetadata as genMeta } from "@/lib/seo"

export const metadata: Metadata = genMeta({
  title: "Anti-Scam & Fraud Rules",
  description:
    "Learn about Africa Patreon's anti-fraud measures, prohibited behaviors, KYC requirements, and how we protect creators and fans from scams.",
  url: "/legal/anti-scam",
})

export default function AntiScamPage() {
  return (
    <LegalPageLayout
      title="Anti-Scam & Fraud Rules"
      subtitle="These rules protect creators and fans from fraud, scams, and abusive behavior on Africa Patreon."
    >
      <LegalSection id="overview" heading="1. Overview">
        <p>
          Africa Patreon takes fraud prevention seriously. We use automated systems, manual
          reviews, and KYC verification to protect users and maintain platform integrity. This
          policy explains prohibited behaviors, our detection methods, and consequences for
          violations.
        </p>
      </LegalSection>

      <LegalSection id="prohibited-behavior" heading="2. Prohibited Behavior">
        <p>The following behaviors are strictly prohibited:</p>
        <LegalList
          items={[
            "Impersonating other creators, brands, or public figures",
            "Creating fake accounts or using stolen identities",
            "Offering fake perks, benefits, or content that is not delivered",
            "Misleading donation campaigns or false charity claims",
            "Payment fraud, including using stolen payment methods",
            "Chargeback fraud or false dispute claims",
            "Money laundering or using the platform for illegal financial activities",
            "Creating multiple accounts to evade bans or limits",
          ]}
        />
      </LegalSection>

      <LegalSection id="high-risk-creators" heading="3. High-Risk Creator Rules">
        <p>
          Creators in certain categories may be subject to additional verification:
        </p>
        <LegalList
          items={[
            "Adult content creators must verify age and consent",
            "Financial advice creators must provide credentials",
            "Medical/health creators must provide qualifications",
            "Creators with high transaction volumes require enhanced KYC",
            "Creators in regulated industries must comply with applicable laws",
          ]}
        />
      </LegalSection>

      <LegalSection id="auto-flagging" heading="4. Automated Fraud Detection">
        <p>Our systems automatically flag suspicious activity including:</p>
        <LegalList
          items={[
            "Unusual payment patterns or rapid transaction spikes",
            "Multiple accounts from the same device or IP",
            "Chargeback rates above industry thresholds",
            "Suspicious account creation patterns",
            "Content that matches known scam templates",
          ]}
        />
        <p>
          Flagged accounts are reviewed by our security team and may be suspended pending
          investigation.
        </p>
      </LegalSection>

      <LegalSection id="kyc-requirements" heading="5. KYC/AML Requirements">
        <p>
          Creators must complete identity verification (KYC) before:
        </p>
        <LegalList
          items={[
            "Requesting payouts above threshold amounts",
            "Enabling certain payment methods",
            "Accessing advanced creator features",
            "After being flagged for risk assessment",
          ]}
        />
        <p>
          KYC requires submitting government-issued ID, proof of address, and in some cases, a
          selfie for verification. This information is encrypted and stored securely.
        </p>
      </LegalSection>

      <LegalSection id="reporting" heading="6. Reporting Scams and Fraud">
        <p>
          If you encounter suspicious activity, report it immediately:
        </p>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Visit our{" "}
            <a href="/contact" className="text-blue-600 hover:text-blue-700">
              support page
            </a>{" "}
            or email fraud@africapatreon.com
          </li>
          <li>Provide details: account name, transaction IDs, screenshots</li>
          <li>Describe the suspicious behavior</li>
        </ol>
        <p>
          We investigate all reports and take appropriate action, which may include account
          suspension, legal action, or cooperation with law enforcement.
        </p>
      </LegalSection>

      <LegalSection id="consequences" heading="7. Consequences for Violations">
        <p>Violations may result in:</p>
        <LegalList
          items={[
            "Immediate account suspension or termination",
            "Freezing of funds pending investigation",
            "Permanent ban from the platform",
            "Legal action and cooperation with law enforcement",
            "Reporting to credit bureaus or fraud databases",
          ]}
        />
      </LegalSection>

      <LegalSection id="contact" heading="8. Contact Us">
        <p>
          For fraud-related concerns, contact fraud@africapatreon.com or visit{" "}
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
  )
}

