import type { Metadata } from "next"
import { PageHeader } from "@/components/PageHeader"
import { PageContent } from "@/components/PageContent"
import { generateMetadata as genMeta } from "@/lib/seo"
import { OrganizationSchema } from "@/components/seo/JsonLd"

export const metadata: Metadata = genMeta({
  title: "About – Empowering African Creators",
  description:
    "Learn how Africa Patreon helps African creators earn predictable, recurring income from fans using Stripe, Paystack, Flutterwave and M-Pesa.",
  url: "/about",
})

export default function AboutPage() {
  return (
    <>
      <OrganizationSchema />
      <PageHeader
        eyebrow="About Africa Patreon"
        title="Built for African creators and their global fans"
        subtitle="Africa Patreon is a subscription and membership platform that makes it simple and safe for African creators to earn recurring income from supporters anywhere in the world."
      />
      <PageContent>
        <section aria-labelledby="mission-heading">
          <h2 id="mission-heading">Our mission</h2>
          <p>
            Africa has world–class storytellers, educators, musicians, developers and community
            builders. What has been missing is a reliable way for them to get paid – in local
            currencies, with local payment methods, and with global reach. Africa Patreon exists to
            close that gap.
          </p>
          <p>
            Our mission is to{" "}
            <strong>unlock sustainable income for African creators, on African terms</strong>. We
            combine modern subscription tooling with Africa–first payment rails so creators can
            focus on their work instead of fighting payment failures, chargeback chaos, or
            complicated infrastructure.
          </p>
        </section>

        <section aria-labelledby="africa-first-heading">
          <h2 id="africa-first-heading">Africa‑first monetization</h2>
          <p>
            Africa Patreon is designed from day one for creators across Nairobi, Lagos, Accra, Cape
            Town and beyond. That means:
          </p>
          <ul>
            <li>
              <strong>Local payment options:</strong> Fans can pay using cards and bank transfers
              via Stripe, Paystack and Flutterwave, as well as mobile money channels like M‑Pesa.
            </li>
            <li>
              <strong>Multi–currency support:</strong> We normalize payouts into a primary
              settlement currency while respecting what your fans actually use to pay.
            </li>
            <li>
              <strong>Compliance built‑in:</strong> KYC, AML and fraud controls are part of the
              core platform, not an afterthought.
            </li>
          </ul>
        </section>

        <section aria-labelledby="how-creators-earn-heading">
          <h2 id="how-creators-earn-heading">How creators earn on Africa Patreon</h2>
          <p>Creators can mix and match multiple revenue streams:</p>
          <ul>
            <li>
              <strong>Membership tiers:</strong> Offer monthly or yearly subscription tiers with
              exclusive posts, behind‑the‑scenes content, early access drops and community perks.
            </li>
            <li>
              <strong>Unlockable posts:</strong> Gate premium posts or drops behind one‑time
              payments for fans who prefer à‑la‑carte access.
            </li>
            <li>
              <strong>Referrals:</strong> Reward your community for bringing new paying members with
              built‑in referral tracking and credits.
            </li>
          </ul>
          <p>
            Every successful payment flows through our payout engine. Platform fees are deducted
            automatically, taxes are tracked where applicable, and creators see{" "}
            <strong>net earnings in a clear wallet view</strong>. From there, they can request
            payouts to supported methods such as mobile money or bank accounts, subject to KYC and
            risk checks.
          </p>
        </section>

        <section aria-labelledby="payments-heading">
          <h2 id="payments-heading">Payments we support</h2>
          <p>
            Africa Patreon integrates with leading payment providers so your fans can pay with what
            they already use:
          </p>
          <ul>
            <li>
              <strong>Stripe:</strong> For international card payments and global fans.
            </li>
            <li>
              <strong>Paystack:</strong> Optimized for Nigeria, Ghana and other African markets with
              strong local card and bank transfer support.
            </li>
            <li>
              <strong>Flutterwave:</strong> Wide pan‑African coverage with cards, bank transfers and
              mobile money options.
            </li>
            <li>
              <strong>M‑Pesa (via Flutterwave and Paystack):</strong> Mobile money support for fans
              who prefer to pay from their phones without cards.
            </li>
          </ul>
          <p>
            We never store raw card or M‑Pesa credentials on our own servers. Payments are handled
            by PCI‑certified third‑party processors and are protected using industry‑standard
            encryption.
          </p>
        </section>

        <section aria-labelledby="team-heading">
          <h2 id="team-heading">Team</h2>
          <p>
            Africa Patreon is built by a small team of engineers, designers and operators with
            experience across African fintech, creator tools and developer platforms. We&apos;re
            remote‑first but anchored on the continent, working closely with creators and payment
            partners in East, West and Southern Africa.
          </p>
          <p>
            We consult with creators across different verticals – music, tech, gaming, education,
            activism, comedy and more – to continuously refine our roadmap and ensure the product
            works in real African conditions, not just slide decks.
          </p>
        </section>

        <section aria-labelledby="vision-heading">
          <h2 id="vision-heading">Our vision</h2>
          <p>
            We believe the next decade of the creator economy will be written in Africa. Our vision
            is a continent where a talented videographer in Mombasa or a developer in Lagos can earn
            globally competitive income without leaving home.
          </p>
          <p>
            Africa Patreon is one building block in that future – a safe, compliant and reliable
            earning layer that respects both creators and fans. We will keep investing in better
            payouts, smarter fraud defenses, fairer fees and tools that help creators build real
            businesses, not just chase virality.
          </p>
          <p>
            If you&apos;re a creator, fan or partner who wants to help shape this future, we&apos;d
            love to hear from you.
          </p>
        </section>
      </PageContent>
    </>
  )
}


