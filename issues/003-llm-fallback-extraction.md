## Parent PRD

`issues/prd.md`

## What to build

Extend the Recipe Extractor module from `issues/002-submit-recipe-from-url.md` with an LLM fallback path (via the Anthropic API), used when a page's `schema.org/Recipe` JSON-LD is missing or incomplete. Reuses the same submission flow — no new UI needed. The extractor's output gains a `sourceFormat: "structured" | "llm"` flag so later slices (the review page) can indicate which submissions came from the more failure-prone LLM path.

Per the PRD's "Recipe extraction pipeline" section.

## Acceptance criteria

- [ ] Submitting a URL whose page has valid JSON-LD still uses the structured-data path (LLM is not called).
- [ ] Submitting a URL whose page has no (or incomplete) JSON-LD triggers the LLM fallback and still produces a usable pending recipe (name, servings, ingredients, instructions).
- [ ] The extractor's output includes `sourceFormat` reflecting which path was used.
- [ ] LLM fallback path is unit tested against a fixture page with no JSON-LD, with the LLM call mocked.

## Blocked by

- Blocked by `issues/002-submit-recipe-from-url.md`

## User stories addressed

- User story 1 (LLM fallback path)
