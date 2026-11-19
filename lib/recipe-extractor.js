import './server-only';
import { load } from 'cheerio';
import { download, validateSourceUrl } from './safe-download';
import { ImportError } from './import-error';
import { extractRecipeText } from './recipe-llm';
import { plainText as text, RECIPE_LIMITS, validateExtractedRecipe } from './recipe-validation';

function instructions(value, depth = 0) {
  if (depth > 20) throw new ImportError('Recipe instructions are nested too deeply.');
  if (Array.isArray(value)) {
    if (value.length > RECIPE_LIMITS.instructions) throw new ImportError('The recipe has too many instructions.');
    return value.flatMap((step) => instructions(step, depth + 1));
  }
  if (typeof value === 'string') return value.split(/\n+/).map(text).filter(Boolean);
  if (value && typeof value === 'object') return instructions(value.itemListElement || value.text || '', depth + 1);
  throw new ImportError('The recipe has an invalid instruction structure.');
}

function recipes(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 30) return [];
  const types = [value['@type']].flat();
  const own = types.some((type) => typeof type === 'string' && /^(?:https?:\/\/schema.org\/)?Recipe$/.test(type)) ? [value] : [];
  return own.concat(Object.values(value).flatMap((child) => recipes(child, depth + 1)));
}

function servings(value) {
  for (const candidate of [value].flat()) {
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) return candidate;
    // Reject ranges and yields such as "12 cookies": neither specifies a serving count.
    const match = typeof candidate === 'string' && candidate.trim().match(/^(?:(?:serves|servings?:?)\s*)?(\d+(?:\.\d+)?)\s*(?:servings?|people|persons?)?$/i);
    if (match && Number(match[1]) > 0) return Number(match[1]);
  }
  return null;
}

export function parseIngredient(rawText) {
  const raw = text(rawText);
  const normalized = raw.replace(/[¼½¾⅓⅔]/g, (fraction) => ` ${{ '¼': '1/4', '½': '1/2', '¾': '3/4', '⅓': '1/3', '⅔': '2/3' }[fraction]}`).trim();
  const match = normalized.match(/^(?:(\d+)\s+)?(\d+\/\d+|\d+(?:\.\d+)?)\s+(.+)$/);
  if (!match) return { name: raw, rawText: raw };
  const [, whole, amount, remainder] = match;
  const units = { g: 'grams', gram: 'grams', grams: 'grams', cup: 'cup(s)', cups: 'cup(s)', tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp', oz: 'ounce(s)', ounce: 'ounce(s)', ounces: 'ounce(s)' };
  const unitMatch = remainder.match(/^(\S+)\s+(.+)$/);
  const unit = unitMatch && units[unitMatch[1].toLowerCase()];
  // Unsupported fractions/units remain lossless in the original line for later review.
  if (amount.includes('/') && !['1/2', '1/3', '1/4', '3/4', '2/3'].includes(amount)) return { name: raw, rawText: raw };
  return { name: unit ? unitMatch[2] : remainder, rawText: raw,
    wholeNumber: amount.includes('/') ? Number(whole || 0) : Number(amount),
    ...(amount.includes('/') ? { fraction: amount } : {}), ...(unit ? { unit } : {}) };
}

class IncompleteRecipeError extends ImportError {}

function imageCandidates($, candidates, pageUrl) {
  const images = candidates.flatMap((recipe) => [recipe.image].flat().flatMap((value) =>
    typeof value === 'string' ? [value] : value ? [value.url, value.contentUrl] : []));
  $('meta[property="og:image"], img').each((_, element) => images.push($(element).attr('content') || $(element).attr('src')));
  const urls = [...new Set(images.flatMap((value) => {
    if (typeof value !== 'string' || !value.trim()) return [];
    try { return [validateSourceUrl(new URL(value, pageUrl).href).href]; } catch { return []; }
  }))].slice(0, RECIPE_LIMITS.images);
  if (!urls.length) throw new ImportError('The recipe has no usable image.');
  return urls;
}

function structuredCandidates($) {
  const candidates = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try { candidates.push(...recipes(JSON.parse($(element).text()))); } catch { /* A malformed unrelated script must not hide a valid recipe. */ }
  });
  return candidates;
}

export function parseRecipeHtml(html, pageUrl) {
  const $ = load(html);
  const candidates = structuredCandidates($);
  for (const recipe of candidates) {
    if (typeof recipe.name !== 'string' || !recipe.recipeInstructions || !Array.isArray(recipe.recipeIngredient)) continue;
    if (recipe.recipeIngredient.length > RECIPE_LIMITS.ingredients || recipe.recipeIngredient.some((line) => typeof line !== 'string' || !line.trim() || line.length > RECIPE_LIMITS.ingredient)) {
      throw new ImportError('The recipe has an invalid or oversized ingredient list.');
    }
    const name = text(recipe.name);
    const count = servings(recipe.recipeYield);
    const steps = instructions(recipe.recipeInstructions);
    const ingredients = Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient.map(parseIngredient).filter((item) => item.name) : [];
    if (!name || !count || !steps.length || !ingredients.length) continue;
    return validateExtractedRecipe({ name, servings: count, ingredients, instructions: steps,
      imageCandidates: imageCandidates($, [recipe], pageUrl), sourceFormat: 'structured' });
  }
  throw new IncompleteRecipeError('No complete Recipe JSON-LD was found. A name, serving count, ingredients, and instructions are required.');
}

export async function extractRecipe(url) {
  const page = await download(url);
  const html = page.body.toString('utf8');
  try { return parseRecipeHtml(html, page.url); } catch (error) {
    // Only missing recipe data merits a fallback; download and safety errors do not.
    if (!(error instanceof IncompleteRecipeError)) throw error;
  }
  const $ = load(html);
  const images = imageCandidates($, structuredCandidates($), page.url);
  $('script, style, iframe, object, template, nav, footer, aside, [hidden]').remove();
  const content = $('main').first().length ? $('main').first() : $('article').first().length ? $('article').first() : $('body');
  // Keep line boundaries so ingredient lists and ordered steps remain distinguishable.
  content.find('br').replaceWith('\n');
  content.find('p, li, h1, h2, h3, h4, div, section').append('\n');
  const pageText = content.text().split(/\n+/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
  const result = await extractRecipeText(pageText);
  return validateExtractedRecipe({ ...result, ingredients: result.ingredients.map(parseIngredient),
    imageCandidates: images, sourceFormat: 'llm' });
}
