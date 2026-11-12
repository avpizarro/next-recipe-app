## Parent PRD

`issues/prd.md`

## Scope

Admin-only recipe import remains active. Public recipe submissions and ordinary user accounts are deferred.

## What to build

The first end-to-end path for adding a recipe: an allowlisted admin pastes a URL, the app extracts the recipe using the `schema.org/Recipe` JSON-LD path only (no LLM fallback yet), and writes a new `recipe` document with `status: "pending"`. This slice intentionally uses the simplest possible ingredient and image handling so the full path (UI → API → extractor → Sanity write) exists end-to-end; later slices replace the naive parts.

Per the PRD's "Implementation Decisions" and "Recipe extraction pipeline" sections:
- Build the Recipe Extractor module's JSON-LD parsing path: `extractRecipe(url) → { name, servings, ingredients[], instructions, imageCandidates[], sourceFormat: "structured" }`.
- Add the new `recipe` schema fields: `status`, `servings`, `submittedBy`.
- For this slice only: automatically use the first image candidate as the main image (no picker UI yet — that's a later slice), and automatically create a new `ingredient` document for every parsed ingredient name with no matching/dedup (that's a later slice).

## Acceptance criteria

- [ ] An allowlisted admin can submit a URL via a form in the app.
- [ ] Unauthenticated visitors and non-allowlisted accounts cannot access the submission form or API; authorization runs before extraction or Sanity writes.
- [ ] For a URL whose page has valid `schema.org/Recipe` JSON-LD, submitting it creates a `recipe` document with `status: "pending"`, correct `name`, `servings`, `instructions`, ingredient references (newly created `ingredient` docs, one per parsed ingredient), a `mainImage` (from the first image candidate, uploaded as a Sanity asset), and `submittedBy` recording the submitting admin.
- [ ] The pending recipe does not appear on the public homepage/recipe listing and cannot be read through a public recipe detail URL. Published recipes remain accessible without login.
- [ ] Recipe Extractor's JSON-LD parsing is unit tested against fixture HTML containing valid JSON-LD.

## Blocked by

- Blocked by `issues/001-auth-foundation.md`

## User stories addressed

- User story 1
- User story 3
