import './server-only';
import { matchIngredient } from './ingredient-matcher';
import { randomUUID } from 'node:crypto';
import { extractRecipe } from './recipe-extractor';
import { download } from './safe-download';
import { getWriteClient } from './sanity-write';
import { validateExtractedRecipe } from './recipe-validation';

export async function importRecipe(url, user) {
  const client = getWriteClient();
  const extracted = validateExtractedRecipe(await extractRecipe(url));
  // Read once, before uploading assets. A lookup failure must not become "all new".
  const existingIngredients = await client.fetch(
    '*[_type == "ingredient" && !(_id in path("drafts.**")) && !(_id in path("versions.**"))]{_id, name}'
  );
  const image = await download(extracted.imageCandidates[0], 'image');
  const asset = await client.assets.upload('image', image.body, { contentType: image.contentType });
  const id = randomUUID();
  const slugBase = extracted.name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'recipe';
  const transaction = client.transaction();
  const saveIngredient = ({ name, rawText, ...quantity }) => {
    const { suggestedMatch, confidence, normalizedName } = matchIngredient(name, existingIngredients);
    return {
      _key: randomUUID(), _type: 'object', rawText, ...quantity,
      parsedName: name, normalizedName, matchConfidence: confidence, resolutionStatus: 'unresolved',
      ...(suggestedMatch ? { suggestedIngredient: { _type: 'reference', _ref: suggestedMatch._id } } : {}),
    };
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
  // asset, but never a partially created recipe. Ingredients are created only during review.
  await transaction.create(recipe).commit();
  return { id, name: recipe.name, status: recipe.status };
}
