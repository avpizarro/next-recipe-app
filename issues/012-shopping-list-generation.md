## Parent PRD

`issues/prd.md`

## What to build

A "generate shopping list" feature that reads all recipes currently in the signed-in user's meal plan (`issues/010-persistent-meal-plan-crud.md`), resolves every ingredient line through the Unit Converter module (`issues/011-unit-converter-module.md`), and displays a single aggregated list per ingredient. Lines that couldn't be converted/aggregated (e.g. missing density) are visibly flagged rather than silently wrong.

Per the PRD's "Meal plan & shopping list" section.

## Acceptance criteria

- [ ] A signed-in user can generate a shopping list from their current meal plan.
- [ ] Ingredients appearing in multiple recipes with compatible units (or convertible via density) are combined into a single line with a correct summed quantity, in canonical units (grams for solids, mL for liquids).
- [ ] Any ingredient line that could not be converted/aggregated is clearly flagged in the output as needing manual double-checking, rather than omitted or silently wrong.
- [ ] Generating a shopping list from an empty meal plan is handled gracefully (no error, clear empty state).
- [ ] The shopping list reflects the meal plan's current state at generation time (e.g. removing a recipe and regenerating no longer includes its ingredients).

## Blocked by

- Blocked by `issues/010-persistent-meal-plan-crud.md`
- Blocked by `issues/011-unit-converter-module.md`

## User stories addressed

- User story 18
- User story 19
- User story 20
- User story 21
