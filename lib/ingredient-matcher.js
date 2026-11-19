// Deliberately bounded vocabulary: unknown brands/phrases stay visible for review.
const BRANDS = /\b(?:heinz|hellmann['’]?s|mccormick|mckenzie['’]?s|watties|wattie['’]?s|arnott['’]?s|coles|woolworths)\b/gi;
const PREPARATION = /\b(?:(?:finely|roughly|thinly|freshly)\s+)?(?:diced|chopped|sliced|minced|peeled|grated|shredded|crushed|rinsed|drained|seeded|deseeded)\b/gi;
const SINGULARS = { tomatoes: 'tomato', potatoes: 'potato', mangoes: 'mango', leaves: 'leaf', halves: 'half', knives: 'knife', berries: 'berry', cherries: 'cherry', strawberries: 'strawberry', blueberries: 'blueberry', raspberries: 'raspberry', chillies: 'chilli', chilies: 'chili', anchovies: 'anchovy', olives: 'olive' };
const UNCHANGED = new Set(['molasses', 'couscous', 'hummus', 'asparagus', 'watercress', 'cress', 'swiss', 'citrus', 'anise', 'rice', 'oats']);

function singular(word) {
  if (SINGULARS[word]) return SINGULARS[word];
  if (UNCHANGED.has(word)) return word;
  if (/(?:ches|shes|xes|sses)$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && /s$/.test(word) && !/(?:ss|us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

export function normalizeIngredientName(name) {
  const words = name.normalize('NFKC').toLowerCase().replace(BRANDS, '').replace(PREPARATION, '')
    .replace(/\b(?:to taste|for garnish|to garnish)\b/g, '')
    .replace(/[,;()]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  // Singularize the noun before "of" (e.g. cloves of garlic), or the final noun.
  const noun = words.includes('of') ? words.indexOf('of') - 1 : words.length - 1;
  if (noun >= 0) words[noun] = singular(words[noun]);
  return words.map((word) => word.replace(/(^|[-’'])\p{L}/gu, (letter) => letter.toUpperCase())).join(' ');
}

function distance(left, right) {
  let previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i++) {
    const current = [i];
    for (let j = 1; j <= right.length; j++) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[right.length];
}

function similarity(left, right) {
  if (left === right) return 1;
  const a = left.split(' '), b = right.split(' ');
  // Never discard distinguishing words: almond milk must not match milk.
  if (a.length !== b.length) return 0;
  let edits = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    const length = Math.max(a[i].length, b[i].length);
    if (length < 5 || Math.abs(a[i].length - b[i].length) > 1) return 0;
    const change = distance(a[i], b[i]);
    if (change > 1) return 0;
    edits += change;
  }
  return 1 - edits / Math.max(left.length, right.length);
}

/** Confidence is a similarity score, not a probability. All suggestions need review. */
export function matchIngredient(parsedName, existingIngredients) {
  const normalizedName = normalizeIngredientName(parsedName);
  if (!normalizedName) return { suggestedMatch: null, confidence: 0, normalizedName };
  const candidates = existingIngredients.filter(({ _id, name }) => _id && typeof name === 'string' && name.trim())
    .map((ingredient) => ({ ingredient, score: similarity(normalizedName.toLowerCase(), normalizeIngredientName(ingredient.name).toLowerCase()) }))
    .sort((a, b) => b.score - a.score);
  const best = candidates[0];
  // Duplicate exact names are also ambiguous; don't resolve ties by input order.
  if (!best || best.score < 0.8 || (candidates[1] && best.score - candidates[1].score < 0.1)) {
    return { suggestedMatch: null, confidence: 0, normalizedName };
  }
  return { suggestedMatch: { _id: best.ingredient._id, name: best.ingredient.name }, confidence: best.score, normalizedName };
}
