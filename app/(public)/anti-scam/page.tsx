import type { Metadata } from "next"
import { PageHeader } from "@/components/PageHeader"
import { PageContent } from "@/components/PageContent"

export const metadata: Metadata = {
  title: "Anti‑Scam & Fraud Rules | Africa Patreon",
  description:
    "Learn how Africa Patreon protects fans and creators from scams, impersonation, fake perks and high‑risk behavior.",
}

export default function AntiScamPage() {
  return (
    <>
      <PageHeader
        eyebrow="Safety"
        title="Anti‑Scam &amp; Fraud Rules"
        subtitle="These rules explain what is considered fraudulent or high‑risk behavior on Africa Patreon, how we detect it, and what happens when we find it."
      />
      <PageContent>
        <section aria-labelledby="prohibited-heading">
          <h2 id="prohibited-heading">1. Prohibited behavior</h2>
          <p>
            To protect fans and our payment relationships, the following behavior is strictly
            prohibited on Africa Patreon:
          </p>
          <ul>
            <li>
              <strong>Impersonation:</strong> Pretending to be another person, brand or
              organization, or falsely claiming official endorsements that do not exist.
            </li>
            <li>
              <strong>Fake perks or misleading campaigns:</strong> Promising rewards, content or
              benefits that you never intend to deliver, or deliberately misrepresenting what
              supporters will receive.
            </li>
            <li>
              <strong>Donation scams:</strong> Inventing fake causes, emergencies or charities
              purely to collect money without any real backing or transparency.
            </li>
            <li>
              <strong>Payment evasion:</strong> Encouraging fans to move off‑platform to avoid
              fees, or manipulating transactions to bypass fair revenue sharing or local
              regulations.
            </li>
          </ul>
        </section>

        <section aria-labelledby="high-risk-heading">
          <h2 id="high-risk-heading">2. High‑risk creator rules</h2>
          <p>
            Some types of content or behavior are categorized as higher risk from a financial,
            regulatory or brand‑safety perspective. Examples include:
          </p>
          <ul>
            <li>Large, sudden spikes in revenue from new or unverified accounts.</li>
            <li>Content related to investments, trading signals or financial guarantees.</li>
            <li>Controversial political or activism campaigns with high dispute potential.</li>
            <li>Adult content and other sensitive verticals.</li>
          </ul>
          <p>
            For high‑risk creators, we may apply additional controls, such as:
          </p>
          <ul>
            <li>Stricter KYC requirements before enabling payouts.</li>
            <li>Lower starting payout limits and longer clearing times.</li>
            <li>Manual review of campaigns and promotional material.</li>
            <li>Closer monitoring of chargeback rates and dispute patterns.</li>
          </ul>
        </section>

        <section aria-labelledby="auto-flagging-heading">
          <h2 id="auto-flagging-heading">3. Auto‑flagging &amp; fraud detection</h2>
          <p>
            Africa Patreon uses automated systems as well as manual review to detect suspicious
            behavior. Our risk engine may flag:
          </p>
          <ul>
            <li>Unusual login locations or device changes.</li>
            <li>Multiple failed payment attempts or repeated declined cards.</li>
            <li>Very high refund or chargeback rates for a single creator.</li>
            <li>Patterns similar to known scam campaigns or stolen‑card testing.</li>
          </ul>
          <p>
            When an account is flagged, we may temporarily:
          </p>
          <ul>
            <li>Hold payouts or limit withdrawal methods.</li>
            <li>Disable new subscriptions until the review is complete.</li>
            <li>Request additional KYC documents or explanations from the creator.</li>
          </ul>
        </section>

        <section aria-labelledby="reporting-heading">
          <h2 id="reporting-heading">4. Reporting suspicious activity</h2>
          <p>
            Fans and creators are encouraged to report suspicious campaigns, impersonation or fraud
            attempts. When you report a concern, please provide:
          </p>
          <ul>
            <li>Links to the creator page or specific posts.</li>
            <li>Screenshots or descriptions of misleading or abusive behavior.</li>
            <li>Any payment references or communication history that may help our review.</li>
          </ul>
          <p>
            Our trust &amp; safety team will review the report, investigate and take appropriate
            action which may include warnings, content removal, payout freezes or account
            termination.
          </p>
        </section>

        <section aria-labelledby="kyc-heading">
          <h2 id="kyc-heading">5. Verification &amp; KYC requirements</h2>
          <p>
            To comply with regulations and keep payments safe, creators may be required to complete
            Know‑Your‑Customer (KYC) verification before receiving payouts, especially at higher
            volume levels.
          </p>
          <ul>
            <li>
              We may request government‑issued ID, proof of address, business registration
              documents or related information, processed securely through third‑party providers.
            </li>
            <li>
              Failure to complete KYC when requested can result in payout holds, limits or account
              closure.
            </li>
            <li>
              In severe cases involving confirmed fraud or financial crime, we may share relevant
              information with payment partners and law‑enforcement agencies as required by law.
            </li>
          </ul>
        </section>

        <section aria-labelledby="consequences-heading">
          <h2 id="consequences-heading">6. Consequences of violations</h2>
          <p>
            Violating these Anti‑Scam &amp; Fraud Rules, our Terms of Service, or applicable law
            can result in:
          </p>
          <ul>
            <li>Removal of specific content, tiers or campaigns.</li>
            <li>Suspension or permanent termination of your account.</li>
            <li>Freezing, delaying or reversing payouts.</li>
            <li>Notifying payment providers or relevant authorities where required.</li>
          </ul>
          <p>
            Our priority is to maintain a safe ecosystem where genuine creators can thrive and fans
            can support them with confidence.
          </p>
        </section>
      </PageContent>
    </>
  )
}


