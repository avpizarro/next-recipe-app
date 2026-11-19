# Recipe URL imports

Allowlisted admins can sign in at `/admin/sign-in` and continue to
`/admin/recipes/new`. Imports require complete Recipe JSON-LD with a name,
unambiguous positive serving count, ingredients, instructions, and a usable image.
Pages requiring JavaScript execution or LLM extraction are not supported yet.

Configure `SANITY_WRITE_TOKEN` in `.env.local` and the deployment environment with
permission to create documents and upload image assets. Never use a `NEXT_PUBLIC_`
variable for this token. Existing Better Auth configuration is also required.

The first image candidate is uploaded automatically. Failure to download/upload
it fails the import rather than silently selecting a different image. New ingredient
documents and the pending recipe are committed in a single transaction. An upload
followed by a failed transaction can leave an unused image asset. Import retries
create new recipes; URL deduplication is not implemented in this slice.

Ingredient parsing handles simple quantities and the existing schema's units and
fractions. Original lines are retained in `ingredient[].rawText` for later review.
No ingredient matching, unit conversion, or LLM fallback is performed.

## Rollout

Public app queries now require `status == "published"`; pending, rejected, and
status-less records are excluded. Before deploying, review existing live records:

```sh
node --env-file=.env.local scripts/backfill-recipe-status.mjs
```

After reviewing the dry-run output, explicitly apply the backfill:

```sh
node --env-file=.env.local scripts/backfill-recipe-status.mjs --apply
```

The backfill excludes drafts and records that already have a status. Revision
checks prevent overwriting documents changed since the dry-run query in that run.
Deploy the updated Studio schema along with the app. The review/publish app UI is
a later issue; imported records can currently be inspected in Studio.

Application filters do not make a public Sanity dataset private. If direct Content
Lake reads must also hide pending documents and submitter IDs, configure dataset
access separately before production use. Public app projections omit submitter IDs.

Run `npm test` and `npm run build` to validate. A live smoke test requires an
allowlisted Google session, a configured write token, and a JSON-LD recipe URL.
