import type { Metadata } from "next"
import { PageHeader } from "@/components/PageHeader"
import { PageContent } from "@/components/PageContent"

export const metadata: Metadata = {
  title: "Community Guidelines | Africa Patreon",
  description:
    "Read the Africa Patreon Community Guidelines covering allowed content, harassment, adult content, hate speech, extremism and safety rules.",
}

export default function CommunityGuidelinesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Safety"
        title="Community Guidelines"
        subtitle="These guidelines explain what is and is not allowed on Africa Patreon for both creators and fans, so that we can maintain a safe and respectful community."
      />
      <PageContent>
        <section aria-labelledby="overview-heading">
          <h2 id="overview-heading">1. Overview</h2>
          <p>
            Africa Patreon connects creators and fans across different cultures, languages and
            backgrounds. To keep the community healthy, everyone must follow these guidelines in
            addition to our Terms of Service and Anti‑Scam &amp; Fraud Rules.
          </p>
        </section>

        <section aria-labelledby="allowed-heading">
          <h2 id="allowed-heading">2. Allowed content &amp; behavior</h2>
          <p>We welcome a wide range of creative and educational work, including:</p>
          <ul>
            <li>Art, music, podcasts, comedy, gaming and storytelling.</li>
            <li>Software, tutorials, learning communities and workshops.</li>
            <li>Social commentary and activism that does not promote hate or violence.</li>
            <li>Adult‑oriented discussions that comply with our adult content rules.</li>
          </ul>
          <p>
            Fans and creators are expected to engage respectfully, even when they disagree, and to
            use the Platform features in good faith.
          </p>
        </section>

        <section aria-labelledby="disallowed-heading">
          <h2 id="disallowed-heading">3. Disallowed content</h2>
          <p>You may not use Africa Patreon to publish or fund:</p>
          <ul>
            <li>
              Content that promotes or glorifies violence, terrorism, organized crime or property
              damage.
            </li>
            <li>
              Hate speech targeting individuals or groups based on race, ethnicity, nationality,
              religion, gender, sexual orientation, disability or other protected characteristics.
            </li>
            <li>
              Content that encourages self‑harm, suicide, dangerous challenges or medical
              misinformation that could cause real‑world harm.
            </li>
            <li>
              Non‑consensual intimate content, revenge porn, or doxxing (sharing private personal
              information without consent).
            </li>
          </ul>
        </section>

        <section aria-labelledby="harassment-heading">
          <h2 id="harassment-heading">4. Harassment &amp; abuse</h2>
          <p>
            Africa Patreon has zero tolerance for targeted harassment, bullying or sustained abuse.
            This includes:
          </p>
          <ul>
            <li>Insults or slurs aimed at private individuals or vulnerable groups.</li>
            <li>Coordinated campaigns to shame, threaten or silence others.</li>
            <li>Stalking, intimidation or implicit threats of violence.</li>
          </ul>
          <p>
            We may remove content, restrict accounts or involve law‑enforcement where there are
            credible threats to a person&apos;s safety.
          </p>
        </section>

        <section aria-labelledby="adult-heading">
          <h2 id="adult-heading">5. Adult content &amp; age‑restricted material</h2>
          <p>
            Some creators may share adult or NSFW material. Where permitted by law and by our
            payment partners, such content must:
          </p>
          <ul>
            <li>Be clearly marked as adult‑only and hidden from minors.</li>
            <li>Involve consenting adults who are fully aware of the distribution terms.</li>
            <li>
              Not depict minors, suggest minors, or combine adult themes with under‑18 characters or
              scenarios.
            </li>
            <li>
              Not promote exploitation, trafficking, non‑consensual acts or extreme violence.
            </li>
          </ul>
          <p>
            We reserve the right to limit adult content to specific regions or remove it entirely if
            required by law or payment partners.
          </p>
        </section>

        <section aria-labelledby="extremism-heading">
          <h2 id="extremism-heading">6. Hate speech, extremism &amp; dangerous acts</h2>
          <p>Creators and fans may not use the Platform to:</p>
          <ul>
            <li>Advocate for extremist groups or ideologies that promote violence or hatred.</li>
            <li>Fundraise for weapons, militias or activities that could lead to physical harm.</li>
            <li>Share detailed instructions for committing illegal or dangerous acts.</li>
          </ul>
        </section>

        <section aria-labelledby="respect-heading">
          <h2 id="respect-heading">7. Respectful behavior for creators &amp; fans</h2>
          <p>We expect everyone using Africa Patreon to:</p>
          <ul>
            <li>Engage in good faith, even when providing criticism or feedback.</li>
            <li>Respect boundaries, consent and privacy.</li>
            <li>Use reporting tools instead of harassment when you see a problem.</li>
          </ul>
        </section>

        <section aria-labelledby="penalties-heading">
          <h2 id="penalties-heading">8. Penalties for violations</h2>
          <p>
            Violations of these Community Guidelines may result in a range of enforcement actions,
            including:
          </p>
          <ul>
            <li>Content removal or age‑restriction.</li>
            <li>Temporary or permanent account suspension.</li>
            <li>Loss of monetization and payout privileges.</li>
            <li>Reporting to payment partners or relevant authorities when required.</li>
          </ul>
          <p>
            We aim to be fair and transparent, but our priority is protecting users and the
            integrity of the Platform.
          </p>
        </section>
      </PageContent>
    </>
  )
}


