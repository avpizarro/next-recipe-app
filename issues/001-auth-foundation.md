## Parent PRD

`issues/prd.md`

## What to build

Better Auth with Google OAuth for admin-only recipe management. Visitors browse published recipes without logging in. Only verified Google emails in the server-only `ADMIN_EMAILS` allowlist may establish a session; ordinary user accounts and public recipe submissions are deferred.

Use the latest stable compatible Better Auth release, the existing JavaScript Pages Router, and encrypted stateless cookie sessions without a separate authentication database. Sign-out clears the current browser session; individual cross-device revocation would require server-side storage and is outside this issue.

## Implementation outline

- `lib/auth.js`: server-only Google provider and session configuration. Enforce verified email and the allowlist before session creation, not just in the UI.
- `lib/auth-client.js`: Better Auth React client for session state, Google sign-in, and sign-out.
- `pages/api/auth/[...all].js`: Pages Router endpoint using Better Auth's Node handler with Next.js body parsing disabled.
- `pages/admin/sign-in.js`: admin login with loading, access-denied, and OAuth error states; accept only safe local return destinations.
- Shared server session and guard helpers for pages and APIs. Check the current allowlist on every management request, before protected reads or writes; do not store permanent admin authorization in a session.
- `lib/admin.js`: `isAdmin(email)` reads comma-separated `ADMIN_EMAILS`, trims whitespace, normalizes case, and matches whole addresses. Missing email or missing/empty configuration returns false.
- Add discreet admin navigation and sign-out controls. Public pages do not require a session or switch from static generation just for authentication.

## Acceptance criteria

- [x] Visitors can browse the homepage and published recipe details without logging in.
- [x] An allowlisted admin with a verified Google email can sign in and sign out.
- [x] Non-allowlisted accounts and unverified Google emails cannot establish a session, including through direct auth endpoint requests.
- [x] The validated session (at minimum the admin email) is available to pages and API routes.
- [x] Shared guards redirect unauthenticated management-page requests to `/admin/sign-in`; management APIs return `401` without a session and `403` for an authenticated account no longer allowlisted. Denied requests do not execute protected operations.
- [x] Removing an email from the deployed allowlist denies subsequent management requests even if a session remains valid.
- [x] `isAdmin(email)` is unit tested for allowlisted and non-allowlisted addresses, case/whitespace normalization, exact matching, missing email, and empty/missing environment configuration.
- [x] Tests cover rejected sign-in, missing/invalid/expired sessions, page/API guard behavior, safe return URLs, and anonymous recipe access.
- [x] A committed `.env.example` and README document `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `ADMIN_EMAILS`, with placeholders only. Document local/production `/api/auth/callback/google` URLs and Google Cloud/Vercel provisioning.
- [x] Automated checks and a production build pass.
- [ ] Complete real Google sign-in, reload persistence, cancellation, and sign-out in a browser with the configured admin account.

## Blocked by

None for implementation. Google OAuth credentials must be provisioned externally for end-to-end verification.

## User stories addressed

- User story 5 (admin-only submission)
- User story 13
- Public browsing without an account

## Implementation verification

Implemented with Better Auth 1.7.21 and Vitest. Automated tests exercise the real OAuth callback/session flow with simulated Google responses, plus admin admission, guards, cookie refresh/expiry, sign-out, safe redirects, and public recipe rendering. Local HTTP checks verify public pages, anonymous session lookup, and Google sign-in initiation.

Google credentials and the allowlist were already configured locally. Missing local URL and session-secret settings were added to the ignored `.env.local`; existing credentials were preserved. Real browser consent and production Google/Vercel configuration remain manual verification steps documented in the README.
