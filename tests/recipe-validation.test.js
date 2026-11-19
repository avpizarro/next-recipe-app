import { expect, it, vi } from 'vitest';
import { validateExtractedRecipe, plainText } from '../lib/recipe-validation';
import { importRecipe } from '../lib/import-recipe';
import { extractRecipe } from '../lib/recipe-extractor';
import { getWriteClient } from '../lib/sanity-write';

vi.mock('../lib/recipe-extractor', () => ({ extractRecipe: vi.fn() }));
vi.mock('../lib/sanity-write', () => ({ getWriteClient: vi.fn() }));
const valid = () => ({ name: 'Soup', servings: 2, ingredients: [{ name: 'salt', rawText: '1 tsp salt', wholeNumber: 1, unit: 'tsp' }], instructions: ['Stir.'], imageCandidates: ['https://example.com/image.jpg'], sourceFormat: 'structured' });

it.each([
  { name: 'x'.repeat(301) }, { name: { html: 'Soup' } },
  { servings: Infinity }, { servings: '2' }, { servings: 10001 },
  { instructions: ['x'.repeat(10001)] }, { instructions: Array(201).fill('Stir.') }, { instructions: [{ text: 'Stir.' }] },
  { ingredients: Array(201).fill({ name: 'salt', rawText: 'salt' }) },
  { ingredients: [{ name: 'salt', rawText: 'salt', wholeNumber: NaN }] },
  { ingredients: [{ name: 'salt', rawText: 'salt', unit: 'malicious' }] },
  { imageCandidates: ['javascript:alert(1)'] }, { imageCandidates: ['data:image/png;base64,abc'] },
  { imageCandidates: ['https://user:password@example.com/image.jpg'] },
  { imageCandidates: ['https://example.com:8080/image.jpg'] },
  { imageCandidates: ['https://example.com/' + 'x'.repeat(4096)] },
])('rejects invalid extracted fields before uploading or creating anything: %j', async (override) => {
  const extracted = { ...valid(), ...override };
  expect(() => validateExtractedRecipe(extracted)).toThrow();
  const upload = vi.fn();
  const transaction = vi.fn();
  getWriteClient.mockReturnValue({ assets: { upload }, transaction });
  extractRecipe.mockResolvedValue(extracted);
  await expect(importRecipe('https://example.com/recipe', { id: 'admin' })).rejects.toThrow();
  expect(upload).not.toHaveBeenCalled();
  expect(transaction).not.toHaveBeenCalled();
});

it('only retains allowlisted fields, including on ingredient objects', () => {
  const recipe = valid();
  recipe.html = '<html>Entire page</html>';
  recipe.status = 'published';
  recipe.ingredients[0]._ref = 'attacker-document';
  recipe.ingredients[0].html = '<script>bad()</script>';
  const result = validateExtractedRecipe(recipe);
  expect(result).toEqual(valid());
});

it('extracts text without executable nodes, attributes, or formatting', () => {
  expect(plainText('<style>bad CSS</style><script>bad JS</script><p onclick="bad()">Mix <b>well</b>.</p><img src=x onerror="bad()">')).toBe('Mix well.');
});

it('does not decode already extracted plain text again', () => {
  const recipe = valid();
  recipe.instructions = ['Use <b> as a literal label & wait < 5 minutes.'];
  expect(validateExtractedRecipe(recipe).instructions).toEqual(recipe.instructions);
});
