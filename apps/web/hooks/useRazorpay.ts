'use client'

import { useState, useEffect, useCallback } from 'react'

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
  }
}

interface RazorpayResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface RazorpayDisplayBlock {
  name: string
  instruments: Array<{ method: string; wallets?: string[] }>
}

interface RazorpayMethodRestriction {
  card?: 0 | 1 | boolean
  netbanking?: 0 | 1 | boolean
  upi?: 0 | 1 | boolean
  wallet?: 0 | 1 | boolean
  emi?: 0 | 1 | boolean
  paylater?: 0 | 1 | boolean
  paypal?: 0 | 1 | boolean
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  order_id: string
  name: string
  description: string
  prefill?: {
    email?: string
    name?: string
    contact?: string
  }
  theme?: { color?: string }
  handler: (response: RazorpayResponse) => void | Promise<void>
  modal?: {
    ondismiss?: () => void
  }
  method?: RazorpayMethodRestriction
  config?: {
    display?: {
      blocks?: Record<string, RazorpayDisplayBlock>
      sequence?: string[]
      preferences?: { show_default_blocks?: boolean }
    }
  }
}

interface RazorpayInstance {
  open: () => void
}

export type PreferredPaymentMethod = 'card' | 'upi' | 'netbanking' | 'wallet'

export interface OpenCheckoutOptions {
  orderId: string
  amount: number
  currency: string
  keyId: string
  name?: string
  description?: string
  prefill?: {
    email?: string
    name?: string
    contact?: string
  }
  onVerified?: (paymentId: string) => void
  verifyBody?: Record<string, unknown>
  theme?: string
  /**
   * When set, Razorpay Checkout opens with this payment method surfaced
   * first (via config.display.blocks + sequence). Users can still switch
   * to other methods within the Razorpay modal — show_default_blocks
   * stays true.
   */
  preferredMethod?: PreferredPaymentMethod
  /**
   * International route: restrict Razorpay Checkout to the PayPal wallet
   * only, hide every other method. Requires Razorpay's PayPal integration
   * to be activated on the merchant account. Used for USD orders where
   * we want to guarantee the customer pays via PayPal.
   */
  paypalOnly?: boolean
}

export interface CheckoutResult {
  success: boolean
  error?: string
}

const SCRIPT_ID = 'razorpay-checkout-sdk'
const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

export function useRazorpay(): {
  openCheckout: (opts: OpenCheckoutOptions) => Promise<CheckoutResult>
  scriptLoaded: boolean
} {
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (typeof window.Razorpay !== 'undefined') {
      setScriptLoaded(true)
      return
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      if (typeof window.Razorpay !== 'undefined') {
        setScriptLoaded(true)
      } else {
        const handleLoad = () => setScriptLoaded(true)
        existing.addEventListener('load', handleLoad)
        return () => existing.removeEventListener('load', handleLoad)
      }
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => setScriptLoaded(false)
    document.head.appendChild(script)
  }, [])

  const openCheckout = useCallback(
    (opts: OpenCheckoutOptions): Promise<CheckoutResult> => {
      return new Promise<CheckoutResult>((resolve) => {
        const waitForScript = () =>
          new Promise<void>((scriptResolve) => {
            if (typeof window !== 'undefined' && typeof window.Razorpay !== 'undefined') {
              scriptResolve()
              return
            }
            const interval = setInterval(() => {
              if (typeof window !== 'undefined' && typeof window.Razorpay !== 'undefined') {
                clearInterval(interval)
                scriptResolve()
              }
            }, 100)
          })

        waitForScript().then(() => {
          if (typeof window === 'undefined' || !window.Razorpay) {
            resolve({ success: false, error: 'Razorpay SDK not available' })
            return
          }

          // Build config.display so the user's payment-method choice in our
          // modal (Card vs UPI) actually influences what Razorpay Checkout
          // surfaces first. show_default_blocks stays true so the user can
          // still switch inside Razorpay's modal — it's a preference, not a
          // hard filter.
          const preferenceLabels: Record<PreferredPaymentMethod, string> = {
            upi: 'Pay using UPI',
            card: 'Pay by Card',
            netbanking: 'Net Banking',
            wallet: 'Pay by Wallet',
          }
          // Method / config strategy:
          //   1. paypalOnly=true (USD orders) — pass method:{ paypal:1 }
          //      at the top level. This is Razorpay's own method key for
          //      PayPal Standard Checkout integration (distinct from
          //      `wallet`, `card`, etc). Prior attempts revealed that
          //      PayPal on this account is NOT registered under `wallet`
          //      (method:{ wallet:1 } produced an empty modal) and NOT
          //      matched by { method:'wallet', wallets:['paypal'] }
          //      display.blocks ("No appropriate payment method found").
          //      If Razorpay's category for the account's PayPal
          //      integration is literally `paypal`, this restriction
          //      shows only PayPal. If the account uses a different
          //      key, Razorpay ignores unknown method keys and falls
          //      back to the account's default methods — so worst case
          //      is Cards + PayPal both visible, same as no restriction.
          //   2. preferredMethod set (INR orders) — surface the chosen
          //      method first via config.display.blocks but keep the
          //      default blocks visible so users can still switch inside
          //      the Razorpay modal.
          let config:
            | {
                display: {
                  blocks: Record<string, RazorpayDisplayBlock>
                  sequence: string[]
                  preferences: { show_default_blocks: boolean }
                }
              }
            | undefined
          const method: RazorpayMethodRestriction | undefined = opts.paypalOnly
            ? {
                card: 0,
                netbanking: 0,
                upi: 0,
                wallet: 0,
                emi: 0,
                paylater: 0,
                paypal: 1,
              }
            : undefined
          if (!opts.paypalOnly && opts.preferredMethod) {
            config = {
              display: {
                blocks: {
                  preferred: {
                    name: preferenceLabels[opts.preferredMethod],
                    instruments: [{ method: opts.preferredMethod }],
                  },
                },
                sequence: ['block.preferred'],
                preferences: { show_default_blocks: true },
              },
            }
          }

          const rzp = new window.Razorpay({
            key: opts.keyId,
            amount: opts.amount,
            currency: opts.currency,
            order_id: opts.orderId,
            name: opts.name ?? 'AryaSDR',
            description: opts.description ?? 'Subscription',
            prefill: opts.prefill,
            theme: { color: opts.theme ?? '#6C47FF' },
            ...(method ? { method } : {}),
            ...(config ? { config } : {}),
            handler: async (response: RazorpayResponse) => {
              try {
                const verifyRes = await fetch('/api/billing/verify-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    ...(opts.verifyBody ?? {}),
                  }),
                })
                const verifyJson = await verifyRes.json()
                if (verifyJson.success) {
                  opts.onVerified?.(response.razorpay_payment_id)
                }
                resolve({
                  success: !!verifyJson.success,
                  error: verifyJson.success ? undefined : verifyJson.error,
                })
              } catch (err) {
                resolve({
                  success: false,
                  error: err instanceof Error ? err.message : 'Verification failed',
                })
              }
            },
            modal: {
              ondismiss: () => resolve({ success: false, error: 'Cancelled by user' }),
            },
          })

          rzp.open()
        })
      })
    },
    [],
  )

  return { openCheckout, scriptLoaded }
}
