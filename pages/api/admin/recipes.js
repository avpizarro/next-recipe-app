import { withAdminApi } from '../../../lib/auth-guards';
import { importRecipe } from '../../../lib/import-recipe';
import { validateSourceUrl } from '../../../lib/safe-download';
import { ImportError } from '../../../lib/import-error';

export const config = { api: { bodyParser: { sizeLimit: '8kb' } }, maxDuration: 60 };

export default withAdminApi(async (req, res, session) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST to import a recipe.' });
  }
  try {
    if (typeof req.body?.url !== 'string' || req.body.url.length > 4096) throw new ImportError('Enter a valid recipe URL.', 400);
    const url = validateSourceUrl(req.body.url.trim()).href;
    const recipe = await importRecipe(url, session.user);
    return res.status(201).json({ recipe });
  } catch (error) {
    if (error instanceof ImportError) return res.status(error.status).json({ error: error.message });
    return res.status(500).json({ error: 'Could not save the recipe. Please try again or check the server configuration.' });
  }
});
