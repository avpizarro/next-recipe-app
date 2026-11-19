import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { extractRecipe } from '../lib/recipe-extractor';
import { download } from '../lib/safe-download';
import { importRecipe } from '../lib/import-recipe';
import { getWriteClient } from '../lib/sanity-write';

const { parse } = vi.hoisted(() => ({ parse: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => ({ default: vi.fn(function () { this.messages = { parse }; }) }));
vi.mock('../lib/safe-download', async (original) => ({ ...await original(), download: vi.fn() }));
vi.mock('../lib/sanity-write', () => ({ getWriteClient: vi.fn() }));
const fixture = readFileSync(new URL('./fixtures/recipe-no-jsonld.html', import.meta.url), 'utf8');
const structured = readFileSync(new URL('./fixtures/recipe.html', import.meta.url), 'utf8');
const url = 'https://example.com/recipe';
const recipe = () => ({ name: 'Carrot soup', servings: 2, ingredientGroups: [{ title: null, ingredients: ['2 cups chopped carrots', '1/2 tsp salt'] }],
  instructions: ['Simmer carrots until tender.', 'Blend and season with salt.'] });
function page(html) { download.mockResolvedValueOnce({ body: Buffer.from(html), url }); }
beforeEach(() => {
  vi.clearAllMocks();
  download.mockReset();
  parse.mockReset().mockResolvedValue({ stop_reason: 'end_turn', parsed_output: recipe() });
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
  vi.stubEnv('ANTHROPIC_MODEL', 'test-model');
});
afterEach(() => vi.unstubAllEnvs());

it('uses structured data without initializing Anthropic, even without configuration', async () => {
  vi.stubEnv('ANTHROPIC_API_KEY', '');
  page(structured);
  expect(await extractRecipe(url)).toMatchObject({ sourceFormat: 'structured', servings: 4 });
  expect(Anthropic).not.toHaveBeenCalled();
});
it.each([fixture, fixture.replace('</head>', structured.replace('4 servings', 'unknown') + '</head>')])('falls back for absent or incomplete JSON-LD', async (html) => {
  page(html);
  expect(await extractRecipe(url)).toMatchObject({ name: 'Carrot soup', servings: 2, sourceFormat: 'llm',
    ingredients: [{ name: 'chopped carrots', rawText: '2 cups chopped carrots', wholeNumber: 2, unit: 'cup(s)' },
      { name: 'salt', rawText: '1/2 tsp salt', wholeNumber: 0, fraction: '1/2', unit: 'tsp' }] });
  expect(parse).toHaveBeenCalledOnce();
  expect(download).toHaveBeenCalledOnce();
});
it('checks later complete structured candidates before falling back', async () => {
  page(structured.replace('4 servings', 'unknown') + structured);
  expect(await extractRecipe(url)).toMatchObject({ sourceFormat: 'structured' });
  expect(parse).not.toHaveBeenCalled();
});
it('preserves line boundaries and excludes scripts and navigation from model input', async () => {
  page(fixture);
  const result = await extractRecipe(url);
  const input = parse.mock.calls[0][0].messages[0].content;
  expect(input).toContain('2 cups chopped carrots\n1/2 tsp salt');
  expect(input).not.toMatch(/execute code|Unrelated links/);
  expect(result.imageCandidates).toEqual(['https://example.com/soup.jpg']);
});
it.each([
  ['no image', fixture.replace('<meta property="og:image" content="/soup.jpg">', '')],
  ['excessive text', fixture.replace('Carrot soup', 'x'.repeat(60001))],
  ['oversized structured ingredients', structured.replace('2 pineapple', 'x'.repeat(1001))],
])('does not call Anthropic for %s', async (_, html) => {
  page(html);
  await expect(extractRecipe(url)).rejects.toThrow();
  expect(parse).not.toHaveBeenCalled();
});
it('does not call Anthropic when the page download fails', async () => {
  download.mockRejectedValueOnce(new Error('Unsafe URL'));
  await expect(extractRecipe(url)).rejects.toThrow('Unsafe URL');
  expect(parse).not.toHaveBeenCalled();
});
it('reports missing configuration only when fallback is needed', async () => {
  vi.stubEnv('ANTHROPIC_API_KEY', '');
  page(fixture);
  await expect(extractRecipe(url)).rejects.toMatchObject({ status: 503 });
  expect(parse).not.toHaveBeenCalled();
});
it.each(['max_tokens', 'refusal', 'end_turn'])('rejects incomplete responses (%s)', async (stop_reason) => {
  page(fixture);
  parse.mockResolvedValue({ stop_reason, parsed_output: stop_reason === 'end_turn' ? null : recipe() });
  await expect(extractRecipe(url)).rejects.toThrow('complete recipe');
});
it('maps provider errors without exposing diagnostics', async () => {
  page(fixture);
  parse.mockRejectedValue(new Error('Secret provider details'));
  await expect(extractRecipe(url)).rejects.toMatchObject({ status: 502, message: 'The recipe extraction service failed or timed out. Please try again.' });
});
it.each([{ servings: null }, { servings: '2–4' }, { ingredients: [12] }, { ingredients: ['x'.repeat(1001)] },
  { instructions: [] }, { name: null }])('rejects invalid output before any asset or document writes: %j', async (override) => {
  page(fixture);
  parse.mockResolvedValue({ stop_reason: 'end_turn', parsed_output: { ...recipe(), ...override, ...(override.ingredients ? { ingredientGroups: [{ title: null, ingredients: override.ingredients }] } : {}) } });
  const client = { assets: { upload: vi.fn() }, transaction: vi.fn() };
  getWriteClient.mockReturnValue(client);
  await expect(importRecipe(url, { id: 'admin' })).rejects.toThrow();
  expect(client.assets.upload).not.toHaveBeenCalled();
  expect(client.transaction).not.toHaveBeenCalled();
});
it('persists a usable pending LLM recipe through the existing import flow', async () => {
  page(fixture);
  download.mockResolvedValueOnce({ body: Buffer.from('image'), contentType: 'image/jpeg' });
  const transaction = { create: vi.fn().mockReturnThis(), commit: vi.fn().mockResolvedValue({}) };
  getWriteClient.mockReturnValue({ assets: { upload: vi.fn().mockResolvedValue({ _id: 'image-1' }) }, transaction: () => transaction });
  expect(await importRecipe(url, { id: 'admin' })).toMatchObject({ status: 'pending', name: 'Carrot soup' });
  const saved = transaction.create.mock.calls.map(([doc]) => doc).find((doc) => doc._type === 'recipe');
  expect(saved).toMatchObject({ sourceFormat: 'llm', status: 'pending', servings: 2 });
  expect(saved.ingredientGroups[0].ingredients).toHaveLength(2);
  expect(saved.instructions.map((block) => block.children[0].text)).toEqual(recipe().instructions);
});

it('uses the LLM to distinguish a list heading and saves only real ingredient records', async () => {
  page(readFileSync(new URL('./fixtures/recipe-groups.html', import.meta.url), 'utf8'));
  parse.mockResolvedValue({ stop_reason: 'end_turn', parsed_output: {
    name: 'Curry', servings: 2, instructions: ['Cook the curry base. Add the remaining ingredients.'],
    ingredientGroups: [
      { title: null, ingredients: ['2 tablespoons olive oil', 'Fresh basil, to garnish'] },
      { title: 'Curry Base', ingredients: ['1/4 cup olive oil', '1 teaspoon cumin', 'Salt to taste'] },
    ],
  } });
  download.mockResolvedValueOnce({ body: Buffer.from('image'), contentType: 'image/jpeg' });
  const transaction = { create: vi.fn().mockReturnThis(), commit: vi.fn().mockResolvedValue({}) };
  getWriteClient.mockReturnValue({ assets: { upload: vi.fn().mockResolvedValue({ _id: 'image-1' }) }, transaction: () => transaction });
  await importRecipe(url, { id: 'admin' });
  const docs = transaction.create.mock.calls.map(([doc]) => doc);
  expect(docs.filter((doc) => doc._type === 'ingredient')).toHaveLength(5);
  expect(docs.some((doc) => doc._type === 'ingredient' && /Curry Base/.test(doc.name))).toBe(false);
  const saved = docs.find((doc) => doc._type === 'recipe');
  expect(saved.sourceFormat).toBe('llm');
  expect(saved.ingredientGroups.map((group) => group.title)).toEqual([null, 'Curry Base']);
  expect(saved).not.toHaveProperty('ingredient');
});
