# Admin authentication

Recipes are public. Only recipe admins sign in, at `/admin/sign-in`, using Google.
Ordinary user accounts, public submissions, meal plans, and personalized nutrition
features are deferred. Recipe-management screens will be added in later issues.

Authentication uses Better Auth 1.7.21 with encrypted, HTTP-only cookie sessions.
There is no separate authentication database. Sessions refresh while in use and
expire after seven days without refresh. Signing out clears the current browser's
cookies; it does not revoke a copied cookie or sessions on other devices. The
server rechecks the current admin allowlist on every protected request.

## Local setup

Add the variables from [`.env.example`](../.env.example) to your existing `.env.local` (preserve any
existing Sanity settings). Never commit credentials or prefix them with `NEXT_PUBLIC_`.

| Variable | Value |
| --- | --- |
| `BETTER_AUTH_URL` | `http://localhost:3000` locally; canonical HTTPS origin in production |
| `BETTER_AUTH_SECRET` | Random secret of at least 32 characters |
| `GOOGLE_CLIENT_ID` | Google OAuth web application client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `ADMIN_EMAILS` | Comma-separated Google email addresses permitted to sign in |

Generate a secret locally with `openssl rand -base64 32`. Use a different secret
for production. Changing it invalidates existing encrypted sessions.

In Google Cloud Console, configure the OAuth consent screen and create an OAuth
client of type **Web application**. If the consent screen is in testing mode, add
your admin Google accounts as test users. Register the exact authorized redirect
URIs:

```text
http://localhost:3000/api/auth/callback/google
https://YOUR_PRODUCTION_DOMAIN/api/auth/callback/google
```

Google must report a verified email, and that address must match `ADMIN_EMAILS`.
Matching ignores case and surrounding whitespace, but uses the full address:
there are no domain wildcards or Gmail alias substitutions. An empty/missing
allowlist denies all sign-ins. The check happens before session creation, including
direct requests to the auth endpoints.

Restart the development server after changing environment variables. Public pages
can build and render without OAuth configuration; auth requests require all four
URL/credential/secret settings. Static builds still need access to Sanity.

## Vercel setup

Set these variables in Vercel's environment settings, use the production HTTPS
origin for `BETTER_AUTH_URL`, and redeploy. Use Node 24 in the project settings.
For previews that need working login, use a stable preview origin, separate
credentials/secret, and its exact registered Google redirect URI. Do not trust
arbitrary preview origins or wildcard callbacks.

To remove an admin, update `ADMIN_EMAILS` and redeploy. Their existing session will
no longer authorize management requests once the new environment is active.

## Protecting future management routes

Every management page uses `withAdminPage`; every management API uses
`withAdminApi`. Client-side visibility is not authorization. Both helpers validate
the session, recheck the allowlist, and prevent private responses from being cached.

```js
// In a management page (use the appropriate relative import path):
import { withAdminPage } from '../lib/auth-guards';

export const getServerSideProps = withAdminPage(async (context, session) => {
  // Read protected data here, after authorization. Only return needed fields.
  return { props: { email: session.user.email } };
});
```

```js
// In pages/api/example.js:
import { withAdminApi } from '../../lib/auth-guards';

export default withAdminApi(async (req, res, session) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  // Validate the request body before any writes. Derive the actor from session.
  return res.status(200).json({ email: session.user.email });
});
```

Unauthenticated pages redirect to admin sign-in with a validated local return
path. Unauthenticated APIs return `401`; sessions whose email is no longer allowed
receive `403`. API mutations also require an `Origin` matching `BETTER_AUTH_URL`;
call them with same-origin browser requests and never mutate via GET. Auth's own
endpoints retain Better Auth's built-in OAuth state and origin checks.

For an optional server-side session, use `getSession(req, res)` from
`lib/auth-session.js`. Passing `res` forwards refreshed cookies. Session availability
does not itself grant admin access. Never send the complete session/token to page
props, and never import server auth configuration or the allowlist into a component.

## Verification

```sh
npm test
npm run build
```

Tests exercise the real Better Auth OAuth callback and encrypted sessions with
simulated Google responses, rejected identities, expiry, sign-out, route guards,
return URLs, and public recipe rendering. No live credentials are used by tests.

After provisioning credentials, manually verify:

1. Open the homepage and a recipe in a private browser window without signing in.
2. Sign in at `/admin/sign-in` with an allowlisted Google account; reload that page
   and confirm the email remains visible, then sign out.
3. Try an account outside the allowlist and confirm access is denied.
4. Cancel Google authorization and confirm the login page offers another attempt.
5. When management routes are added, verify direct page/API access before login,
   after login, and after removing the admin from the deployed allowlist.

Real Google consent/redirect behavior still requires this manual check; simulated
OAuth tests do not replace it.

References: [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next),
[Google setup](https://better-auth.com/docs/authentication/google), and
[stateless sessions](https://better-auth.com/docs/concepts/session-management#stateless-session-management).
