"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * PayPal checkout button — redirect flow.
 *
 * Earlier iterations tried @paypal/react-paypal-js's PayPalButtons component
 * (an embedded Smart Button widget) but on this deployment the SDK either
 * silently failed to render buttons or produced an empty payment options
 * screen, leaving the Change Plan modal with no visible CTA at all.
 *
 * This version is a normal HTML button styled like the INR "Get Starter"
 * button. On click:
 *   1. POST /api/billing/create-paypal-order      — server creates the order
 *      and returns { id, approveUrl }.
 *   2. window.location.href = approveUrl           — browser navigates to
 *      PayPal's own checkout page.
 *   3. After the customer approves or cancels on paypal.com, PayPal
 *      redirects back to /api/billing/paypal-return which captures the
 *      payment and redirects to /settings/billing?paypal=(success|error|
 *      cancelled).
 *
 * The button is ALWAYS visible — no SDK to fail. If the server isn't
 * configured (missing PAYPAL_CLIENT_ID env vars) we surface a friendly
 * toast instead of a scary embedded warning card.
 */
interface PayPalCheckoutButtonProps {
  purchase:
    | { plan: "starter" | "growth" | "scale"; billing: "monthly" | "yearly" }
    | { type: "credits" | "dialer" | "mailbox" | "phone"; quantity: number };
  /** Label used in the button copy (e.g., "Get Starter — $59/mo"). */
  buttonLabel: string;
  /** Tailwind color classes for the button — parent picks per plan. */
  colorClass: string;
  /** Called after PayPal returns and the subscription is updated. Currently
   *  unused (the paypal-return route redirects the browser directly), but
   *  kept for API symmetry with the previous SDK-based component. */
  onSuccess?: () => void;
  disabled?: boolean;
}

export function PayPalCheckoutButton({
  purchase,
  buttonLabel,
  colorClass,
  disabled,
}: PayPalCheckoutButtonProps) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/billing/create-paypal-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(purchase),
      });

      if (res.status === 403) {
        toast.error("You are in India. Please pay in INR.");
        return;
      }
      if (res.status === 503) {
        toast.error(
          "International payments are being set up. Email sales@aryasdr.in and we'll activate your plan manually."
        );
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || "Could not start PayPal checkout");
        return;
      }

      const json = (await res.json()) as { approveUrl?: string | null };
      if (!json.approveUrl) {
        toast.error("PayPal did not return a checkout URL, please try again.");
        return;
      }

      // Hand off to PayPal. `busy` stays true so the button reflects the
      // pending state until the browser actually leaves this tab.
      window.location.href = json.approveUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PayPal error");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || disabled}
      className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98] ${colorClass}`}
    >
      {busy ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Redirecting to PayPal…
        </>
      ) : (
        buttonLabel
      )}
    </button>
  );
}
