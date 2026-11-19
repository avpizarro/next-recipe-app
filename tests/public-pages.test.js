import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { expect, it, vi } from 'vitest';
import Home, { getStaticProps as getHomeProps } from '../pages/index';
import Recipe, { getStaticProps as getRecipeProps, getStaticPaths } from '../pages/recipes/[slug]';
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

it('restricts listing, generated paths, and direct detail queries to published recipes', async () => {
  sanityClient.fetch.mockReset().mockResolvedValue([]);
  await getHomeProps();
  await getStaticPaths();
  sanityClient.fetch.mockResolvedValueOnce(null);
  expect(await getRecipeProps({ params: { slug: 'pending-recipe' } })).toEqual({ notFound: true, revalidate: 10 });
  for (const [query] of sanityClient.fetch.mock.calls) {
    expect(query).toContain('&& status == "published"');
  }
});

it('returns 404 when a recipe is unavailable and configures detail revalidation correctly', async () => {
  sanityClient.fetch.mockReset().mockResolvedValueOnce(null);
  expect(await getRecipeProps({ params: { slug: 'rejected-or-missing' } })).toMatchObject({ notFound: true });
  sanityClient.fetch.mockResolvedValueOnce({ name: 'Published recipe' });
  const result = await getRecipeProps({ params: { slug: 'published-recipe' } });
  expect(result.revalidate).toBe(10);
  expect(result.props).not.toHaveProperty('revalidate');
});

it('renders structured ingredients separately from instruction text', () => {
  const recipe = {
    name: 'Soup', mainImage: {},
    ingredient: [
      { _key: 'a', rawText: '2 pounds potatoes', name: 'potatoes' },
      { _key: 'b', wholeNumber: 1, fraction: '1/2', unit: 'tsp', name: 'salt' },
      { _key: 'c', wholeNumber: 0, fraction: '1/4', unit: 'tsp', name: 'pepper' },
      { _key: 'd', name: null },
    ],
    instructions: [{ _key: 'step', _type: 'block', style: 'normal', markDefs: [], children: [{ _key: 'text', _type: 'span', text: 'Simmer until tender.', marks: [] }] }],
  };
  const html = renderToStaticMarkup(createElement(Recipe, { data: { recipe } }));
  expect(html).toContain('<li>2 pounds potatoes</li>');
  expect(html).toContain('<li>1 1/2 tsp salt</li>');
  expect(html).toContain('<li>1/4 tsp pepper</li>');
  expect(html).toContain('<h2>Instructions</h2>');
  expect(html).toContain('Simmer until tender.');
  expect(html).not.toContain('<li></li>');
});

it('preserves legacy rich text without adding empty ingredient sections', () => {
  const recipe = { mainImage: {}, instructions: [{ _key: 'old', _type: 'block', style: 'h2', markDefs: [], children: [{ _key: 'text', _type: 'span', text: 'Ingredients', marks: [] }] }] };
  const html = renderToStaticMarkup(createElement(Recipe, { data: { recipe } }));
  expect(html).toContain('<h2>Ingredients</h2>');
  expect(html).not.toContain('ingredients-heading');
});

it('renders group titles as headings and keeps quantity-free ingredients in lists', () => {
  const recipe = { name: 'Curry', mainImage: {}, instructions: [], ingredientGroups: [
    { title: null, ingredients: [{ rawText: 'Fresh basil, to garnish' }] },
    { title: 'Curry Base', ingredients: [{ rawText: '1 teaspoon cumin' }, { rawText: 'Salt to taste' }] },
  ], ingredient: [{ rawText: 'stale legacy data' }] };
  const html = renderToStaticMarkup(createElement(Recipe, { data: { recipe } }));
  expect(html).toContain('<h3>Curry Base</h3>');
  expect(html).not.toContain('<li>Curry Base');
  expect(html).toContain('<li>Fresh basil, to garnish</li>');
  expect(html).toContain('<li>Salt to taste</li>');
  expect(html).not.toContain('stale legacy data');
});
