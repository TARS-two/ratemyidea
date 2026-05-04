import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const home = readFileSync(new URL('../src/app/HomeClient.tsx', import.meta.url), 'utf8');
const authModal = readFileSync(new URL('../src/components/AuthModal.tsx', import.meta.url), 'utf8');
const subscribeRoute = readFileSync(new URL('../src/app/api/stripe/subscribe/route.ts', import.meta.url), 'utf8');
const webhookRoute = readFileSync(new URL('../src/app/api/stripe/webhook/route.ts', import.meta.url), 'utf8');
const shareCardRoute = readFileSync(new URL('../src/app/api/share-card/route.tsx', import.meta.url), 'utf8');

assert(!authModal.includes('window.location.href = "/upgrade"'), 'Daily-limit Upgrade to Pro CTA must not route to missing /upgrade page.');
assert(authModal.includes('onUpgrade'), 'AuthModal should expose an onUpgrade callback so the modal can start Pro checkout.');
assert(home.includes('userId: userSession?.userId'), 'Pro checkout request should include authenticated userId.');
assert(subscribeRoute.includes('metadata: { userId'), 'Stripe subscription checkout should persist userId in metadata.');
assert(webhookRoute.includes('sub.metadata?.userId'), 'Stripe webhook should prefer subscription metadata userId for Pro unlock.');

assert(!home.includes('if (data.category) fetchBenchmark(data.overall, data.category);'), 'Free evaluations must not fetch benchmark data automatically.');
assert(home.includes('if (userSession?.isPro && data.category) fetchBenchmark(data.overall, data.category);'), 'Benchmark fetch should be gated to Pro users only.');
assert(home.includes('{userSession?.isPro && benchmark && ('), 'Benchmark component should render only for Pro users.');

assert(authModal.includes('isAuthenticated?: boolean'), 'AuthModal should know when user is already signed in.');
assert(authModal.includes('isLimitSignedIn = isLimit && isAuthenticated'), 'Daily-limit modal should have a signed-in variant instead of asking logged-in users to sign in.');
assert(authModal.includes('!isAuthenticated && ('), 'Daily-limit modal should hide auth form when user is already signed in.');

assert(!shareCardRoute.includes('backgroundImage:'), 'Share card should not use @vercel/og-fragile CSS backgroundImage gradients.');
assert(shareCardRoute.includes('rgba(108, 58, 255, 0.06)'), 'Share card should use supported rgba color syntax with spaces for OG rendering.');

console.log('smoke checks passed');
