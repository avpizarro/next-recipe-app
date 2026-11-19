import { createClient } from 'next-sanity';

// Dry run by default. Only historical, non-draft recipes lacking a status qualify.
if (!process.env.SANITY_WRITE_TOKEN) throw new Error('Set SANITY_WRITE_TOKEN before running this script.');
const client = createClient({ projectId: 'bn64ftjo', dataset: 'production', apiVersion: '2021-03-25', useCdn: false, token: process.env.SANITY_WRITE_TOKEN });
const recipes = await client.fetch('*[_type == "recipe" && !defined(status) && !(_id in path("drafts.**"))]{_id, _rev, name}');
console.log(JSON.stringify(recipes, null, 2));
if (!process.argv.includes('--apply')) {
  console.log(`Dry run: ${recipes.length} existing recipes would become published. Review these records before rerunning with --apply.`);
} else if (recipes.length) {
  let transaction = client.transaction();
  for (const recipe of recipes) {
    transaction = transaction.patch(recipe._id, (patch) => patch.ifRevisionId(recipe._rev).set({ status: 'published' }));
  }
  await transaction.commit();
  console.log(`Marked ${recipes.length} existing recipes published.`);
}
