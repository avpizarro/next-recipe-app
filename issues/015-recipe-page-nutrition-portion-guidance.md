## Parent PRD

`issues/prd.md`

## What to build

Extend the recipe detail page to show per-serving nutrition facts (calories/protein/carbs/fat), computed from the recipe's `servings` and its ingredients' per-100g macros. If the signed-in user has saved daily targets (`issues/013-user-nutrition-profile.md`), also show the personalized comparison and suggested portion from the Portion Guidance module (`issues/014-portion-guidance-module.md`). If not, show plain per-serving facts only, with no error.

Per the PRD's "Nutrition & portion guidance" section.

## Acceptance criteria

- [ ] Any published recipe with ingredient macro data shows per-serving nutrition facts on its detail page.
- [ ] A signed-in user with saved daily targets sees a personalized comparison (e.g. percent of daily calories) and a suggested portion size for that recipe.
- [ ] A signed-in user with no saved targets, or a signed-out visitor, still sees the plain per-serving facts, with the personalized section simply absent (not an error state).
- [ ] A recipe with incomplete ingredient macro data (e.g. an ingredient created before macros existed) degrades gracefully rather than showing incorrect totals.

## Blocked by

- Blocked by `issues/009-nutrition-lookup-review-confirmation.md`
- Blocked by `issues/013-user-nutrition-profile.md`
- Blocked by `issues/014-portion-guidance-module.md`

## User stories addressed

- User story 31
- User story 32
- User story 33
- User story 34
