import type { Metadata } from "next";
import Link from "next/link";
import { AryaAvatar } from "@/components/arya/AryaAvatar";
import { Shield, Database, Lock, Users, Cookie, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | AryaSDR",
  description:
    "How AryaSDR collects, uses, and protects your data. India DPDP Act 2023 and GDPR compliant.",
};

const SECTIONS = [
  { id: "info-we-collect", label: "Information We Collect" },
  { id: "how-we-use", label: "How We Use Your Data" },
  { id: "third-parties", label: "Third-Party Services" },
  { id: "storage-security", label: "Storage & Security" },
  { id: "your-rights", label: "Your Rights" },
  { id: "cookies", label: "Cookies & Tracking" },
  { id: "children", label: "Children's Privacy" },
  { id: "changes", label: "Changes to This Policy" },
  { id: "contact", label: "Contact Us" },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <AryaAvatar size="sm" />
          <span className="font-semibold text-gray-900">AryaSDR</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/terms" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Terms
          </Link>
          <Link href="/contact" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Contact
          </Link>
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            ← Back to home
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-[#6C47FF] mb-4">
            <Shield className="h-3.5 w-3.5" />
            DPDP Act 2023 & GDPR compliant
          </div>
          <h1 className="text-4xl font-bold text-[#111827] tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-gray-500 mt-3 max-w-2xl">
            AryaSDR (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is
            operated in India. This Privacy Policy explains what personal data
            we collect from you when you use our AI sales development platform,
            how we use it, who we share it with, and the rights you have over it.
          </p>
          <p className="text-xs text-gray-400 mt-4">
            Last updated: 10 July 2026 &middot; Effective: 10 July 2026
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-5xl px-6 py-12 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        {/* TOC */}
        <aside className="hidden lg:block">
          <div className="sticky top-8">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              On this page
            </p>
            <ul className="space-y-1.5">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="block text-sm text-gray-600 hover:text-[#6C47FF] transition-colors py-1"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Content */}
        <article className="prose prose-gray max-w-none prose-headings:text-[#111827] prose-p:text-gray-600 prose-p:leading-relaxed prose-a:text-[#6C47FF] prose-strong:text-[#111827]">
          {/* Section 1 */}
          <div id="info-we-collect" className="scroll-mt-8">
            <div className="flex items-center gap-2 not-prose mb-3">
              <Database className="h-5 w-5 text-[#6C47FF]" />
              <h2 className="text-xl font-bold text-[#111827]">
                1. Information We Collect
              </h2>
            </div>
            <p>
              We collect only the information required to provide, maintain,
              secure, and improve AryaSDR. The categories are:
            </p>
            <p><strong>Account information.</strong> Your name, work email
              address, company name, and role. This is collected when you sign
              up through Clerk (our authentication provider).
            </p>
            <p><strong>Campaign & lead data.</strong> Lead lists you upload or
              generate, prospect information, email templates, sequence
              configurations, and campaign performance metrics.
            </p>
            <p><strong>Outreach content.</strong> The emails, LinkedIn
              messages, and WhatsApp messages that Arya drafts and sends on your
              behalf, plus replies received in response.
            </p>
            <p><strong>Integration data.</strong> When you connect Gmail,
              Google Calendar, LinkedIn, WhatsApp Business, or your CRM, we
              store OAuth access tokens and the metadata needed to sync emails
              and calendar events.
            </p>
            <p><strong>Usage & device data.</strong> IP address, browser type,
              operating system, referrer URL, pages visited, and timestamps.
              Collected via standard server logs and privacy-respecting
              analytics.
            </p>
            <p><strong>Payment metadata.</strong> Plan tier, subscription
              status, transaction ids. Actual card numbers and UPI IDs are
              never seen or stored by us; they are handled directly by
              Razorpay (see Section 3).
            </p>
          </div>

          {/* Section 2 */}
          <div id="how-we-use" className="scroll-mt-8 mt-10">
            <div className="flex items-center gap-2 not-prose mb-3">
              <Users className="h-5 w-5 text-[#6C47FF]" />
              <h2 className="text-xl font-bold text-[#111827]">
                2. How We Use Your Data
              </h2>
            </div>
            <ul>
              <li>To operate the platform: running your campaigns,
                sending outreach, syncing replies, generating analytics.</li>
              <li>To generate AI-drafted outreach content using models from
                Anthropic (Claude). Only the minimum context required for a
                given draft is sent to the model.</li>
              <li>To secure your account: detecting suspicious login
                activity, rate-limiting abuse, preventing fraud.</li>
              <li>To bill you and process payments through Razorpay.</li>
              <li>To communicate with you about product updates, billing
                events, and security notifications. You can opt out of
                non-essential emails at any time from Settings → Notifications.</li>
              <li>To comply with our legal obligations under Indian law and
                other applicable jurisdictions.</li>
            </ul>
            <p>
              <strong>We do not sell your personal data.</strong> We do not
              share your data with advertisers, data brokers, or marketing
              networks.
            </p>
          </div>

          {/* Section 3 */}
          <div id="third-parties" className="scroll-mt-8 mt-10">
            <div className="flex items-center gap-2 not-prose mb-3">
              <Lock className="h-5 w-5 text-[#6C47FF]" />
              <h2 className="text-xl font-bold text-[#111827]">
                3. Third-Party Services
              </h2>
            </div>
            <p>
              AryaSDR is powered by a small number of trusted sub-processors.
              Each has been chosen for its security posture and DPA / GDPR
              compliance. The list may change; the current list is:
            </p>
            <div className="not-prose overflow-x-auto -mx-2">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Provider</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Purpose</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Data</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-3 font-medium text-[#111827]">Clerk</td>
                    <td className="py-2 px-3">Authentication & session management</td>
                    <td className="py-2 px-3">Name, email, sign-in metadata</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-3 font-medium text-[#111827]">Neon</td>
                    <td className="py-2 px-3">Postgres database hosting</td>
                    <td className="py-2 px-3">All application data (encrypted at rest)</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-3 font-medium text-[#111827]">Vercel</td>
                    <td className="py-2 px-3">Application hosting & edge network</td>
                    <td className="py-2 px-3">Request logs, IP addresses</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-3 font-medium text-[#111827]">Anthropic (Claude)</td>
                    <td className="py-2 px-3">Generative AI for outreach drafting</td>
                    <td className="py-2 px-3">Draft prompts (no training on your data)</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-3 font-medium text-[#111827]">Google (Gmail, Calendar)</td>
                    <td className="py-2 px-3">Email sending & calendar sync (only if connected)</td>
                    <td className="py-2 px-3">OAuth tokens, message metadata</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 px-3 font-medium text-[#111827]">Razorpay</td>
                    <td className="py-2 px-3">Payment processing (PCI-DSS Level 1)</td>
                    <td className="py-2 px-3">Card / netbanking details (never touch our servers)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-[#111827]">Upstash</td>
                    <td className="py-2 px-3">Redis rate limiting & caching</td>
                    <td className="py-2 px-3">API request counters, ephemeral session keys</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4 */}
          <div id="storage-security" className="scroll-mt-8 mt-10">
            <div className="flex items-center gap-2 not-prose mb-3">
              <Lock className="h-5 w-5 text-[#6C47FF]" />
              <h2 className="text-xl font-bold text-[#111827]">
                4. Storage & Security
              </h2>
            </div>
            <p>
              Application data is stored in a managed Postgres database
              (Neon), primarily in the AWS ap-south-1 region (Mumbai). Data is
              encrypted at rest (AES-256) and in transit (TLS 1.2+). OAuth
              tokens and any secrets are encrypted at the field level.
            </p>
            <p>
              Access to production data is limited to authorized engineers,
              secured with SSO + hardware key MFA, and audit-logged.
            </p>
            <p>
              We retain personal data only as long as your account is active,
              plus a short window (up to 90 days) after account deletion to
              satisfy accounting and legal obligations. Backups are retained
              for up to 30 days.
            </p>
          </div>

          {/* Section 5 */}
          <div id="your-rights" className="scroll-mt-8 mt-10">
            <div className="flex items-center gap-2 not-prose mb-3">
              <Shield className="h-5 w-5 text-[#6C47FF]" />
              <h2 className="text-xl font-bold text-[#111827]">
                5. Your Rights
              </h2>
            </div>
            <p>
              Under the Digital Personal Data Protection Act 2023 (India) and
              the GDPR (EU / UK), you have the following rights over your
              personal data:
            </p>
            <ul>
              <li><strong>Access</strong>: request a copy of the data we hold about you.</li>
              <li><strong>Correction</strong>: ask us to fix inaccurate or incomplete data.</li>
              <li><strong>Deletion</strong>: request permanent deletion of your account and data.</li>
              <li><strong>Portability</strong>: receive your data in a common, machine-readable format.</li>
              <li><strong>Withdraw consent</strong>: for any processing that relies on consent (e.g. integrations).</li>
              <li><strong>Complain</strong>: file a complaint with the Data Protection Board of India or your local supervisory authority.</li>
            </ul>
            <p>
              To exercise any of these rights, email{" "}
              <a href="mailto:privacy@aryasdr.in">privacy@aryasdr.in</a>. We
              respond within 30 days.
            </p>
          </div>

          {/* Section 6 */}
          <div id="cookies" className="scroll-mt-8 mt-10">
            <div className="flex items-center gap-2 not-prose mb-3">
              <Cookie className="h-5 w-5 text-[#6C47FF]" />
              <h2 className="text-xl font-bold text-[#111827]">
                6. Cookies & Tracking
              </h2>
            </div>
            <p>
              We use a minimal set of first-party cookies for authentication
              (session tokens set by Clerk) and CSRF protection. We do not use
              third-party advertising or retargeting cookies.
            </p>
            <p>
              You can block cookies via your browser settings, but doing so
              will prevent you from staying signed in to the app.
            </p>
          </div>

          {/* Section 7 */}
          <div id="children" className="scroll-mt-8 mt-10">
            <h2 className="text-xl font-bold text-[#111827]">
              7. Children&apos;s Privacy
            </h2>
            <p>
              AryaSDR is a business-to-business product and is not intended
              for anyone under 18. We do not knowingly collect personal data
              from children. If you believe a child has provided us with
              information, contact us and we will delete it.
            </p>
          </div>

          {/* Section 8 */}
          <div id="changes" className="scroll-mt-8 mt-10">
            <h2 className="text-xl font-bold text-[#111827]">
              8. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time as our
              product evolves and as regulations change. Material changes will
              be notified in-app or by email at least 30 days before they take
              effect. The &ldquo;Last updated&rdquo; date at the top always
              reflects the current version.
            </p>
          </div>

          {/* Section 9 */}
          <div id="contact" className="scroll-mt-8 mt-10">
            <div className="flex items-center gap-2 not-prose mb-3">
              <Mail className="h-5 w-5 text-[#6C47FF]" />
              <h2 className="text-xl font-bold text-[#111827]">
                9. Contact Us
              </h2>
            </div>
            <p>
              Questions about this policy, or want to exercise your data
              rights? Email us at{" "}
              <a href="mailto:privacy@aryasdr.in">privacy@aryasdr.in</a>{" "}
              or{" "}
              <a href="mailto:support@aryasdr.in">support@aryasdr.in</a> for
              general support.
            </p>
            <p>
              Grievance Officer (as required under Indian law):{" "}
              <a href="mailto:grievance@aryasdr.in">grievance@aryasdr.in</a>.
            </p>
          </div>
        </article>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} AryaSDR. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
            <Link href="/contact" className="hover:text-gray-900 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
