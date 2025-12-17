import type { Metadata } from "next"
import { LegalPageLayout } from "@/components/legal/LegalPageLayout"
import { LegalSection } from "@/components/legal/LegalSection"
import { LegalList } from "@/components/legal/LegalList"
import { generateMetadata as genMeta } from "@/lib/seo"

export const metadata: Metadata = genMeta({
  title: "Cookie Policy",
  description: "Learn how Africa Patreon uses cookies and similar technologies to improve your experience.",
  url: "/legal/cookies",
})

export default function CookiesPage() {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      subtitle="This policy explains how Africa Patreon uses cookies and similar technologies on our platform."
    >
      <LegalSection id="what-are-cookies" heading="1. What Are Cookies?">
        <p>
          Cookies are small text files stored on your device when you visit a website. They help
          websites remember your preferences and improve your experience.
        </p>
      </LegalSection>

      <LegalSection id="how-we-use" heading="2. How We Use Cookies">
        <p>We use cookies for:</p>
        <LegalList
          items={[
            "Authentication: Keeping you logged in to your account",
            "Security: Preventing fraud and detecting suspicious activity",
            "Preferences: Remembering your settings and language choices",
            "Analytics: Understanding how users interact with the platform",
            "Performance: Improving page load times and functionality",
          ]}
        />
      </LegalSection>

      <LegalSection id="types" heading="3. Types of Cookies We Use">
        <p>
          <strong>Essential Cookies:</strong> Required for the platform to function. These cannot be
          disabled.
        </p>
        <p>
          <strong>Functional Cookies:</strong> Remember your preferences and settings.
        </p>
        <p>
          <strong>Analytics Cookies:</strong> Help us understand usage patterns and improve the
          platform. We use services like Google Analytics.
        </p>
        <p>
          <strong>Marketing Cookies:</strong> Used to deliver relevant advertisements (if
          applicable).
        </p>
      </LegalSection>

      <LegalSection id="third-party" heading="4. Third-Party Cookies">
        <p>We may use third-party services that set cookies:</p>
        <LegalList
          items={[
            "Google Analytics: Website analytics",
            "Payment processors: Fraud prevention and transaction processing",
            "Customer support tools: Chat and help desk functionality",
          ]}
        />
        <p>
          These services have their own privacy policies and cookie practices.
        </p>
      </LegalSection>

      <LegalSection id="managing" heading="5. Managing Cookies">
        <p>You can control cookies through:</p>
        <LegalList
          items={[
            "Your browser settings: Most browsers allow you to block or delete cookies",
            "Browser extensions: Privacy-focused extensions can block tracking cookies",
            "Platform settings: Some cookie preferences can be managed in your account settings",
          ]}
        />
        <p>
          Note: Disabling essential cookies may affect platform functionality.
        </p>
      </LegalSection>

      <LegalSection id="contact" heading="6. Contact Us">
        <p>
          For questions about our cookie policy, contact us at{" "}
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

