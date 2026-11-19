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
  client = { assets: { upload: vi.fn().mockResolvedValue({ _id: 'image-123' }) }, transaction: () => transaction };
  getWriteClient.mockReturnValue(client);
  download.mockReset().mockResolvedValueOnce({ body: html, url: 'https://example.com/recipe' }).mockResolvedValueOnce({ body: Buffer.from('image'), contentType: 'image/jpeg' });
});
it('imports fixture HTML into one pending recipe with fresh ingredient references and Portable Text', async () => {
  const result = await importRecipe('https://example.com/recipe', { id: 'admin-1', email: 'owner@example.com' });
  expect(result.status).toBe('pending');
  const recipe = documents.find((doc) => doc._type === 'recipe');
  const ingredients = documents.filter((doc) => doc._type === 'ingredient');
  expect(recipe).toMatchObject({ status: 'pending', servings: 4, submittedBy: 'admin-1', name: 'Mango & Pineapple', mainImage: { asset: { _ref: 'image-123' } } });
  expect(recipe.instructions.map((block) => block.children[0].text)).toEqual(['Chop the fruit.', 'Mix & serve.']);
  expect(recipe.ingredient.map((line) => line.ingredient._ref)).toEqual(ingredients.map((doc) => doc._id));
  expect(new Set(ingredients.map((doc) => doc._id)).size).toBe(3);
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
