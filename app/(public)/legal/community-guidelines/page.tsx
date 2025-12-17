import type { Metadata } from "next"
import { LegalPageLayout } from "@/components/legal/LegalPageLayout"
import { LegalSection } from "@/components/legal/LegalSection"
import { LegalList } from "@/components/legal/LegalList"
import { generateMetadata as genMeta } from "@/lib/seo"

export const metadata: Metadata = genMeta({
  title: "Community Guidelines",
  description:
    "Read Africa Patreon's Community Guidelines covering allowed content, harassment policies, adult content rules, and penalties for violations.",
  url: "/legal/community-guidelines",
})

export default function CommunityGuidelinesPage() {
  return (
    <LegalPageLayout
      title="Community Guidelines"
      subtitle="These guidelines help ensure Africa Patreon remains a safe, respectful, and creative space for creators and fans."
    >
      <LegalSection id="overview" heading="1. Overview">
        <p>
          Africa Patreon is a platform for creators and fans to connect through subscriptions and
          exclusive content. We expect all users to treat each other with respect and follow these
          guidelines. Violations may result in warnings, content removal, or account suspension.
        </p>
      </LegalSection>

      <LegalSection id="allowed-content" heading="2. Allowed Content">
        <p>Creators may publish content including:</p>
        <LegalList
          items={[
            "Original creative works (art, music, writing, videos, etc.)",
            "Educational content and tutorials",
            "Behind-the-scenes content and exclusive updates",
            "Community discussions and Q&A sessions",
            "Digital products and downloads",
            "Live streams and interactive content",
          ]}
        />
      </LegalSection>

      <LegalSection id="prohibited-content" heading="3. Prohibited Content">
        <p>The following content is not allowed:</p>
        <LegalList
          items={[
            "Illegal content or content promoting illegal activities",
            "Hate speech, discrimination, or harassment based on race, religion, gender, sexual orientation, or other protected characteristics",
            "Extremist content promoting violence or terrorism",
            "Non-consensual intimate images or revenge porn",
            "Content that exploits or harms minors",
            "Misleading or fraudulent content",
            "Spam, scams, or phishing attempts",
          ]}
        />
      </LegalSection>

      <LegalSection id="harassment" heading="4. Harassment Policy">
        <p>
          We have zero tolerance for harassment, bullying, or threats. Prohibited behavior includes:
        </p>
        <LegalList
          items={[
            "Personal attacks, insults, or name-calling",
            "Threats of violence or harm",
            "Doxxing (sharing private personal information)",
            "Stalking or persistent unwanted contact",
            "Sexual harassment or unwanted sexual advances",
            "Coordinated harassment campaigns",
          ]}
        />
        <p>
          If you experience harassment, report it immediately through our{" "}
          <a href="/contact" className="text-blue-600 hover:text-blue-700">
            support page
          </a>
          . We take all reports seriously and will investigate promptly.
        </p>
      </LegalSection>

      <LegalSection id="adult-content" heading="5. Adult Content">
        <p>
          Adult content is allowed but must:
        </p>
        <LegalList
          items={[
            "Be clearly marked as adult content",
            "Require age verification (18+)",
            "Comply with all applicable laws",
            "Not involve non-consensual acts or exploitation",
            "Not depict minors or appear to depict minors",
          ]}
        />
        <p>
          Creators offering adult content must comply with payment processor policies and may be
          subject to additional verification requirements.
        </p>
      </LegalSection>

      <LegalSection id="respectful-behavior" heading="6. Respectful Behavior">
        <p>All users should:</p>
        <LegalList
          items={[
            "Respect creator boundaries and subscription terms",
            "Provide constructive feedback rather than personal attacks",
            "Respect intellectual property rights",
            "Not spam creators or other users",
            "Follow creator-specific rules and guidelines",
          ]}
        />
      </LegalSection>

      <LegalSection id="enforcement" heading="7. Enforcement and Penalties">
        <p>Violations may result in:</p>
        <LegalList
          items={[
            "Warning and content removal for minor violations",
            "Temporary account suspension for repeated violations",
            "Permanent account ban for severe violations",
            "Legal action for illegal content or activities",
          ]}
        />
        <p>
          We reserve the right to take action at our discretion based on the severity and context
          of violations.
        </p>
      </LegalSection>

      <LegalSection id="reporting" heading="8. Reporting Violations">
        <p>
          To report violations, use our{" "}
          <a href="/contact" className="text-blue-600 hover:text-blue-700">
            support page
          </a>{" "}
          or email safety@africapatreon.com. Include:
        </p>
        <LegalList
          items={[
            "Link to the violating content or user profile",
            "Description of the violation",
            "Screenshots or evidence if applicable",
          ]}
        />
      </LegalSection>

      <LegalSection id="contact" heading="9. Contact Us">
        <p>
          For questions about these guidelines, contact us at{" "}
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

