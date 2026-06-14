import { MessageCircle, ExternalLink, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function WhatsAppSetupPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/integrations"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to integrations
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-xl bg-green-400/10 flex items-center justify-center">
          <MessageCircle className="h-7 w-7 text-green-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">WhatsApp Business</h1>
            <span className="rounded-full bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">
              Coming Soon
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Reach Indian leads via WhatsApp Business API (Meta Cloud)
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Prerequisites</h2>
        <p className="text-sm text-muted-foreground">
          WhatsApp Business integration requires a verified Meta Business account
          and a WhatsApp Business phone number approved for the Cloud API.
        </p>
        <ol className="space-y-3 text-sm text-muted-foreground list-none">
          {[
            "Create a Meta Business account at business.facebook.com",
            "Set up a WhatsApp Business account and get a verified phone number",
            "Create a Meta App and enable the WhatsApp product",
            "Generate a permanent access token from the Meta App dashboard",
            "Submit your message templates for Meta approval",
            "Paste your credentials here once this feature launches",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <h2 className="font-semibold text-foreground">Why WhatsApp for Indian outreach?</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {[
            "WhatsApp has 500M+ active users in India with the highest open rates of any channel",
            "Business messages get 3–5× more replies than cold email",
            "Template messages allow personalised, compliant outreach at scale",
            "Replies sync directly to your inbox for quick follow-up",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <a
        href="https://business.facebook.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
      >
        <ExternalLink className="h-4 w-4" />
        Set up Meta Business account
      </a>
    </div>
  );
}
