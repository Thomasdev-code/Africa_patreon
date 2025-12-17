import type { Metadata } from "next"
import { LegalPageLayout } from "@/components/legal/LegalPageLayout"
import { LegalSection } from "@/components/legal/LegalSection"
import { generateMetadata as genMeta } from "@/lib/seo"

export const metadata: Metadata = genMeta({
  title: "Impressum (Legal Notice)",
  description: "Legal information and company details for Africa Patreon as required by EU law.",
  url: "/legal/impressum",
})

export default function ImpressumPage() {
  return (
    <LegalPageLayout
      title="Impressum (Legal Notice)"
      subtitle="Legal information and company details as required by EU regulations."
    >
      <LegalSection id="company-info" heading="Company Information">
        <p>
          <strong>Company Name:</strong> Africa Patreon
        </p>
        <p>
          <strong>Legal Form:</strong> [Your legal entity type - e.g., Limited Company, LLC, etc.]
        </p>
        <p>
          <strong>Registered Address:</strong> [Your registered business address]
        </p>
        <p>
          <strong>Registration Number:</strong> [Your company registration number]
        </p>
        <p>
          <strong>Tax ID:</strong> [Your tax identification number]
        </p>
      </LegalSection>

      <LegalSection id="contact" heading="Contact Information">
        <p>
          <strong>Email:</strong> legal@africapatreon.com
        </p>
        <p>
          <strong>Support:</strong> support@africapatreon.com
        </p>
        <p>
          <strong>Website:</strong>{" "}
          <a href="/" className="text-blue-600 hover:text-blue-700">
            {process.env.NEXT_PUBLIC_APP_URL || "https://africapatreon.com"}
          </a>
        </p>
      </LegalSection>

      <LegalSection id="responsible" heading="Responsible for Content">
        <p>
          <strong>Managing Director/CEO:</strong> [Name]
        </p>
        <p>
          <strong>Content Responsibility:</strong> Africa Patreon is responsible for platform
          infrastructure and operations. Individual creators are responsible for the content they
          publish.
        </p>
      </LegalSection>

      <LegalSection id="regulatory" heading="Regulatory Information">
        <p>
          <strong>Supervisory Authority:</strong> [Relevant regulatory body if applicable]
        </p>
        <p>
          <strong>Professional Association:</strong> [If applicable]
        </p>
        <p>
          <strong>VAT Number:</strong> [If applicable for EU operations]
        </p>
      </LegalSection>

      <LegalSection id="dispute-resolution" heading="Dispute Resolution">
        <p>
          The European Commission provides a platform for online dispute resolution (ODR) at{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700"
          >
            https://ec.europa.eu/consumers/odr
          </a>
          .
        </p>
        <p>
          We are not obligated to participate in dispute resolution proceedings before a consumer
          arbitration board.
        </p>
      </LegalSection>

      <LegalSection id="liability" heading="Liability Disclaimer">
        <p>
          Africa Patreon is not liable for content created by third-party creators. We are
          responsible only for our own content and platform infrastructure.
        </p>
        <p>
          Links to external websites are provided for convenience. We are not responsible for the
          content of external sites.
        </p>
      </LegalSection>

      <LegalSection id="updates" heading="Updates">
        <p className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Note: This Impressum is provided as a template. Please update with your actual company
          information, registration details, and contact information to comply with applicable EU
          regulations.
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}

