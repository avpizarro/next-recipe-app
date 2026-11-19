import { expect, it } from 'vitest';
import { matchIngredient, normalizeIngredientName } from '../lib/ingredient-matcher';

const existing = [
  { _id: 'mango', name: 'Mango' }, { _id: 'pineapple', name: 'Pineapple' },
  { _id: 'tequila', name: 'Tequila' }, { _id: 'tomato', name: 'Tomato' },
  { _id: 'milk', name: 'Milk' }, { _id: 'powder', name: 'Baking Powder' },
];

it.each(['Mango', '  MANGO ', 'mangoes'])('matches normalized exact name %s', (name) => {
  expect(matchIngredient(name, existing)).toEqual({ suggestedMatch: existing[0], confidence: 1, normalizedName: 'Mango' });
});
it('suggests a close spelling match', () => {
  expect(matchIngredient('pineaple', existing)).toMatchObject({ suggestedMatch: existing[1], normalizedName: 'Pineaple' });
  expect(matchIngredient('pineaple', existing).confidence).toBeGreaterThan(0.8);
});
it.each(['Saffron', 'Almond milk', 'Baking soda', 'Millet', ''])('does not suggest an unrelated ingredient for %s', (name) => {
  expect(matchIngredient(name, existing).suggestedMatch).toBeNull();
});
it.each([
  ['diced tomatoes', 'Tomato'], ['finely chopped onions', 'Onion'],
  ['Heinz crushed tomatoes', 'Tomato'], ['grated potatoes', 'Potato'],
  ['Molasses', 'Molasses'], ['asparagus', 'Asparagus'], ['Swiss cheese', 'Swiss Cheese'],
  ['basil leaves', 'Basil Leaf'], ['olive oil', 'Olive Oil'], ['Salt to taste', 'Salt'],
])('normalizes %s to %s', (input, output) => {
  expect(normalizeIngredientName(input)).toBe(output);
});
it('normalizes existing names too without mutating the fixture', () => {
  const ingredients = [{ _id: 'tomato', name: 'Tomatoes' }];
  expect(matchIngredient('diced tomatoes', ingredients).suggestedMatch).toEqual(ingredients[0]);
  expect(ingredients[0].name).toBe('Tomatoes');
});
it('returns no suggestion for duplicate exact names or tied fuzzy candidates regardless of order', () => {
  for (const ingredients of [
    [{ _id: 'a', name: 'Tomato' }, { _id: 'b', name: 'Tomatoes' }],
    [{ _id: 'a', name: 'Mango' }, { _id: 'b', name: 'Tango' }],
  ]) {
    const name = ingredients[0].name === 'Tomato' ? 'tomato' : 'pango';
    expect(matchIngredient(name, ingredients).suggestedMatch).toBeNull();
    expect(matchIngredient(name, [...ingredients].reverse()).suggestedMatch).toBeNull();
  }
});
it('handles an empty catalog and preparation-only input without matching blank names', () => {
  expect(matchIngredient('tomatoes', [])).toEqual({ suggestedMatch: null, confidence: 0, normalizedName: 'Tomato' });
  expect(matchIngredient('diced', [{ _id: 'bad', name: '' }]).suggestedMatch).toBeNull();
});
