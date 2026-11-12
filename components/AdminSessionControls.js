import { useState } from 'react';
import { authClient } from '../lib/auth-client';

export default function AdminSessionControls({ email }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function signOut() {
    setPending(true);
    setError('');
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error('Sign-out failed');
      window.location.assign('/');
    } catch {
      setError('Could not sign out. Please try again.');
      setPending(false);
    }
  }
  return <div className="admin-session">
    <span>Signed in as {email}</span>
    <button type="button" disabled={pending} onClick={signOut}>{pending ? 'Signing out…' : 'Sign out'}</button>
    {error && <p role="alert">{error}</p>}
  </div>;
}
