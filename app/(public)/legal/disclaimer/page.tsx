import type { Metadata } from "next"
import { LegalPageLayout } from "@/components/legal/LegalPageLayout"
import { LegalSection } from "@/components/legal/LegalSection"
import { LegalList } from "@/components/legal/LegalList"
import { generateMetadata as genMeta } from "@/lib/seo"

export const metadata: Metadata = genMeta({
  title: "Disclaimer",
  description: "Legal disclaimers and limitations of liability for Africa Patreon platform.",
  url: "/legal/disclaimer",
})

export default function DisclaimerPage() {
  return (
    <LegalPageLayout
      title="Disclaimer"
      subtitle="Important legal disclaimers regarding the use of Africa Patreon platform."
    >
      <LegalSection id="platform-disclaimer" heading="1. Platform Disclaimer">
        <p>
          Africa Patreon is provided &quot;as is&quot; and &quot;as available&quot; without
          warranties of any kind, either express or implied. We do not guarantee that:
        </p>
        <LegalList
          items={[
            "The platform will be uninterrupted or error-free",
            "All features will be available at all times",
            "The platform will be free from viruses or harmful components",
            "Results from using the platform will meet your expectations",
          ]}
        />
      </LegalSection>

      <LegalSection id="content-disclaimer" heading="2. Content Disclaimer">
        <p>
          Africa Patreon is not responsible for:
        </p>
        <LegalList
          items={[
            "Content created and published by creators",
            "Accuracy, legality, or quality of creator content",
            "Disputes between creators and fans",
            "Services or products offered by creators",
          ]}
        />
        <p>
          Creators are solely responsible for their content and any claims made about their
          services or products.
        </p>
      </LegalSection>

      <LegalSection id="payment-disclaimer" heading="3. Payment Disclaimer">
        <p>
          While we use reputable payment processors, we are not responsible for:
        </p>
        <LegalList
          items={[
            "Payment processing delays or failures by third-party providers",
            "Bank or payment provider policies and restrictions",
            "Currency conversion rates and fees",
            "Tax obligations arising from transactions",
          ]}
        />
      </LegalSection>

      <LegalSection id="liability-limitation" heading="4. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Africa Patreon shall not be liable for:
        </p>
        <LegalList
          items={[
            "Indirect, incidental, or consequential damages",
            "Loss of profits, data, or business opportunities",
            "Damages arising from use or inability to use the platform",
            "Damages from unauthorized access or security breaches",
          ]}
        />
      </LegalSection>

      <LegalSection id="third-party" heading="5. Third-Party Services">
        <p>
          The platform integrates with third-party services including payment processors, cloud
          providers, and analytics tools. We are not responsible for:
        </p>
        <LegalList
          items={[
            "Third-party service availability or performance",
            "Third-party privacy practices or data handling",
            "Third-party terms of service or policies",
            "Disputes with third-party service providers",
          ]}
        />
      </LegalSection>

      <LegalSection id="jurisdiction" heading="6. Jurisdiction">
        <p>
          This disclaimer is governed by the laws of Kenya. Any disputes shall be resolved in
          Kenyan courts.
        </p>
      </LegalSection>

      <LegalSection id="contact" heading="7. Contact Us">
        <p>
          For questions about this disclaimer, contact us at{" "}
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

