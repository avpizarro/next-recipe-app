import './server-only';
import { randomUUID } from 'node:crypto';
import { extractRecipe } from './recipe-extractor';
import { download } from './safe-download';
import { getWriteClient } from './sanity-write';
import { validateExtractedRecipe } from './recipe-validation';

export async function importRecipe(url, user) {
  const client = getWriteClient();
  const extracted = validateExtractedRecipe(await extractRecipe(url));
  const image = await download(extracted.imageCandidates[0], 'image');
  const asset = await client.assets.upload('image', image.body, { contentType: image.contentType });
  const id = randomUUID();
  const slugBase = extracted.name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'recipe';
  let transaction = client.transaction();
  const saveIngredient = ({ name, rawText, ...quantity }) => {
    const ingredientId = randomUUID();
    transaction = transaction.create({ _id: ingredientId, _type: 'ingredient', name });
    return { _key: randomUUID(), _type: 'object', ingredient: { _type: 'reference', _ref: ingredientId }, rawText, ...quantity };
  };
  const ingredientGroups = extracted.ingredientGroups?.map((group) => ({
    _key: randomUUID(), _type: 'ingredientGroup', title: group.title,
    ingredients: group.ingredients.map(saveIngredient),
  }));
  const ingredient = ingredientGroups ? undefined : extracted.ingredients.map(saveIngredient);
  const recipe = {
    _id: id, _type: 'recipe', name: extracted.name, slug: { _type: 'slug', current: `${slugBase}-${id}` },
    url, status: 'pending', servings: extracted.servings, submittedBy: user.id || user.email,
    sourceFormat: extracted.sourceFormat, likes: 0, ...(ingredientGroups ? { ingredientGroups } : { ingredient }),
    mainImage: { _type: 'image', asset: { _type: 'reference', _ref: asset._id } },
    instructions: extracted.instructions.map((step) => ({ _key: randomUUID(), _type: 'block', style: 'normal', markDefs: [],
      children: [{ _key: randomUUID(), _type: 'span', text: step, marks: [] }] })),
  };
  // Asset uploads cannot join this transaction. A failed commit may leave an unused
  // asset, but never a partially created recipe or orphan ingredient documents.
  await transaction.create(recipe).commit();
  return { id, name: recipe.name, status: recipe.status };
}
