import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export const PLAN_PRICES_USD: Record<string, string> = {
  starter: process.env.STRIPE_STARTER_PRICE_ID ?? "price_starter",
  growth: process.env.STRIPE_GROWTH_PRICE_ID ?? "price_growth",
  scale: process.env.STRIPE_SCALE_PRICE_ID ?? "price_scale",
};

export async function createStripeCheckoutSession(
  planId: string,
  userId: string,
  email: string
) {
  const priceId = PLAN_PRICES_USD[planId];
  if (!priceId) throw new Error(`Unknown plan: ${planId}`);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId, planId },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?cancelled=true`,
  });

  return session;
}

export const PLAN_LIMITS: Record<string, {
  leadsLimit: number;
  emailsMonthlyLimit: number;
  linkedinEnabled: boolean;
  whatsappEnabled: boolean;
  aiLeadFinderMonthly: number;
  emailAccountsLimit: number;
}> = {
  free: {
    leadsLimit: 50,
    emailsMonthlyLimit: 100,
    linkedinEnabled: false,
    whatsappEnabled: false,
    aiLeadFinderMonthly: 0,
    emailAccountsLimit: 1,
  },
  starter: {
    leadsLimit: 500,
    emailsMonthlyLimit: 1000,
    linkedinEnabled: true,
    whatsappEnabled: false,
    aiLeadFinderMonthly: 0,
    emailAccountsLimit: 1,
  },
  growth: {
    leadsLimit: 2000,
    emailsMonthlyLimit: 5000,
    linkedinEnabled: true,
    whatsappEnabled: true,
    aiLeadFinderMonthly: 100,
    emailAccountsLimit: 3,
  },
  scale: {
    leadsLimit: 999999,
    emailsMonthlyLimit: 999999,
    linkedinEnabled: true,
    whatsappEnabled: true,
    aiLeadFinderMonthly: 500,
    emailAccountsLimit: 10,
  },
};
