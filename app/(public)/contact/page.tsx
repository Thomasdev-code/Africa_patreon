import type { Metadata } from "next"
import { PageHeader } from "@/components/PageHeader"
import { PageContent } from "@/components/PageContent"

export const metadata: Metadata = {
  title: "Contact & Support | Africa Patreon",
  description:
    "Contact the Africa Patreon team for support, safety issues, legal questions or partnership opportunities.",
}

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Support"
        title="Contact &amp; Support"
        subtitle="Reach out to Africa Patreon for account help, safety concerns, legal questions or partnership opportunities."
      />
      <PageContent>
        <section aria-labelledby="support-heading">
          <h2 id="support-heading">1. Creator &amp; fan support</h2>
          <p>
            For most issues – billing questions, subscription problems, content access, payout
            concerns – please contact our support team using the in‑app help links or the support
            email provided in your dashboard.
          </p>
          <p>
            When you contact us, include as much detail as possible, such as payment references,
            creator profile URLs and screenshots. This helps us resolve your issue faster.
          </p>
        </section>

        <section aria-labelledby="safety-heading">
          <h2 id="safety-heading">2. Safety, fraud or abuse reports</h2>
          <p>
            If you need to report impersonation, scams, harassment, hate content or other violations
            of our Community Guidelines or Anti‑Scam &amp; Fraud Rules, please do so as soon as you
            notice a problem.
          </p>
          <p>
            Provide links, screenshots and any payment information relevant to your report. Our
            trust &amp; safety team will review and take appropriate action, which may include
            warnings, content removal, payout freezes or account termination.
          </p>
        </section>

        <section aria-labelledby="legal-heading">
          <h2 id="legal-heading">3. Legal &amp; compliance</h2>
          <p>
            For questions regarding our Terms of Service, Privacy Policy, data‑protection practices
            or regulatory compliance, please reference the legal pages linked in the footer first.
            If you still need clarification, you can contact us and we will route your request to
            the appropriate team.
          </p>
        </section>

        <section aria-labelledby="partnerships-heading">
          <h2 id="partnerships-heading">4. Partnerships</h2>
          <p>
            If you are a payment provider, fintech, platform, label, network, agency or brand
            interested in partnering with Africa Patreon, reach out with a short description of your
            proposal and where you operate.
          </p>
        </section>
      </PageContent>
    </>
  )
}


