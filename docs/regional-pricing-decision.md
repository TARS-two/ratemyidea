# Regional Pricing Decision — ratemyidea.ai

Last updated: 2026-06-17

## Decision status

Human-owned commercial decision. Do not auto-geo-price yet.

## Current default

- Pro: $9 USD/month global.
- Market Study: $49 USD global.
- Extra evaluation: $1.00 USD global.

## Signal from controlled sale

- $49 USD can create friction, especially outside higher-income markets.
- $29 USD was mentioned as a lower-friction entry point for USA testing.
- LATAM likely needs a different anchor or offer structure, not just a silent discount.

## Guardrails before code

Do not auto-geo-price until Phil chooses:

1. Offer: Pro, Market Study, one-time bundle, LATAM discount, or entry-level plan.
2. Regions: USA only, Mexico, LATAM, global, or manual controlled-sale coupons.
3. Currency: keep USD or add local currency Price IDs.
4. Stripe Price IDs: one clear Price ID per product/region/currency if automated.
5. Tax/support implications.
6. VPN/geo ambiguity handling.
7. Copy: explain the offer without creating unfairness or confusion.

## Practical recommendation

For now, use a controlled manual experiment instead of automatic geo pricing:

- Keep public pricing stable.
- Test a $29 USD Market Study or bundle offer manually with selected USA prospects.
- Test LATAM as a founder-approved coupon/manual link, not hidden geolocation.
- Decide automation only after conversion data shows the experiment matters.

## Implementation rule

Any future pricing code must preserve this rule in smoke checks:

- Do not auto-geo-price.
- Do not switch Stripe Price IDs from inferred country alone.
- Require explicit product/region mapping and fallback to the current global prices.
