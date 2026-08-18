## Parent PRD

`issues/prd.md`

## What to build

Extend the review page's ingredient-confirmation UI (`issues/007-review-ingredient-match-confirmation.md`) so that when the reviewer confirms creating a *new* ingredient that is used with a volume unit (cup/tbsp/tsp) in the recipe being reviewed, they are required to enter a `densityGPerMl` value for it before that ingredient line can be confirmed.

Per the PRD's "Ingredient handling" and schema-changes sections: `densityGPerMl` on `ingredient`, required for future unit conversion of volume-based quantities.

## Acceptance criteria

- [ ] Confirming a new ingredient that is used with a volume unit (cup/tbsp/tsp) in this recipe shows a required `densityGPerMl` input.
- [ ] The ingredient line cannot be confirmed without a density value in this case.
- [ ] Confirming a new ingredient that is only used with a non-volume unit (grams, ounces) in this recipe does not require density.
- [ ] Matching an existing ingredient (rather than creating new) never prompts for density here, even if it lacks one already — backfilling existing ingredients is out of scope for this slice.
- [ ] The entered `densityGPerMl` is saved on the new `ingredient` document.

## Blocked by

- Blocked by `issues/007-review-ingredient-match-confirmation.md`

## User stories addressed

- User story 11
