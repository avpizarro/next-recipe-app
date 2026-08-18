## Parent PRD

`issues/prd.md`

## What to build

Implement the Ingredient Matcher module and wire it into the submission flow, replacing the "always create a new ingredient document" behavior from `issues/002-submit-recipe-from-url.md` with fuzzy matching against existing `ingredient` documents.

Per the PRD's "Ingredient matching & naming" section and the "Ingredient Matcher" module spec: `matchIngredient(parsedName, existingIngredients) → { suggestedMatch, confidence, normalizedName }`. This slice wires the module into submission so a proposed match (or "no match — will create new") is attached to each parsed ingredient line; final human confirmation of these proposals happens in the review page (`issues/007-review-ingredient-match-confirmation.md`), not here.

## Acceptance criteria

- [ ] Submitting a recipe whose parsed ingredients include an exact or close match to an existing `ingredient` document produces a suggested match for that line instead of creating a duplicate.
- [ ] Submitting a recipe with a genuinely new ingredient produces a "no match — create new" suggestion, with the proposed name normalized per convention (singular, title-case, no brand, no prep-state).
- [ ] The Ingredient Matcher module is unit tested against a fixture set of existing ingredients: exact match, close fuzzy match, no-match case, and naming normalization (e.g. "diced tomatoes" input does not produce "Diced Tomatoes" as the normalized name).

## Blocked by

- Blocked by `issues/002-submit-recipe-from-url.md`

## User stories addressed

- User story 8
