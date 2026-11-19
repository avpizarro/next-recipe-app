import { load } from 'cheerio';
import { ImportError } from './import-error';
import { validateSourceUrl } from './safe-download';

export const RECIPE_LIMITS = Object.freeze({ name: 300, ingredient: 1000, ingredients: 200, instruction: 10000, instructions: 200, images: 100, servings: 10000, quantity: 1000000 });

export function plainText(value) {
  if (typeof value !== 'string') return '';
  const $ = load(value);
  $('script, style, iframe, object, template').remove();
  return $.text().replace(/\s+/g, ' ').trim();
}

function invalid(field) {
  throw new ImportError(`The extracted recipe has an invalid or oversized ${field}.`);
}

function string(value, limit, field) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) invalid(field);
  // The extractor already decoded HTML to text. Parsing again would interpret
  // literal text such as "< 5 minutes" or encoded tags as markup a second time.
  return value.trim();
}

function list(value, limit, field) {
  if (!Array.isArray(value) || !value.length || value.length > limit) invalid(field);
  return value;
}

function validateIngredient(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) invalid('ingredient');
  const ingredient = { name: string(item.name, RECIPE_LIMITS.ingredient, 'ingredient name'), rawText: string(item.rawText, RECIPE_LIMITS.ingredient, 'ingredient line') };
  if (item.wholeNumber !== undefined) {
    if (typeof item.wholeNumber !== 'number' || !Number.isFinite(item.wholeNumber) || item.wholeNumber < 0 || item.wholeNumber > RECIPE_LIMITS.quantity) invalid('ingredient quantity');
    ingredient.wholeNumber = item.wholeNumber;
  }
  if (item.fraction !== undefined) {
    if (!['1/2', '1/3', '1/4', '3/4', '2/3'].includes(item.fraction)) invalid('ingredient fraction');
    ingredient.fraction = item.fraction;
  }
  if (item.unit !== undefined) {
    if (!['grams', 'cup(s)', 'tbsp', 'tsp', 'ounce(s)'].includes(item.unit)) invalid('ingredient unit');
    ingredient.unit = item.unit;
  }
  return ingredient;
}

// Return a new, allowlisted shape: never pass scraped objects directly to Sanity.
// This boundary also protects future extraction strategies before any asset upload.
export function validateExtractedRecipe(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('structure');
  if (typeof value.servings !== 'number' || !Number.isFinite(value.servings) || value.servings <= 0 || value.servings > RECIPE_LIMITS.servings) invalid('serving count');
  if (!['structured', 'llm'].includes(value.sourceFormat)) invalid('source format');
  let ingredientGroups;
  if (value.ingredientGroups !== undefined) {
    ingredientGroups = list(value.ingredientGroups, 30, 'ingredient groups').map((group) => {
      if (!group || typeof group !== 'object' || Array.isArray(group)) invalid('ingredient group');
      return { title: group.title === null ? null : string(group.title, 300, 'ingredient group title'),
        ingredients: list(group.ingredients, RECIPE_LIMITS.ingredients, 'ingredient list').map(validateIngredient) };
    });
  }
  // Groups are authoritative; the flat view is derived for existing consumers.
  const ingredients = ingredientGroups ? ingredientGroups.flatMap((group) => group.ingredients)
    : list(value.ingredients, RECIPE_LIMITS.ingredients, 'ingredient list').map(validateIngredient);
  list(ingredients, RECIPE_LIMITS.ingredients, 'ingredient list');
  return {
    name: string(value.name, RECIPE_LIMITS.name, 'name'),
    servings: value.servings,
    sourceFormat: value.sourceFormat,
    ingredients,
    ...(ingredientGroups ? { ingredientGroups } : {}),
    instructions: list(value.instructions, RECIPE_LIMITS.instructions, 'instruction list').map((step) => string(step, RECIPE_LIMITS.instruction, 'instruction')),
    imageCandidates: list(value.imageCandidates, RECIPE_LIMITS.images, 'image list').map((url) => {
      if (typeof url !== 'string' || url.length > 4096) invalid('image URL');
      return validateSourceUrl(url).href;
    }),
  };
}
