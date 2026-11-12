import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { authClient } from '../../lib/auth-client';
import { safeReturnTo } from '../../lib/auth-redirect';
import AdminSessionControls from '../../components/AdminSessionControls';

export default function AdminSignIn() {
  const router = useRouter();
  const { data, isPending, error: sessionError } = authClient.useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const returnTo = safeReturnTo(router.query.returnTo);
  const oauthError = router.query.error;
  const message = error || (oauthError === 'admin_access_denied'
    ? 'This Google account does not have admin access.'
    : oauthError ? 'Google sign-in was cancelled or could not be completed. Please try again.' : '');

  async function signIn() {
    setPending(true);
    setError('');
    try {
      const result = await authClient.signIn.social({
        provider: 'google', callbackURL: returnTo,
        errorCallbackURL: `/admin/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
      });
      if (result.error) throw new Error('Sign-in failed');
    } catch {
      setError('Could not start Google sign-in. Please try again.');
      setPending(false);
    }
  }

  return <section className="admin-card">
    <Head><title>Admin sign-in | Alejandra&apos;s Kitchen</title><meta name="robots" content="noindex" /></Head>
    <h1>Admin sign-in</h1>
    <p className="text-secondary">Sign in to manage recipes. Everyone can browse recipes without an account.</p>
    {message && <p role="alert">{message}</p>}
    {sessionError && <p role="alert">Could not check your session. Please reload or try signing in again.</p>}
    {isPending ? <p className="text-secondary" role="status">Checking your session…</p> : data ? <>
      <AdminSessionControls email={data.user.email} />
      {!oauthError && <p><Link href={returnTo}>Continue</Link></p>}
    </> : <button type="button" onClick={signIn} disabled={pending || !router.isReady}>
      {pending ? 'Opening Google…' : 'Sign in with Google'}
    </button>}
    <p><Link href="/">Browse recipes</Link></p>
  </section>;
}
