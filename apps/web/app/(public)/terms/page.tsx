import type { Metadata } from "next";
import Link from "next/link";
import { AryaAvatar } from "@/components/arya/AryaAvatar";
import {
  FileText,
  CreditCard,
  RefreshCw,
  ShieldAlert,
  Ban,
  Scale,
  Mail,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | AryaSDR",
  description:
    "Terms governing your use of AryaSDR — subscriptions, billing, refund policy, acceptable use, and limitations of liability.",
};

const SECTIONS = [
  { id: "acceptance", label: "Acceptance of Terms" },
  { id: "account", label: "Your Account" },
  { id: "acceptable-use", label: "Acceptable Use" },
  { id: "subscription", label: "Subscription & Billing" },
  { id: "refunds", label: "Refund Policy" },
  { id: "cancellation", label: "Cancellation" },
  { id: "ip", label: "Intellectual Property" },
  { id: "third-parties", label: "Third-Party Services" },
  { id: "warranty", label: "Warranty Disclaimer" },
  { id: "liability", label: "Limitation of Liability" },
  { id: "termination", label: "Termination" },
  { id: "law", label: "Governing Law" },
  { id: "changes", label: "Changes to Terms" },
  { id: "contact", label: "Contact" },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <AryaAvatar size="sm" />
          <span className="font-semibold text-gray-900">AryaSDR</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Privacy
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
            <FileText className="h-3.5 w-3.5" />
            Legal terms — please read carefully
          </div>
          <h1 className="text-4xl font-bold text-[#111827] tracking-tight">
            Terms of Service
          </h1>
          <p className="text-gray-500 mt-3 max-w-2xl">
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to
            and use of the AryaSDR platform, website, APIs, and related
            services (collectively, the &ldquo;Service&rdquo;), provided by
            AryaSDR (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;).
            By creating an account or using the Service, you agree to be bound
            by these Terms.
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
          <div id="acceptance" className="scroll-mt-8">
            <h2 className="text-xl font-bold text-[#111827]">
              1. Acceptance of Terms
            </h2>
            <p>
              By registering for an AryaSDR account, accessing the Service, or
              clicking any &ldquo;I agree&rdquo; button, you represent that
              (a) you are at least 18 years old, (b) you have the authority to
              enter into these Terms on your own behalf or on behalf of the
              organization you represent, and (c) you have read, understood,
              and agree to be bound by these Terms and our{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </div>

          <div id="account" className="scroll-mt-8 mt-10">
            <h2 className="text-xl font-bold text-[#111827]">2. Your Account</h2>
            <p>
              You must provide accurate, current, and complete information
              during registration. You are responsible for keeping your login
              credentials secure and for all activity that occurs under your
              account. Notify us immediately at{" "}
              <a href="mailto:security@aryasdr.in">security@aryasdr.in</a> if
              you suspect unauthorized use.
            </p>
            <p>
              We use Clerk for authentication and reserve the right to require
              two-factor authentication for administrative or high-value
              actions.
            </p>
          </div>

          <div id="acceptable-use" className="scroll-mt-8 mt-10">
            <div className="flex items-center gap-2 not-prose mb-3">
              <Ban className="h-5 w-5 text-[#6C47FF]" />
              <h2 className="text-xl font-bold text-[#111827]">
                3. Acceptable Use
              </h2>
            </div>
            <p>
              AryaSDR is a professional B2B sales-outreach platform. You agree
              to use the Service only for legitimate business purposes and in
              compliance with all applicable laws, including:
            </p>
            <ul>
              <li>
                <strong>Anti-spam laws</strong> — CAN-SPAM (US), CASL (Canada),
                GDPR (EU/UK), DPDP Act 2023 (India), and any other law
                governing electronic communications in the jurisdictions where
                your recipients reside.
              </li>
              <li>
                <strong>Consent & unsubscribe.</strong> You must have a
                lawful basis for contacting each recipient and must honor
                unsubscribe requests within 10 business days.
              </li>
              <li>
                <strong>Content standards.</strong> No unlawful, deceptive,
                harassing, threatening, defamatory, or fraudulent content;
                no phishing, malware, or impersonation.
              </li>
              <li>
                <strong>System integrity.</strong> No attempts to bypass rate
                limits, reverse-engineer the platform, scrape the site
                automatically, or interfere with other users&apos; access.
              </li>
              <li>
                <strong>No prohibited industries.</strong> Adult content,
                gambling, cryptocurrency scams, unregulated financial
                products, illegal drugs, and multi-level marketing schemes
                are not permitted.
              </li>
            </ul>
            <p>
              We may suspend or terminate accounts that violate this section,
              with or without notice, and may cooperate with law enforcement
              where appropriate.
            </p>
          </div>

          <div id="subscription" className="scroll-mt-8 mt-10">
            <div className="flex items-center gap-2 not-prose mb-3">
              <CreditCard className="h-5 w-5 text-[#6C47FF]" />
              <h2 className="text-xl font-bold text-[#111827]">
                4. Subscription & Billing
              </h2>
            </div>
            <p>
              <strong>Plans.</strong> AryaSDR is offered on subscription plans
              (Starter, Growth, Enterprise) billed monthly or annually. Plan
              features, credit limits, and prices are listed on our{" "}
              <Link href="/pricing">pricing page</Link>.
            </p>
            <p>
              <strong>Free trial.</strong> New accounts receive a 14-day free
              trial with 10,000 lead credits. No credit card is required to
              start the trial.
            </p>
            <p>
              <strong>Currency & taxes.</strong> All prices are in Indian
              Rupees (INR) and exclusive of applicable GST (currently 18%),
              which will be added at checkout.
            </p>
            <p>
              <strong>Payments.</strong> Payments are processed by Razorpay,
              a PCI-DSS Level 1 payment gateway. We do not store your card,
              netbanking, or account details.
            </p>
            <p>
              <strong>Auto-renewal.</strong> Subscriptions renew automatically
              at the end of each billing cycle at the then-current price. You
              can cancel at any time before renewal via Settings →
              Billing.
            </p>
            <p>
              <strong>Failed payments.</strong> If a payment fails, we will
              retry for up to 7 days. If payment cannot be collected, your
              account will be downgraded to the free tier and paid features
              will be paused until payment is completed.
            </p>
            <p>
              <strong>Price changes.</strong> We may change prices with at
              least 30 days&apos; notice, effective at your next renewal.
            </p>
          </div>

          <div id="refunds" className="scroll-mt-8 mt-10">
            <div className="flex items-center gap-2 not-prose mb-3">
              <RefreshCw className="h-5 w-5 text-[#6C47FF]" />
              <h2 className="text-xl font-bold text-[#111827]">
                5. Refund Policy
              </h2>
            </div>
            <p>
              <strong>7-day money-back guarantee.</strong> If you are not
              satisfied with a first-time paid subscription, you may request a
              full refund within 7 days of your first payment by emailing{" "}
              <a href="mailto:billing@aryasdr.in">billing@aryasdr.in</a>. No
              questions asked.
            </p>
            <p>
              <strong>Pro-rated refunds.</strong> After the 7-day window,
              subscription fees are non-refundable. Downgrades and
              cancellations take effect at the end of the current billing
              cycle; you retain access to paid features until then.
            </p>
            <p>
              <strong>One-time purchases.</strong> Lead credits, dialer seats,
              additional mailboxes, and other add-ons are non-refundable once
              consumed. Unused add-ons may be refunded on a case-by-case basis
              within 7 days of purchase.
            </p>
            <p>
              <strong>Chargebacks.</strong> Please contact us before initiating
              a chargeback so we can resolve the issue directly. Accounts with
              unresolved chargebacks may be suspended.
            </p>
            <p>
              <strong>Processing time.</strong> Approved refunds are returned
              to the original payment method within 5–10 business days.
            </p>
          </div>

          <div id="cancellation" className="scroll-mt-8 mt-10">
            <h2 className="text-xl font-bold text-[#111827]">
              6. Cancellation
            </h2>
            <p>
              You may cancel your subscription at any time from Settings →
              Billing. Cancellation takes effect at the end of your current
              billing cycle and you will not be charged again. You may
              re-activate at any time.
            </p>
            <p>
              To delete your account and all associated data permanently,
              email{" "}
              <a href="mailto:privacy@aryasdr.in">privacy@aryasdr.in</a>. Data
              deletion is completed within 30 days of your request, subject to
              the retention windows described in our{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </div>

          <div id="ip" className="scroll-mt-8 mt-10">
            <h2 className="text-xl font-bold text-[#111827]">
              7. Intellectual Property
            </h2>
            <p>
              <strong>Our IP.</strong> The AryaSDR platform, brand, logos, UI,
              and underlying software are owned by us or our licensors and are
              protected by copyright, trademark, and other intellectual
              property laws. We grant you a limited, non-exclusive,
              non-transferable license to use the Service for your internal
              business purposes for the duration of your subscription.
            </p>
            <p>
              <strong>Your data.</strong> You retain all rights to the
              customer data, lead lists, campaign content, and outreach
              messages you upload or generate through the Service. You grant
              us a limited license to process this data solely to provide the
              Service to you.
            </p>
            <p>
              <strong>AI-generated content.</strong> Outreach drafts and other
              content generated by Arya are provided for your use. You are
              responsible for reviewing them before sending and for the
              content of any message ultimately sent from your account.
            </p>
          </div>

          <div id="third-parties" className="scroll-mt-8 mt-10">
            <h2 className="text-xl font-bold text-[#111827]">
              8. Third-Party Services
            </h2>
            <p>
              The Service integrates with third-party services (Gmail, Google
              Calendar, LinkedIn, WhatsApp Business, HubSpot, Slack,
              Razorpay, Anthropic, Clerk, and others). Your use of those
              services is subject to their own terms and privacy policies.
              We are not responsible for the availability, accuracy, or
              behavior of third-party services, and their downtime or policy
              changes may affect features of AryaSDR.
            </p>
          </div>

          <div id="warranty" className="scroll-mt-8 mt-10">
            <div className="flex items-center gap-2 not-prose mb-3">
              <ShieldAlert className="h-5 w-5 text-[#6C47FF]" />
              <h2 className="text-xl font-bold text-[#111827]">
                9. Warranty Disclaimer
              </h2>
            </div>
            <p>
              The Service is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS
              AVAILABLE&rdquo; basis, without warranties of any kind, whether
              express or implied, including but not limited to warranties of
              merchantability, fitness for a particular purpose,
              non-infringement, or that the Service will meet your
              requirements, operate uninterrupted, be error-free, or produce
              specific business outcomes (such as a guaranteed number of
              replies, meetings, or revenue).
            </p>
            <p>
              You acknowledge that AI-generated outreach content may contain
              inaccuracies and that you are responsible for reviewing content
              before sending.
            </p>
          </div>

          <div id="liability" className="scroll-mt-8 mt-10">
            <h2 className="text-xl font-bold text-[#111827]">
              10. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, in no event
              shall AryaSDR, its affiliates, officers, employees, or agents
              be liable for any indirect, incidental, special, consequential,
              or punitive damages, including loss of profits, revenue, data,
              goodwill, or business opportunity, arising out of or in
              connection with your use of the Service, even if we have been
              advised of the possibility of such damages.
            </p>
            <p>
              Our aggregate liability for any claims arising out of these
              Terms or the Service, whether in contract, tort (including
              negligence), or otherwise, shall not exceed the greater of
              (a) the amount you paid to us in the 12 months preceding the
              event giving rise to the claim, or (b) INR 10,000.
            </p>
          </div>

          <div id="termination" className="scroll-mt-8 mt-10">
            <h2 className="text-xl font-bold text-[#111827]">
              11. Termination
            </h2>
            <p>
              We may suspend or terminate your access to the Service, with or
              without notice, if you materially breach these Terms, engage in
              activity that risks harm to us or other users, or fail to pay
              amounts owed. On termination, your right to use the Service
              ends immediately. Sections that by their nature should survive
              termination (Intellectual Property, Warranty Disclaimer,
              Limitation of Liability, Governing Law) will continue to apply.
            </p>
          </div>

          <div id="law" className="scroll-mt-8 mt-10">
            <div className="flex items-center gap-2 not-prose mb-3">
              <Scale className="h-5 w-5 text-[#6C47FF]" />
              <h2 className="text-xl font-bold text-[#111827]">
                12. Governing Law
              </h2>
            </div>
            <p>
              These Terms are governed by the laws of the Republic of India.
              Any dispute arising out of or in connection with these Terms
              shall be subject to the exclusive jurisdiction of the courts at
              Bengaluru, Karnataka, India.
            </p>
          </div>

          <div id="changes" className="scroll-mt-8 mt-10">
            <h2 className="text-xl font-bold text-[#111827]">
              13. Changes to Terms
            </h2>
            <p>
              We may update these Terms from time to time. Material changes
              will be notified in-app or by email at least 30 days before they
              take effect. Continued use of the Service after the effective
              date constitutes acceptance of the updated Terms.
            </p>
          </div>

          <div id="contact" className="scroll-mt-8 mt-10">
            <div className="flex items-center gap-2 not-prose mb-3">
              <Mail className="h-5 w-5 text-[#6C47FF]" />
              <h2 className="text-xl font-bold text-[#111827]">
                14. Contact
              </h2>
            </div>
            <p>
              Questions about these Terms? Email{" "}
              <a href="mailto:legal@aryasdr.in">legal@aryasdr.in</a> for legal
              matters or{" "}
              <a href="mailto:support@aryasdr.in">support@aryasdr.in</a> for
              general support.
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
