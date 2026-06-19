# Regional Pricing Decision — ratemyidea.ai

Last updated: 2026-06-19

## Decision status

Phil approved regional pricing for the Market Study as a visible, transparent pricing experiment.

This is **not** shadow pricing. The product page/preview must show the same server-resolved price before Stripe checkout.

## Current pricing v1

- Extra evaluation: $1.00 USD global. Do not regionalize for now.
- Market Study:
  - US/Canada: default `$49 USD`.
  - Mexico/LATAM: default `$29 USD`, unless Vercel env vars point to a local-currency Stripe Price ID/display.
  - Global fallback: default `$49 USD`.
- Pro: keep current global pricing for now. Revisit only after quota/cost rules for Pro refinement are clearer.

## Why this shape

- Market Study is the clearest one-time purchase for testing price sensitivity.
- Regional pricing reduces LATAM friction without cheapening the whole product.
- Extra evaluation is already a low-friction micro-purchase.
- Pro subscription economics depend on future usage limits and should not be changed blindly.

## Implementation rule

Regional pricing must be resolved server-side from durable country headers such as `x-vercel-ip-country`, not from client-side IP logic.

The same server resolver must be used by:

1. `/api/pricing` — display-only pricing for the UI.
2. `/api/checkout` — actual Stripe Price ID selection for Market Study checkout.

The UI should say:

- EN: `Regional pricing applied when available.`
- ES: `Precio regional aplicado cuando está disponible.`

## Stripe env vars

Required fallback:

```text
MARKET_STUDY_PRICE_ID=<global existing price id>
```

Optional regional overrides:

```text
MARKET_STUDY_PRICE_US_ID=<stripe price id>
MARKET_STUDY_PRICE_US_DISPLAY=$49 USD
MARKET_STUDY_PRICE_US_CURRENCY=USD

MARKET_STUDY_PRICE_LATAM_ID=<stripe price id>
MARKET_STUDY_PRICE_LATAM_DISPLAY=$29 USD
MARKET_STUDY_PRICE_LATAM_CURRENCY=USD

MARKET_STUDY_PRICE_DEFAULT_ID=<stripe price id>
MARKET_STUDY_PRICE_DEFAULT_DISPLAY=$49 USD
MARKET_STUDY_PRICE_DEFAULT_CURRENCY=USD
```

If regional Price IDs are not configured, the resolver falls back to the global/default Market Study price and display. This prevents the page from showing a LATAM discount while Stripe charges the global price.

## Guardrails

- Do not change price after user clicks checkout.
- Do not hide regional pricing until Stripe.
- Do not imply exact location; use “regional pricing” language.
- Do not regionalize Pro until product usage/cost limits are explicit.
- Record `pricingRegion`, `detectedCountry`, and display price in Stripe metadata for support/debugging.

## Open decisions

- Whether LATAM should remain `$29 USD` or move to a MXN-denominated price such as `$499 MXN`.
- Whether to add a manual “wrong region?” support flow or promo code fallback.
- Whether to expose region label in UI or keep it to Stripe metadata/support.
