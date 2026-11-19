import { readFileSync } from 'node:fs';
import { beforeEach, expect, it, vi } from 'vitest';
import { importRecipe } from '../lib/import-recipe';
import { download } from '../lib/safe-download';
import { getWriteClient } from '../lib/sanity-write';

vi.mock('../lib/safe-download', async (importOriginal) => ({ ...await importOriginal(), download: vi.fn() }));
vi.mock('../lib/sanity-write', () => ({ getWriteClient: vi.fn() }));
const html = readFileSync(new URL('./fixtures/recipe.html', import.meta.url));
let documents, client;
beforeEach(() => {
  documents = [];
  const transaction = { create: vi.fn((doc) => { documents.push(doc); return transaction; }), commit: vi.fn().mockResolvedValue({}) };
  client = { fetch: vi.fn().mockResolvedValue([{ _id: 'mango', name: 'Mango' }, { _id: 'pineapple', name: 'Pineapple' }]), assets: { upload: vi.fn().mockResolvedValue({ _id: 'image-123' }) }, transaction: () => transaction };
  getWriteClient.mockReturnValue(client);
  download.mockReset().mockResolvedValueOnce({ body: html, url: 'https://example.com/recipe' }).mockResolvedValueOnce({ body: Buffer.from('image'), contentType: 'image/jpeg' });
});
it('imports fixture HTML into one pending recipe with unresolved ingredient suggestions and Portable Text', async () => {
  const result = await importRecipe('https://example.com/recipe', { id: 'admin-1', email: 'owner@example.com' });
  expect(result.status).toBe('pending');
  const recipe = documents.find((doc) => doc._type === 'recipe');
  const ingredients = documents.filter((doc) => doc._type === 'ingredient');
  expect(recipe).toMatchObject({ status: 'pending', servings: 4, submittedBy: 'admin-1', name: 'Mango & Pineapple', mainImage: { asset: { _ref: 'image-123' } } });
  expect(recipe.instructions.map((block) => block.children[0].text)).toEqual(['Chop the fruit.', 'Mix & serve.']);
  expect(ingredients).toEqual([]);
  expect(recipe.ingredient.map((line) => line.suggestedIngredient?._ref)).toEqual(['mango', undefined, 'pineapple']);
  expect(recipe.ingredient.map((line) => line.normalizedName)).toEqual(['Mango', 'Salt', 'Pineapple']);
  expect(recipe.ingredient.every((line) => line.resolutionStatus === 'unresolved' && !line.ingredient)).toBe(true);
  expect(recipe.ingredient[0]).toMatchObject({ rawText: '1 1/2 cups diced mango', wholeNumber: 1, fraction: '1/2', unit: 'cup(s)' });
  expect(client.fetch).toHaveBeenCalledOnce();
  expect(client.fetch.mock.calls[0][0]).toContain('!(_id in path("drafts.**"))');
  expect(download).toHaveBeenLastCalledWith('https://example.com/hero.jpg', 'image');
  expect(client.transaction().commit).toHaveBeenCalledOnce();
});
it('does not create documents when image upload fails', async () => {
  client.assets.upload.mockRejectedValue(new Error('Upload failed'));
  await expect(importRecipe('https://example.com/recipe', { id: 'admin' })).rejects.toThrow('Upload failed');
  expect(documents).toEqual([]);
  expect(client.transaction().commit).not.toHaveBeenCalled();
});
it('does not report success when the transaction fails', async () => {
  client.transaction().commit.mockRejectedValue(new Error('Commit failed'));
  await expect(importRecipe('https://example.com/recipe', { id: 'admin' })).rejects.toThrow('Commit failed');
});

it('fails before uploading or writing when ingredient lookup fails', async () => {
  client.fetch.mockRejectedValue(new Error('Lookup failed'));
  await expect(importRecipe('https://example.com/recipe', { id: 'admin' })).rejects.toThrow('Lookup failed');
  expect(client.assets.upload).not.toHaveBeenCalled();
  expect(documents).toEqual([]);
});
it('persists a fuzzy proposal without creating a duplicate ingredient', async () => {
  client.fetch.mockResolvedValue([{ _id: 'pineapple', name: 'Pineapples' }, { _id: 'mango', name: 'Manggo' }]);
  await importRecipe('https://example.com/recipe', { id: 'admin' });
  expect(documents).toHaveLength(1);
  expect(documents[0].ingredient[0]).toMatchObject({ suggestedIngredient: { _ref: 'mango' }, resolutionStatus: 'unresolved' });
  expect(documents[0].ingredient[0].matchConfidence).toBeGreaterThanOrEqual(0.8);
});
