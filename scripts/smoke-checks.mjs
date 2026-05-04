import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const home = readFileSync(new URL('../src/app/HomeClient.tsx', import.meta.url), 'utf8');
const authModal = readFileSync(new URL('../src/components/AuthModal.tsx', import.meta.url), 'utf8');
const subscribeRoute = readFileSync(new URL('../src/app/api/stripe/subscribe/route.ts', import.meta.url), 'utf8');
const webhookRoute = readFileSync(new URL('../src/app/api/stripe/webhook/route.ts', import.meta.url), 'utf8');

assert(!authModal.includes('window.location.href = "/upgrade"'), 'Daily-limit Upgrade to Pro CTA must not route to missing /upgrade page.');
assert(authModal.includes('onUpgrade'), 'AuthModal should expose an onUpgrade callback so the modal can start Pro checkout.');
assert(home.includes('userId: userSession?.userId'), 'Pro checkout request should include authenticated userId.');
assert(subscribeRoute.includes('metadata: { userId'), 'Stripe subscription checkout should persist userId in metadata.');
assert(webhookRoute.includes('sub.metadata?.userId'), 'Stripe webhook should prefer subscription metadata userId for Pro unlock.');

console.log('smoke checks passed');
