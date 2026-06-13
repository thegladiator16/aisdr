import { Linkedin, ExternalLink, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LinkedInSetupPage() {
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
        <div className="h-14 w-14 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Linkedin className="h-7 w-7 text-blue-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">LinkedIn Integration</h1>
            <span className="rounded-full bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">
              Coming Soon
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Automated LinkedIn outreach via PhantomBuster
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold text-foreground">How it works</h2>
        <p className="text-sm text-muted-foreground">
          LinkedIn integration uses PhantomBuster to safely automate connection requests and
          direct messages while staying within LinkedIn&apos;s rate limits.
        </p>
        <ol className="space-y-3 text-sm text-muted-foreground list-none">
          {[
            "Create a PhantomBuster account at phantombuster.com",
            "Connect your LinkedIn account to PhantomBuster",
            "Generate a PhantomBuster API key from your account settings",
            "Paste your API key here once this feature launches",
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
        <h2 className="font-semibold text-foreground">What you&apos;ll be able to do</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {[
            "Send automated connection requests with personalized notes",
            "Follow up with DMs to new connections",
            "Track connection acceptance rate and reply rate",
            "Auto-sync LinkedIn replies into your inbox",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <a
        href="https://phantombuster.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
      >
        <ExternalLink className="h-4 w-4" />
        Get started with PhantomBuster
      </a>
    </div>
  );
}
