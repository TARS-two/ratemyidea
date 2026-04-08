import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ received: true });

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const email = customer.email;

        if (email) {
          const { data: { users } } = await supabase.auth.admin.listUsers();
          const user = users.find((u) => u.email === email);
          if (user) {
            await supabase.from("user_subscriptions").upsert({
              user_id: user.id,
              stripe_customer_id: customerId,
              stripe_subscription_id: sub.id,
              plan: sub.status === "active" ? "pro" : "free",
              status: sub.status,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("user_subscriptions")
          .update({ plan: "free", status: "canceled", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        if (invoice.subscription) {
          await supabase
            .from("user_subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", invoice.subscription);
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
  }

  return NextResponse.json({ received: true });
}
