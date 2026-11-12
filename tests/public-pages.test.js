import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { expect, it, vi } from 'vitest';
import Home, { getStaticProps as getHomeProps } from '../pages/index';
import Recipe, { getStaticProps as getRecipeProps } from '../pages/recipes/[slug]';
import { sanityClient } from '../lib/sanity';

vi.mock('next/router', () => ({ useRouter: () => ({ isFallback: false }) }));
vi.mock('../lib/sanity', () => ({
  sanityClient: { fetch: vi.fn() },
  urlFor: () => ({ url: () => '/recipe.jpg', width: () => ({ url: () => '/recipe.jpg' }) }),
}));

it('loads and renders recipe listing and details without an account or auth credentials', async () => {
  for (const name of ['BETTER_AUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'ADMIN_EMAILS']) vi.stubEnv(name, undefined);
  const recipe = { _id: 'recipe-1', name: 'Public recipe', slug: { current: 'public-recipe' }, mainImage: {}, instructions: [], url: 'https://example.com/recipe' };
  sanityClient.fetch.mockResolvedValueOnce([recipe]).mockResolvedValueOnce(recipe);
  const home = await getHomeProps();
  expect(renderToStaticMarkup(createElement(Home, home.props))).toContain('Public recipe');
  const detail = await getRecipeProps({ params: { slug: 'public-recipe' } });
  expect(renderToStaticMarkup(createElement(Recipe, detail.props))).toContain('Public recipe');
});
