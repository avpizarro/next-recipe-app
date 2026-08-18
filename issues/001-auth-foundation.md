## Parent PRD

`issues/prd.md`

## What to build

NextAuth.js with Google OAuth, wired into the app so any page/API route can check for a signed-in session. Also add a small admin-allowlist helper that checks a signed-in user's email against a list read from an environment variable, for later use gating the review page and Woolworths automation.

## Acceptance criteria

- [ ] A user can sign in with their Google account and sign out again.
- [ ] The signed-in user's session (at minimum their email) is available to both pages and API routes.
- [ ] Unauthenticated requests to any route that will require a session are rejected/redirected (establish the pattern here, even though no protected routes exist yet).
- [ ] An `isAdmin(email)` helper exists that returns true only for emails present in an allowlist environment variable, and is unit tested (allowlisted email, non-allowlisted email, empty/missing env var).
- [ ] Required Google OAuth credentials and the admin allowlist are documented as new environment variables (e.g. in `.env.local` / README), since they must be provisioned externally (a Google Cloud OAuth app) before this can be tested end-to-end.

## Blocked by

None - can start immediately.

## User stories addressed

- User story 5
- User story 13
