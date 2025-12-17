import type { Metadata } from "next"
import { PageHeader } from "@/components/PageHeader"
import { PageContent } from "@/components/PageContent"

export const metadata: Metadata = {
  title: "Refund Policy | Africa Patreon",
  description:
    "Understand how refunds, mistaken charges, chargebacks and creator payout delays are handled on Africa Patreon.",
}

export default function RefundPolicyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Refund Policy"
        subtitle="Africa Patreon is built for digital memberships and content. This policy explains when payments are refundable, how mistakes are handled, and what happens if you file a chargeback."
      />
      <PageContent>
        <section aria-labelledby="digital-heading">
          <h2 id="digital-heading">1. Digital subscriptions &amp; one‑time unlocks</h2>
          <p>
            Africa Patreon enables creators to offer digital memberships, exclusive content and
            one‑time unlocks. Because access is delivered immediately and cannot be &quot;returned&quot;
            like a physical product, <strong>payments are generally non‑refundable</strong> once a
            subscription period has started or content has been unlocked.
          </p>
          <p>
            However, we recognize that mistakes and technical issues can occur. This policy explains
            how we handle those situations fairly for fans and creators.
          </p>
        </section>

        <section aria-labelledby="no-refunds-heading">
          <h2 id="no-refunds-heading">2. When refunds are not provided</h2>
          <p>
            In the normal course of use, Africa Patreon does <strong>not</strong> provide refunds
            for:
          </p>
          <ul>
            <li>
              Completed subscription periods where you had access to the creator&apos;s content or
              community.
            </li>
            <li>
              One‑time unlocks or digital goods that have already been delivered or viewed.
            </li>
            <li>
              Situations where you forgot to cancel before renewal, but access for the new period
              has already started.
            </li>
          </ul>
          <p>
            Local consumer‑protection laws may give you additional rights in certain jurisdictions.
            Where such laws apply and cannot be waived, we will respect them.
          </p>
        </section>

        <section aria-labelledby="mistakes-heading">
          <h2 id="mistakes-heading">3. Mistaken or duplicate charges</h2>
          <p>
            If you believe you were charged incorrectly – for example, you see duplicate payments,
            an amount that does not match the checkout, or a subscription you never authorized –
            please contact us promptly.
          </p>
          <ul>
            <li>
              We may work with the relevant payment provider (Stripe, Paystack, Flutterwave, M‑Pesa
              integrations) to investigate the transaction.
            </li>
            <li>
              Where we confirm a duplicate or clear technical error, we will{" "}
              <strong>reverse or refund the mistaken portion</strong> where feasible.
            </li>
            <li>
              To protect creators from abuse, we may decline refund requests for long‑past periods
              or where usage clearly indicates that benefits were consumed.
            </li>
          </ul>
        </section>

        <section aria-labelledby="chargebacks-heading">
          <h2 id="chargebacks-heading">4. Chargebacks and disputes</h2>
          <p>
            When you dispute a card or mobile money transaction with your bank or provider, this is
            called a <strong>chargeback</strong>. Chargebacks are handled by payment providers and
            banks, not directly by Africa Patreon.
          </p>
          <ul>
            <li>
              If a chargeback is filed, the payment provider may immediately reverse the payment and
              apply fees. We may debit the equivalent amount (and any associated fee) from the
              creator&apos;s wallet or future payouts.
            </li>
            <li>
              We may ask both parties (fan and creator) for evidence. Repeated or abusive
              chargebacks can lead to account restrictions or termination.
            </li>
            <li>
              Filing a chargeback does not guarantee that you will win the dispute. That decision is
              made by your bank or payment provider based on the evidence submitted.
            </li>
          </ul>
        </section>

        <section aria-labelledby="payout-delays-heading">
          <h2 id="payout-delays-heading">5. Creator payouts &amp; refund impact</h2>
          <p>
            To protect fans and our payment partnerships, Africa Patreon may delay, reduce or
            reverse payouts where there is unusual activity, open disputes or a high rate of
            chargebacks.
          </p>
          <ul>
            <li>
              If a payment is under investigation, we may hold the associated balance in a pending
              state until the case is resolved.
            </li>
            <li>
              Where refunds or chargebacks are granted, we may deduct the corresponding amounts from
              the creator&apos;s wallet or offset them against future payouts.
            </li>
            <li>
              In high‑risk or abusive cases, we may freeze payouts while we perform additional KYC,
              AML or fraud checks as described in our Anti‑Scam &amp; Fraud Rules.
            </li>
          </ul>
        </section>

        <section aria-labelledby="how-to-request-heading">
          <h2 id="how-to-request-heading">6. How to request help</h2>
          <p>
            If you believe you are entitled to a refund under this policy or applicable law, please
            contact our support team first instead of going directly to a chargeback. In many cases
            we can resolve issues faster and with less disruption for both you and the creator.
          </p>
          <p>
            When you contact us, please provide:
          </p>
          <ul>
            <li>The email address associated with your Africa Patreon account.</li>
            <li>The creator&apos;s profile or page URL.</li>
            <li>The date, amount and reference of the payment in question.</li>
            <li>A short explanation of what went wrong.</li>
          </ul>
          <p>
            Our team will review your request, consult with the creator when necessary, and let you
            know the outcome or next steps.
          </p>
        </section>

        <section aria-labelledby="changes-heading">
          <h2 id="changes-heading">7. Changes to this policy</h2>
          <p>
            We may update this Refund Policy as our product, payment partners or legal obligations
            evolve. We will always aim to keep it simple, transparent and fair to both fans and
            creators.
          </p>
        </section>
      </PageContent>
    </>
  )
}


