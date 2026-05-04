import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const home = readFileSync(new URL('../src/app/HomeClient.tsx', import.meta.url), 'utf8');
const authModal = readFileSync(new URL('../src/components/AuthModal.tsx', import.meta.url), 'utf8');
const subscribeRoute = readFileSync(new URL('../src/app/api/stripe/subscribe/route.ts', import.meta.url), 'utf8');
const webhookRoute = readFileSync(new URL('../src/app/api/stripe/webhook/route.ts', import.meta.url), 'utf8');
const shareCardRoute = readFileSync(new URL('../src/app/api/share-card/route.tsx', import.meta.url), 'utf8');

assert(authModal.includes('emailRedirectTo'), 'Supabase signup should set emailRedirectTo so production confirmations do not go to localhost.');
assert(authModal.includes('window.location.origin'), 'Supabase signup redirect should use the current deployed origin.');

assert(!authModal.includes('window.location.href = "/upgrade"'), 'Daily-limit Upgrade to Pro CTA must not route to missing /upgrade page.');
assert(authModal.includes('onUpgrade'), 'AuthModal should expose an onUpgrade callback so the modal can start Pro checkout.');
assert(home.includes('userId: userSession?.userId'), 'Pro checkout request should include authenticated userId.');
assert(subscribeRoute.includes('const metadata = { userId') && subscribeRoute.includes('metadata,'), 'Stripe subscription checkout should persist userId in checkout metadata.');
assert(subscribeRoute.includes('subscription_data: { metadata }'), 'Stripe subscription checkout should also persist userId in subscription_data.metadata.');
assert(webhookRoute.includes('sub.metadata?.userId'), 'Stripe webhook should prefer subscription metadata userId for Pro unlock.');
assert(webhookRoute.includes('checkout.session.completed'), 'Stripe webhook should also unlock Pro from checkout.session.completed as a fallback before subscription metadata arrives.');

assert(!home.includes('if (data.category) fetchBenchmark(data.overall, data.category);'), 'Free evaluations must not fetch benchmark data automatically.');
assert(home.includes('if (userSession?.isPro && data.category) fetchBenchmark(data.overall, data.category);'), 'Benchmark fetch should be gated to Pro users only.');
assert(home.includes('{userSession?.isPro && benchmark && ('), 'Benchmark component should render only for Pro users.');

assert(authModal.includes('isAuthenticated?: boolean'), 'AuthModal should know when user is already signed in.');
assert(authModal.includes('isLimitSignedIn = isLimit && isAuthenticated'), 'Daily-limit modal should have a signed-in variant instead of asking logged-in users to sign in.');
assert(authModal.includes('!isAuthenticated && ('), 'Daily-limit modal should hide auth form when user is already signed in.');

assert(!shareCardRoute.includes('backgroundImage:'), 'Share card should not use @vercel/og-fragile CSS backgroundImage gradients.');
assert(shareCardRoute.includes('rgba(108, 58, 255, 0.06)'), 'Share card should use supported rgba color syntax with spaces for OG rendering.');

assert(home.includes('interface EvaluationMeta'), 'Home UI should track evaluation-count metadata returned by /api/rate.');
assert(home.includes('freeEvaluationsUsed'), 'Result flow should know whether this is the 1st or 2nd free evaluation.');
assert(home.includes('canClaimShareCredit'), 'Share CTA should show +1 free evaluation only when the user can claim it.');
assert(home.includes('claimShareCreditAfterAuth'), 'Anonymous share-credit claims should route through auth before granting persistent credit.');
assert(home.includes('startProCheckout()'), 'After the final free evaluation, the secondary CTA should start Pro checkout instead of showing a disabled daily-limit button.');
assert(home.includes('Get Pro for unlimited evaluations'), 'English final free-evaluation CTA copy should be explicit.');
assert(home.includes('Obtén Pro para evaluaciones ilimitadas'), 'Spanish final free-evaluation CTA copy should be explicit.');
assert(home.includes('+1 free evaluation') && home.includes('+1 evaluación gratis'), 'Share CTA should communicate the +1 evaluation incentive in both languages.');

assert(authModal.includes('Create a free account to claim your extra evaluation'), 'Auth modal should explain login/signup is required to claim +1 free evaluation.');
assert(authModal.includes('Crea una cuenta gratis para reclamar tu evaluación extra'), 'Auth modal should explain the +1 claim in Spanish.');

console.log('smoke checks passed');
