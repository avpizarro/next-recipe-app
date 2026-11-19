import './server-only';
import { load } from 'cheerio';
import { download } from './safe-download';
import { ImportError } from './import-error';


function text(value) {
  return typeof value === 'string' ? load(value).text().replace(/\s+/g, ' ').trim() : '';
}

function instructions(value) {
  if (Array.isArray(value)) return value.flatMap(instructions);
  if (typeof value === 'string') return value.split(/\n+/).map(text).filter(Boolean);
  if (value && typeof value === 'object') return instructions(value.itemListElement || value.text || '');
  return [];
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

export function parseRecipeHtml(html, pageUrl) {
  const $ = load(html);
  const candidates = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try { candidates.push(...recipes(JSON.parse($(element).text()))); } catch { /* A malformed unrelated script must not hide a valid recipe. */ }
  });
  for (const recipe of candidates) {
    const name = text(recipe.name);
    const count = servings(recipe.recipeYield);
    const steps = instructions(recipe.recipeInstructions);
    const ingredients = Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient.map(parseIngredient).filter((item) => item.name) : [];
    if (!name || !count || !steps.length || !ingredients.length) continue;
    const images = [recipe.image].flat().flatMap((value) => typeof value === 'string' ? [value] : value ? [value.url, value.contentUrl] : []);
    $('meta[property="og:image"], img').each((_, element) => images.push($(element).attr('content') || $(element).attr('src')));
    const imageCandidates = [...new Set(images.flatMap((value) => {
      if (typeof value !== 'string' || !value.trim()) return [];
      try { const url = new URL(value, pageUrl); return ['http:', 'https:'].includes(url.protocol) ? [url.href] : []; } catch { return []; }
    }))];
    if (!imageCandidates.length) throw new ImportError('The recipe has no usable image.');
    return { name, servings: count, ingredients, instructions: steps, imageCandidates, sourceFormat: 'structured' };
  }
  throw new ImportError('No complete Recipe JSON-LD was found. A name, serving count, ingredients, and instructions are required.');
}

export async function extractRecipe(url) {
  const page = await download(url);
  return parseRecipeHtml(page.body.toString('utf8'), page.url);
}
