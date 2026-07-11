import { redirect } from "next/navigation";

// The real Integrations UI now lives under Settings, reachable from the
// Settings sidebar. This route previously had its own full duplicate
// implementation that nothing in the app actually linked to — kept as a
// redirect (rather than deleted) since Google's OAuth callback and other
// deep links may still point here.
export default function IntegrationsRedirectPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  const query = params.toString();
  redirect(`/settings/integrations${query ? `?${query}` : ""}`);
}
