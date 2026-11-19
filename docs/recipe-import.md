# Recipe URL imports

Allowlisted admins can sign in at `/admin/sign-in` and continue to
`/admin/recipes/new`. Imports prefer complete Recipe JSON-LD and fall back to Anthropic extraction from
page text when structured data is missing or incomplete. Both paths require a name,
unambiguous positive serving count, ingredients, instructions, and a usable image.
Pages requiring JavaScript execution are not supported.

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
No ingredient matching or unit conversion is performed.

## LLM fallback

Set server-only `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` in `.env.local` and the
deployment environment. Select a model supporting JSON-schema structured outputs.
Structured imports do not require either setting. Fallback sends extracted page
text to Anthropic, never credentials or the full HTML. It uses one request with a
20-second timeout, no automatic retries, and an 8,000-token output cap.

Page preparation prefers `main`, then `article`, then the body; removes scripts,
styles and navigation; and preserves line boundaries. Empty text or text over
60,000 characters fails rather than being truncated. Images come from the page,
including incomplete JSON-LD, and still use the existing safe download pipeline.
Missing images, download failures and structured content-limit violations do not
trigger model calls. Missing/ambiguous servings, refusals, incomplete responses,
and invalid extracted fields fail the import rather than guessing missing data.

Imported recipes retain `sourceFormat: "structured"` or `"llm"` and remain pending
for review. Schema validation cannot guarantee that model output is faithful to
the source, so reviewers should check LLM-extracted content against the original.

## Extracted content safety

HTML is downloaded only into memory and is never saved to Sanity. Only the explicit
recipe fields and operational metadata are persisted. Cooking time is not part of
the current import schema. Recipe text is extracted with Cheerio `.text()` after
removing script/style and embedded-content nodes. Instructions become plain-text
Portable Text spans with no HTML or link marks; React renders these as text. If a
future feature preserves HTML formatting, add a dedicated HTML sanitizer before
allowing any HTML rendering. Cheerio is a parser, not an HTML sanitizer.

Validation runs again before any image upload or document write, enforcing types,
allowed units/fractions, positive finite servings (at most 10,000), names of at most
300 characters, at most 200 ingredients of 1,000 characters each, and at most 200
instructions of 10,000 characters each. Quantities must be finite and between zero
and 1,000,000. Only allowlisted fields survive validation. Excess image candidates
are capped at 100. Image URLs must use HTTP(S), contain no credentials or custom
ports, and be at most 4,096 characters. Downloads additionally validate public IPs,
pin DNS results, recheck redirects, and enforce MIME types, timeouts, and size limits.

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
