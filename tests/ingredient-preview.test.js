import { expect, it } from 'vitest';
import recipe from '../studio/schemas/recipe';

const flatEntry = recipe.fields.find((field) => field.name === 'ingredient').of[0];
const groupedEntry = recipe.fields.find((field) => field.name === 'ingredientGroups')
  .of[0].fields.find((field) => field.name === 'ingredients').of[0];

// Exercise the stored line through the preview selection as Studio would, so
// pending imports cannot silently depend on a finalized ingredient reference.
function preview(line, entry) {
  const selection = Object.fromEntries(Object.entries(entry.preview.select).map(([key, path]) =>
    [key, path.split('.').reduce((value, segment) => value?.[segment], line)]));
  return entry.preview.prepare(selection);
}

it.each([flatEntry, groupedEntry])('labels unresolved, legacy, and incomplete ingredient entries', (entry) => {
  expect(preview({ normalizedName: 'Tomato', rawText: '2 diced tomatoes' }, entry).title).toBe('Tomato');
  expect(preview({ ingredient: { name: 'Mango' }, normalizedName: 'Tomato' }, entry).title).toBe('Mango');
  expect(preview({ suggestedIngredient: { name: 'Tomato' } }, entry).title).toBe('Tomato');
  expect(preview({ normalizedName: ' ', parsedName: 'diced tomatoes' }, entry).title).toBe('diced tomatoes');
  expect(preview({ rawText: '2 diced tomatoes' }, entry).title).toBe('2 diced tomatoes');
  expect(preview({}, entry).title).toBe('Ingredient needs a name');
});
