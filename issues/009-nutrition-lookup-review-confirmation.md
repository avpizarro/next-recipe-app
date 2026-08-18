## Parent PRD

`issues/prd.md`

## What to build

Implement the Nutrition Lookup module wrapping the USDA FoodData Central API, and extend the review page's ingredient-confirmation UI (`issues/007-review-ingredient-match-confirmation.md`) so that when the reviewer confirms creating a *new* ingredient, they're shown candidate USDA matches to pick from (rather than typing macro values by hand). The chosen candidate's per-100g calories/protein/carbs/fat are stored on the new `ingredient` document.

Per the PRD's "Nutrition & portion guidance" section and the "Nutrition Lookup" module spec: `lookupNutrition(ingredientName) → candidates[]`.

## Acceptance criteria

- [ ] Confirming a new ingredient during review shows a list of candidate USDA FoodData Central matches for its name.
- [ ] The reviewer must pick a candidate (or explicitly skip, leaving macros unset) before the ingredient is finalized.
- [ ] The chosen candidate's calories/protein/carbs/fat per 100g are saved onto the new `ingredient` document.
- [ ] Matching an existing ingredient (rather than creating new) does not trigger a nutrition lookup here.
- [ ] The Nutrition Lookup module is unit tested against mocked USDA API responses: a clean single match, multiple candidates, and no-match cases.

## Blocked by

- Blocked by `issues/007-review-ingredient-match-confirmation.md`

## User stories addressed

- User story 12
