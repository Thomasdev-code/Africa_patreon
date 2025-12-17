import type { Metadata } from "next"
import { PageHeader } from "@/components/PageHeader"
import { PageContent } from "@/components/PageContent"

export const metadata: Metadata = {
  title: "Terms of Service | Africa Patreon",
  description:
    "Read the Africa Patreon Terms of Service covering creator responsibilities, fan subscriptions, payments, chargebacks, refunds and legal rights.",
}

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Terms of Service"
        subtitle="These Terms of Service explain how Africa Patreon works and the rules that apply when you create an account, support creators, or publish content on the platform."
      />
      <PageContent>
        <section aria-labelledby="acceptance-heading">
          <h2 id="acceptance-heading">1. Acceptance of these terms</h2>
          <p>
            By creating an account, subscribing to a creator, receiving payments as a creator, or
            otherwise using Africa Patreon (the &quot;Platform&quot;), you agree to be bound by
            these Terms of Service (&quot;Terms&quot;), our Privacy Policy, Community Guidelines,
            Anti‑Scam &amp; Fraud Rules and any other policies referenced here (collectively, the
            &quot;Agreement&quot;).
          </p>
          <p>
            If you do not agree with these Terms, do not use the Platform. If you are using Africa
            Patreon on behalf of a company or organization, you confirm that you have authority to
            bind that entity to this Agreement.
          </p>
        </section>

        <section aria-labelledby="eligibility-heading">
          <h2 id="eligibility-heading">2. Eligibility</h2>
          <p>You may only use Africa Patreon if:</p>
          <ul>
            <li>You are at least 18 years old or the age of majority in your jurisdiction; and</li>
            <li>
              You have the full right, power and authority to enter into this Agreement and to
              comply with all applicable laws and regulations, including sanctions and export
              controls.
            </li>
          </ul>
          <p>
            We may require identity verification (KYC) before enabling withdrawals, higher payment
            limits, or access to sensitive features. We may refuse, suspend or terminate accounts at
            our sole discretion where we reasonably suspect fraud, abuse or legal risk.
          </p>
        </section>

        <section aria-labelledby="user-responsibilities-heading">
          <h2 id="user-responsibilities-heading">3. User responsibilities</h2>
          <p>All users (creators and fans) agree to:</p>
          <ul>
            <li>
              Provide accurate information during sign‑up and keep account details up to date,
              including email, country and billing details.
            </li>
            <li>
              Keep login credentials secure and notify us immediately of any unauthorized access.
            </li>
            <li>
              Use the Platform only for lawful purposes and in line with our Community Guidelines
              and Anti‑Scam &amp; Fraud Rules.
            </li>
            <li>
              Not attempt to bypass our security systems, fraud checks, or payment infrastructure.
            </li>
          </ul>
        </section>

        <section aria-labelledby="creator-responsibilities-heading">
          <h2 id="creator-responsibilities-heading">4. Creator responsibilities</h2>
          <p>Creators using Africa Patreon agree to:</p>
          <ul>
            <li>
              Clearly describe what supporters will receive for each membership tier or one‑time
              payment (for example: early access, exclusive posts, community access, digital goods).
            </li>
            <li>
              Deliver promised perks and content in a timely manner, or communicate clearly when
              timelines change.
            </li>
            <li>
              Not misrepresent qualifications, affiliations, or benefits, and not run fraudulent or
              misleading campaigns.
            </li>
            <li>
              Comply with all applicable laws, including tax obligations in their jurisdiction, and
              complete KYC/AML checks when requested.
            </li>
            <li>
              Not encourage chargebacks, off‑platform payments intended to evade fees, or any
              behavior that abuses fans or the Platform.
            </li>
          </ul>
        </section>

        <section aria-labelledby="platform-rights-heading">
          <h2 id="platform-rights-heading">5. Platform rights</h2>
          <p>
            To protect fans, creators and our payment partners, Africa Patreon reserves the right
            to:
          </p>
          <ul>
            <li>
              Review, limit, or remove content that violates this Agreement, the Community
              Guidelines or applicable law.
            </li>
            <li>
              Suspend, limit or terminate accounts involved in high‑risk, abusive or fraudulent
              activity, including repeated chargebacks or disputes.
            </li>
            <li>
              Hold, delay or reverse payouts when we detect unusual behavior, open disputes,
              chargebacks, regulatory requests or suspected money laundering or terrorist
              financing.
            </li>
            <li>
              Share relevant data with payment processors, banks and regulators where required by
              law or to investigate fraud or abuse.
            </li>
          </ul>
        </section>

        <section aria-labelledby="subscriptions-heading">
          <h2 id="subscriptions-heading">6. Subscriptions and billing</h2>
          <p>
            Fans can subscribe to creators on a recurring basis (for example monthly or yearly), or
            make one‑time payments to unlock posts or perks. When you start a subscription:
          </p>
          <ul>
            <li>
              You authorize us and our payment partners (Stripe, Paystack, Flutterwave and their
              mobile money integrations, including M‑Pesa) to charge your chosen payment method on a
              recurring basis until you cancel.
            </li>
            <li>
              Subscription access typically renews automatically at the end of each billing period.
              You can cancel renewals at any time; access will continue for the current paid period.
            </li>
            <li>
              Prices and benefits of tiers are set by creators and may change over time. We will
              notify you when required by law or best practices.
            </li>
          </ul>
        </section>

        <section aria-labelledby="payments-heading">
          <h2 id="payments-heading">7. Payments, fees &amp; chargebacks</h2>
          <p>
            Africa Patreon works with third‑party payment processors to accept and route payments.
            We do not store full card or mobile money credentials on our own servers.
          </p>
          <ul>
            <li>
              <strong>Platform fees:</strong> We charge a transparent platform fee on successful
              payments. This fee is deducted before creator earnings are credited.
            </li>
            <li>
              <strong>Processor fees:</strong> Stripe, Paystack, Flutterwave and other partners may
              charge their own transaction fees which are factored into settlements.
            </li>
            <li>
              <strong>Chargebacks and disputes:</strong> If a fan disputes a transaction or files a
              chargeback, the payment provider may reverse the transaction and apply additional
              fees. In such cases, we may deduct equivalent amounts from the creator&apos;s wallet
              or future payouts.
            </li>
            <li>
              <strong>Fraud:</strong> Where we detect or reasonably suspect fraud, we may cancel
              payments, reverse payouts, freeze balances, or close accounts.
            </li>
          </ul>
          <p>
            Details on refunds and chargebacks are further described in our Refund Policy and
            Anti‑Scam &amp; Fraud Rules.
          </p>
        </section>

        <section aria-labelledby="refunds-heading">
          <h2 id="refunds-heading">8. Refunds</h2>
          <p>
            Africa Patreon is primarily a platform for digital content and membership access. As a
            result, <strong>all payments are generally non‑refundable once access is delivered</strong>,
            except where required by law or explicitly stated in our Refund Policy.
          </p>
          <p>
            In limited cases – such as clear technical errors, duplicate charges, or confirmed
            fraud – we may, at our discretion, work with payment providers and creators to correct
            payments or issue refunds.
          </p>
        </section>

        <section aria-labelledby="ip-heading">
          <h2 id="ip-heading">9. Intellectual property</h2>
          <p>
            Creators retain ownership of the content they upload to Africa Patreon, subject to any
            separate agreements with labels, publishers or third parties.
          </p>
          <ul>
            <li>
              By posting content, you grant Africa Patreon a non‑exclusive, worldwide, royalty‑free
              license to host, store, cache, transmit, display and make your content available to
              fans as necessary to operate the Platform.
            </li>
            <li>
              You confirm that you have the necessary rights to the content you upload, and that it
              does not infringe third‑party copyrights, trademarks, privacy or other rights.
            </li>
            <li>
              You may not use Africa Patreon to distribute pirated material, unlicensed streams, or
              content that violates intellectual property laws.
            </li>
          </ul>
        </section>

        <section aria-labelledby="termination-heading">
          <h2 id="termination-heading">10. Suspension &amp; termination</h2>
          <p>
            You may stop using Africa Patreon at any time by cancelling subscriptions, closing your
            account, or ceasing to log in. Some data may continue to be stored as required by law or
            for fraud prevention.
          </p>
          <p>
            We may suspend or terminate accounts, remove content, or restrict access where we
            believe there is:
          </p>
          <ul>
            <li>Material breach of these Terms or other policies.</li>
            <li>Fraud, abuse, chargeback abuse, or other financial risk.</li>
            <li>Requests from regulators, payment partners or law‑enforcement agencies.</li>
          </ul>
          <p>
            On termination, pending payouts may be delayed, reduced or cancelled where necessary to
            resolve disputes, chargebacks or legal requirements.
          </p>
        </section>

        <section aria-labelledby="disclaimers-heading">
          <h2 id="disclaimers-heading">11. Disclaimers &amp; limitation of liability</h2>
          <p>
            Africa Patreon is provided on an &quot;as is&quot; and &quot;as available&quot; basis.
            We do not guarantee uninterrupted or error‑free operation, nor do we guarantee any
            minimum earnings for creators.
          </p>
          <p>
            To the maximum extent permitted by law, Africa Patreon and its affiliates will not be
            liable for any indirect, incidental, special, consequential or punitive damages, or any
            loss of profits or revenues, whether incurred directly or indirectly, arising from your
            use of the Platform.
          </p>
        </section>

        <section aria-labelledby="law-heading">
          <h2 id="law-heading">12. Governing law &amp; disputes</h2>
          <p>
            Unless otherwise required by the laws of your country of residence, these Terms and any
            dispute relating to your use of Africa Patreon will be governed by and construed in
            accordance with the laws of <strong>Kenya</strong>, without regard to its conflict of
            laws principles.
          </p>
          <p>
            Any disputes will be subject to the exclusive jurisdiction of the courts of Kenya,
            unless a different forum is required by local consumer protection law. We encourage you
            to contact our support team first to try to resolve any issues informally.
          </p>
        </section>

        <section aria-labelledby="changes-heading">
          <h2 id="changes-heading">13. Changes to these terms</h2>
          <p>
            We may update these Terms from time to time to reflect product changes, legal
            requirements or improvements to the Platform. When we make material changes, we will
            notify you by email, in‑app notifications, or by updating the &quot;last updated&quot;
            date on this page.
          </p>
          <p>
            Continued use of Africa Patreon after changes take effect constitutes acceptance of the
            updated Terms.
          </p>
        </section>
      </PageContent>
    </>
  )
}


