"use client";

import { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PayPalCheckoutButtonProps {
  /** What we send to /api/billing/create-paypal-order + verify-paypal-payment. */
  purchase:
    | { plan: "starter" | "growth"; billing: "monthly" | "yearly" }
    | { type: "credits" | "dialer" | "mailbox" | "phone"; quantity: number };
  /** Label shown next to the amount in the description. */
  labelForDescription: string;
  /** Called after the payment is captured AND the subscription is updated. */
  onSuccess: () => void;
  /** Optional inline disable (e.g. while another plan is in flight). */
  disabled?: boolean;
}

/**
 * Renders PayPal Smart Payment Buttons via @paypal/react-paypal-js. Everything
 * price-sensitive happens on the server:
 *   createOrder → POST /api/billing/create-paypal-order (returns the order id)
 *   onApprove  → POST /api/billing/verify-paypal-payment (captures + upserts sub)
 *
 * Env: reads NEXT_PUBLIC_PAYPAL_CLIENT_ID at load. When missing we render a
 * friendly "not configured" state instead of the button so the modal doesn't
 * silently break on preview environments.
 */
export function PayPalCheckoutButton({
  purchase,
  labelForDescription,
  onSuccess,
  disabled,
}: PayPalCheckoutButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const [busy, setBusy] = useState(false);

  if (!clientId) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 space-y-1.5">
        <p className="text-xs font-medium text-gray-700">
          International checkout coming soon
        </p>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          Email{" "}
          <a
            href="mailto:sales@aryasdr.in?subject=International%20subscription"
            className="text-[#6C47FF] hover:underline font-medium"
          >
            sales@aryasdr.in
          </a>{" "}
          and we&rsquo;ll activate your plan manually while we finish PayPal
          setup.
        </p>
      </div>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: "USD",
        intent: "capture",
      }}
    >
      <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
        {busy && (
          <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Confirming with PayPal…
          </div>
        )}
        <PayPalButtons
          style={{
            layout: "vertical",
            color: "blue",
            shape: "rect",
            label: "paypal",
          }}
          disabled={disabled || busy}
          forceReRender={[JSON.stringify(purchase)]}
          createOrder={async () => {
            const res = await fetch("/api/billing/create-paypal-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(purchase),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              const err = data?.error || "Could not start PayPal payment";
              toast.error(err);
              throw new Error(err);
            }
            const json = (await res.json()) as { id: string };
            return json.id;
          }}
          onApprove={async (data) => {
            setBusy(true);
            try {
              const res = await fetch("/api/billing/verify-paypal-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  paypalOrderId: data.orderID,
                  ...purchase,
                }),
              });
              const json = await res.json().catch(() => ({}));
              if (!res.ok || !json?.success) {
                toast.error(
                  (json && json.error) ||
                    "Payment captured but activation failed. Please contact support."
                );
                return;
              }
              toast.success(`${labelForDescription} activated`);
              onSuccess();
            } finally {
              setBusy(false);
            }
          }}
          onError={(err) => {
            console.error("[paypal] onError", err);
            toast.error("PayPal reported an error. Please try again.");
          }}
          onCancel={() => {
            // Not an error — user closed the PayPal window.
          }}
        />
      </div>
    </PayPalScriptProvider>
  );
}
