import type { Metadata } from "next"
import { LegalPageLayout } from "@/components/legal/LegalPageLayout"
import { LegalSection } from "@/components/legal/LegalSection"
import { LegalList } from "@/components/legal/LegalList"
import { generateMetadata as genMeta } from "@/lib/seo"
import { OrganizationSchema, WebsiteSchema } from "@/components/seo/JsonLd"

export const metadata: Metadata = genMeta({
  title: "Terms of Service",
  description:
    "Read the Africa Patreon Terms of Service covering creator responsibilities, fan subscriptions, payments, chargebacks, refunds and legal rights.",
  url: "/legal/terms",
})

export default function TermsPage() {
  return (
    <>
      <OrganizationSchema />
      <WebsiteSchema />
      <LegalPageLayout
        title="Terms of Service"
        subtitle="These Terms of Service explain how Africa Patreon works and the rules that apply when you create an account, support creators, or publish content on the platform."
      >
        <LegalSection id="acceptance" heading="1. Acceptance of These Terms">
          <p>
            By creating an account, subscribing to a creator, receiving payments as a creator, or
            otherwise using Africa Patreon (the &quot;Platform&quot;), you agree to be bound by these
            Terms of Service (&quot;Terms&quot;), our Privacy Policy, Community Guidelines,
            Anti‑Scam &amp; Fraud Rules and any other policies referenced here (collectively, the
            &quot;Agreement&quot;).
          </p>
          <p>
            If you do not agree with these Terms, do not use the Platform. If you are using Africa
            Patreon on behalf of a company or organization, you confirm that you have authority to
            bind that entity to this Agreement.
          </p>
        </LegalSection>

        <LegalSection id="eligibility" heading="2. Eligibility">
          <p>You may only use Africa Patreon if:</p>
          <LegalList
            items={[
              "You are at least 18 years old or the age of majority in your jurisdiction; and",
              "You have the full right, power and authority to enter into this Agreement and to comply with all applicable laws and regulations, including sanctions and export controls.",
            ]}
          />
          <p>
            We may require identity verification (KYC) before enabling withdrawals, higher payment
            limits, or access to sensitive features. We may refuse, suspend or terminate accounts at
            our sole discretion where we reasonably suspect fraud, abuse or legal risk.
          </p>
        </LegalSection>

        <LegalSection id="user-responsibilities" heading="3. User Responsibilities">
          <p>As a user of Africa Patreon, you agree to:</p>
          <LegalList
            items={[
              "Provide accurate, current and complete information when creating your account",
              "Maintain and update your account information to keep it accurate",
              "Keep your account credentials secure and notify us immediately of any unauthorized access",
              "Use the Platform only for lawful purposes and in accordance with these Terms",
              "Comply with all applicable local, national and international laws and regulations",
              "Respect the intellectual property rights of creators and other users",
              "Not engage in any fraudulent, abusive or harmful activities",
            ]}
          />
        </LegalSection>

        <LegalSection id="creator-responsibilities" heading="4. Creator Responsibilities">
          <p>As a creator on Africa Patreon, you agree to:</p>
          <LegalList
            items={[
              "Deliver the content, benefits and perks promised to your subscribers",
              "Maintain accurate tier descriptions and pricing",
              "Respond to subscriber inquiries in a timely manner",
              "Comply with all applicable laws regarding content creation and distribution",
              "Not use the Platform to sell illegal goods, services or content",
              "Complete KYC verification before requesting payouts",
              "Maintain accurate payout information and notify us of any changes",
              "Pay all applicable taxes on earnings received through the Platform",
            ]}
          />
        </LegalSection>

        <LegalSection id="subscriptions" heading="5. Subscriptions and Payments">
          <p>
            <strong>Subscription Terms:</strong> Subscriptions are billed on a recurring basis
            (monthly or annually) as selected by the fan. Subscriptions automatically renew unless
            cancelled by the fan before the renewal date.
          </p>
          <p>
            <strong>Payment Processing:</strong> Payments are processed through third-party payment
            providers including Stripe, Paystack, Flutterwave, and M-Pesa (via Flutterwave and
            Paystack). We do not store your full payment card details or mobile money credentials.
          </p>
          <p>
            <strong>Platform Fees:</strong> A platform fee is deducted from creator earnings before
            payouts. The current fee percentage is displayed in the creator dashboard and may be
            updated with notice.
          </p>
          <p>
            <strong>Currency:</strong> Fans may pay in various currencies supported by the payment
            provider. Creator earnings are normalized to a primary settlement currency for payout
            purposes.
          </p>
        </LegalSection>

        <LegalSection id="chargebacks" heading="6. Chargebacks and Payment Disputes">
          <p>
            If a fan files a chargeback or payment dispute with their bank or payment provider, we
            will investigate the claim. Chargebacks may result in:
          </p>
          <LegalList
            items={[
              "Temporary hold on creator payouts related to the disputed transaction",
              "Deduction of the disputed amount plus any chargeback fees from creator earnings",
              "Potential account suspension if chargeback patterns indicate fraud or abuse",
            ]}
          />
          <p>
            Creators are responsible for providing evidence to dispute invalid chargebacks. We
            reserve the right to make final decisions on chargeback disputes.
          </p>
        </LegalSection>

        <LegalSection id="refunds" heading="7. Refunds">
          <p>
            Digital subscriptions and content unlocks are generally non-refundable once delivered,
            as stated in our Refund Policy. Refunds may be issued at our discretion for:
          </p>
          <LegalList
            items={[
              "Technical errors that prevent content delivery",
              "Duplicate charges due to system errors",
              "Cases where required by applicable law",
            ]}
          />
          <p>
            Refund requests must be submitted within 7 days of the transaction. Refunds are
            processed to the original payment method and may take 5-10 business days to appear.
          </p>
        </LegalSection>

        <LegalSection id="intellectual-property" heading="8. Intellectual Property">
          <p>
            <strong>Creator Content:</strong> Creators retain all ownership rights to content they
            publish on the Platform. By publishing content, creators grant Africa Patreon a
            non-exclusive license to display, distribute and promote that content on the Platform.
          </p>
          <p>
            <strong>Platform Content:</strong> All Platform design, code, logos, and branding are
            owned by Africa Patreon and protected by copyright and trademark laws.
          </p>
          <p>
            <strong>Prohibited Use:</strong> You may not copy, modify, distribute, or create
            derivative works of Platform content without our written permission.
          </p>
        </LegalSection>

        <LegalSection id="termination" heading="9. Account Termination">
          <p>We may suspend or terminate your account if:</p>
          <LegalList
            items={[
              "You violate these Terms or any Platform policies",
              "You engage in fraudulent, abusive, or illegal activity",
              "You fail to pay fees owed to the Platform",
              "We are required to do so by law or court order",
              "You request account deletion",
            ]}
          />
          <p>
            Upon termination, your access to the Platform will be revoked. Outstanding payouts may be
            held for up to 90 days to resolve any disputes or chargebacks.
          </p>
        </LegalSection>

        <LegalSection id="disclaimers" heading="10. Disclaimers">
          <p>
            THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
            WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE THAT THE PLATFORM WILL BE UNINTERRUPTED,
            ERROR-FREE, OR SECURE.
          </p>
          <p>
            We are not responsible for content created by creators, disputes between creators and
            fans, or the quality of services offered by creators.
          </p>
        </LegalSection>

        <LegalSection id="governing-law" heading="11. Governing Law">
          <p>
            These Terms are governed by the laws of Kenya. Any disputes arising from these Terms or
            your use of the Platform shall be subject to the exclusive jurisdiction of the courts of
            Kenya.
          </p>
          <p>
            If you are located outside Kenya, you agree to submit to the jurisdiction of Kenyan
            courts for resolution of any disputes.
          </p>
        </LegalSection>

        <LegalSection id="changes" heading="12. Changes to These Terms">
          <p>
            We may update these Terms from time to time. Material changes will be communicated via
            email or Platform notification at least 30 days before they take effect. Continued use
            of the Platform after changes constitutes acceptance of the updated Terms.
          </p>
          <p>
            If you do not agree to updated Terms, you must stop using the Platform and may request
            account deletion.
          </p>
        </LegalSection>

        <LegalSection id="contact" heading="13. Contact Us">
          <p>
            If you have questions about these Terms, please contact us at{" "}
            <a href="/contact" className="text-blue-600 hover:text-blue-700">
              our support page
            </a>{" "}
            or email legal@africapatreon.com.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </LegalSection>
      </LegalPageLayout>
    </>
  )
}

