import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { withAdminPage } from '../../../lib/auth-guards';
import AdminSessionControls from '../../../components/AdminSessionControls';

export const getServerSideProps = withAdminPage(async (_context, session) => ({ props: { email: session.user.email } }));

export default function NewRecipe({ email }) {
  const [url, setUrl] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [recipe, setRecipe] = useState(null);
  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError(''); setRecipe(null);
    try {
      const response = await fetch('/api/admin/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Import failed. Please try again.');
      setRecipe(result.recipe); setUrl('');
    } catch (error) { setError(error.message || 'Import failed. Please try again.'); }
    finally { setPending(false); }
  }
  return <section className="admin-card">
    <Head><title>Import recipe | Alejandra&apos;s Kitchen</title><meta name="robots" content="noindex" /></Head>
    <h1>Import a recipe</h1>
    <AdminSessionControls email={email} />
    <p>Paste a recipe URL to save it for review. Imported recipes are not published automatically.</p>
    <form onSubmit={submit}>
      <label htmlFor="recipe-url">Recipe URL</label>
      <input id="recipe-url" type="url" required maxLength={4096} value={url} onChange={(event) => setUrl(event.target.value)} disabled={pending} placeholder="https://example.com/recipe" />
      <button type="submit" disabled={pending}>{pending ? 'Importing…' : 'Import recipe'}</button>
    </form>
    {pending && <p role="status">Reading the recipe and saving its image…</p>}
    {error && <p role="alert">{error}</p>}
    {recipe && <p role="status">{recipe.name} was saved pending review.</p>}
    <p><Link href="/">Browse recipes</Link></p>
  </section>;
}
