import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseRecipeHtml, parseIngredient } from '../lib/recipe-extractor';

const fixture = readFileSync(new URL('./fixtures/recipe.html', import.meta.url), 'utf8');
const url = 'https://example.com/recipe';
describe('structured recipe extraction', () => {
  it('extracts nested Recipe JSON-LD and ordered, resolved image candidates', () => {
    const recipe = parseRecipeHtml(fixture, url);
    expect(recipe).toMatchObject({ name: 'Mango & Pineapple', servings: 4, sourceFormat: 'structured',
      instructions: ['Chop the fruit.', 'Mix & serve.'],
      imageCandidates: ['https://example.com/hero.jpg', 'https://example.com/second.jpg', 'https://example.com/other.jpg'] });
    expect(recipe.ingredients).toEqual([
      { name: 'diced mango', rawText: '1 1/2 cups diced mango', wholeNumber: 1, fraction: '1/2', unit: 'cup(s)' },
      { name: 'salt', rawText: '½ tsp salt', wholeNumber: 0, fraction: '1/2', unit: 'tsp' },
      { name: 'pineapple', rawText: '2 pineapple', wholeNumber: 2 },
    ]);
  });
  it.each([false, true])('supports standalone objects and root arrays: %s', (array) => {
    const recipe = { '@type': 'https://schema.org/Recipe', name: 'Soup', recipeYield: 2, recipeIngredient: ['salt to taste'], recipeInstructions: 'Heat.\nServe.', image: '/soup.png' };
    expect(parseRecipeHtml(`<script type="application/ld+json">${JSON.stringify(array ? [recipe] : recipe)}</script>`, url)).toMatchObject({ name: 'Soup', instructions: ['Heat.', 'Serve.'] });
  });
  it.each(['4–6 servings', '12 cookies', '0', 'unknown'])('rejects ambiguous serving counts: %s', (yieldText) => {
    expect(() => parseRecipeHtml(fixture.replace('4 servings', yieldText), url)).toThrow('No complete Recipe');
  });
  it('rejects missing structured data and missing images', () => {
    expect(() => parseRecipeHtml('<h1>Soup</h1>', url)).toThrow('No complete Recipe');
    expect(() => parseRecipeHtml(fixture.replace(/"image":\[.*?\]/, '"image":[]').replace(/<meta.*?>|<img.*?>/g, ''), url)).toThrow('no usable image');
  });
  it('preserves unsupported quantities without guessing', () => {
    expect(parseIngredient('1/8 tsp salt')).toEqual({ name: '1/8 tsp salt', rawText: '1/8 tsp salt' });
  });
  it('drops unsafe image candidates and retains plain text from marked-up fields', () => {
    const modified = fixture.replace('Mango &amp; Pineapple', '<img src=x onerror=alert(1)>Mango &amp; Pineapple')
      .replace('"/second.jpg"', '"javascript:alert(1)", "data:image/png;base64,abc", "https://user:pass@example.com/image.jpg"');
    const recipe = parseRecipeHtml(modified, url);
    expect(recipe.name).toBe('Mango & Pineapple');
    expect(recipe.imageCandidates).toEqual(['https://example.com/hero.jpg', 'https://example.com/other.jpg']);
    expect(recipe).not.toHaveProperty('html');
  });
  it('rejects malformed ingredient entries instead of silently dropping them', () => {
    expect(() => parseRecipeHtml(fixture.replace('"2 pineapple"', '{"name":"pineapple"}'), url)).toThrow('ingredient list');
  });
  it('rejects excessive instruction nesting', () => {
    let steps = 'Stir.';
    for (let depth = 0; depth < 22; depth++) steps = { itemListElement: steps };
    const recipe = { '@type': 'Recipe', name: 'Soup', recipeYield: 2, recipeIngredient: ['salt'], recipeInstructions: steps, image: '/soup.jpg' };
    expect(() => parseRecipeHtml(`<script type="application/ld+json">${JSON.stringify(recipe)}</script>`, url)).toThrow('nested too deeply');
  });
});
