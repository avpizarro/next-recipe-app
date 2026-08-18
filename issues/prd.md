# Add Recipes, Meal Planning, Shopping Lists & Nutrition Guidance

## Problem Statement

Today, "Alejandra's Kitchen" only grows through the site owner manually entering recipes in Sanity Studio. There's no way for other people to contribute recipes, no way to turn a set of recipes into a shopping list, no way to get that shopping list into an actual grocery cart, and no way to know how much of a recipe to eat to match personal nutrition/fitness goals.

Concretely, the site owner wants to be able to share a recipe URL and have it added to the site "for free" (following the existing recipe format), wants other people to be able to do the same, wants to pick several recipes and get a single combined shopping list instead of re-reading each recipe by hand, wants that list to end up in a Woolworths cart without typing it in manually, and wants portion guidance that accounts for personal nutrition targets rather than just trusting whatever serving size the source recipe states.

## Solution

A five-phase feature set built directly into the existing Next.js app (no separate backend/service, deployable on Vercel as today), backed by extensions to the existing Sanity schema:

1. **Add a recipe from a URL** — any signed-in user pastes a URL; the app scrapes/parses it (structured data first, LLM fallback second), lets the submitter pick a main image from candidates found on the page, and submits it as a pending recipe.
2. **In-app review** — the site owner reviews pending recipes on a new page in the app itself (not Sanity Studio), confirming ingredient matches, ingredient density (for unit conversion), and ingredient nutrition matches before publishing.
3. **Persistent meal planning + shopping list** — signed-in users build a saved list of recipes over time and generate a single, fully unit-converted, aggregated shopping list from it.
4. **Woolworths cart automation** *(deferred, lowest priority)* — an admin-only, tightly guardrailed, manually-triggered agent that adds shopping-list items to a Woolworths cart (never checkout, never stores credentials).
5. **Nutrition-matched portion guidance** — for any recipe, show how a serving compares to the signed-in user's manually-entered daily nutrition targets, and suggest a portion size to match.

## User Stories

### Recipe submission
1. As a signed-in user, I want to paste a recipe URL and have the app extract the recipe's name, ingredients, instructions, and servings, so that I don't have to manually transcribe it.
2. As a signed-in user submitting a recipe, I want to see multiple candidate images pulled from the source page and pick the one I like, so that the recipe has a good main image without me needing my own photo.
3. As a signed-in user, I want my submission to go into a review queue rather than publishing instantly, so that low-quality or broken scrapes don't pollute the live site.
4. As a submitter, I want to see the status of recipes I've submitted (pending/published/rejected), so that I know whether my contribution went live.
5. As the site owner, I want unauthenticated users to be blocked from submitting recipes, so that submissions are always attributable to an account.

### Review/moderation
6. As the site owner, I want to review pending recipes from within the app itself, so that I never have to open Sanity Studio for day-to-day moderation.
7. As a reviewer, I want to approve or reject a pending recipe, so that only good submissions become visible to all users.
8. As a reviewer, I want to see, for each parsed ingredient line, a suggested match against existing `ingredient` documents, so that I can avoid creating duplicate ingredients.
9. As a reviewer, I want to override a suggested ingredient match or confirm creating a new ingredient, so that I retain final control over data quality.
10. As a reviewer, when I create a new ingredient, I want to be prompted to keep its name singular, title-case, brand-free, and free of prep-state words, so that ingredient naming stays consistent for future matching.
11. As a reviewer, when a new ingredient is used with a volume unit (cup/tbsp/tsp) in the recipe being reviewed, I want to be prompted to enter its density (g/mL), so that quantities in that unit can later convert to grams.
12. As a reviewer, when I create a new ingredient, I want to see a suggested nutrition match from USDA FoodData Central, so that I can confirm accurate macro data without typing it by hand.
13. As a reviewer, I want access to the review page restricted to an allowlisted set of emails, so that arbitrary users can't approve their own or others' submissions.
14. As the site owner, I want the recipe's main image (chosen by the submitter) displayed on the review page, so that I can sanity-check submissions before approving, even though I can't change it there.

### Meal planning & shopping list
15. As a signed-in user, I want to add recipes to a personal, persistent meal plan, so that I can build it up over multiple visits instead of selecting everything in one sitting.
16. As a signed-in user, I want to remove an individual recipe from my meal plan, so that I can adjust my plan as it changes.
17. As a signed-in user, I want to delete my entire meal plan, so that I can start fresh.
18. As a signed-in user, I want to generate a shopping list from all recipes currently in my meal plan, so that I don't have to manually combine ingredient lists myself.
19. As a signed-in user, I want ingredient quantities from different recipes to be correctly combined even when they're expressed in different units (e.g. cups vs. grams of flour), so that my shopping list shows one accurate total per ingredient rather than confusing duplicate lines.
20. As a signed-in user, I want quantities normalized to grams (for solids) or millilitres (for liquids), so that the shopping list is consistent and usable for portion/nutrition math later.
21. As a signed-in user, I want to see when an ingredient's quantity couldn't be converted/aggregated (e.g. missing density data), so that I know to double check that item manually rather than trusting a wrong number.

### Woolworths cart automation (deferred)
22. As the site owner, I want to trigger an agent that adds my shopping list items to my Woolworths cart, so that I don't have to search and add each item by hand.
23. As the site owner, I want this feature restricted to my own account (admin allowlist), so that it isn't exposed to arbitrary users while it's new and unproven.
24. As the site owner, I want the agent to never store my Woolworths credentials, so that a breach of this app can never leak my grocery account password.
25. As the site owner, I want the agent to only add items to my cart and never attempt checkout, so that a bug can never cause an unintended purchase.
26. As the site owner, I want the agent to skip an ingredient it can't confidently find rather than retrying indefinitely, so that a single problematic item can't run up cost or time unboundedly.
27. As the site owner, I want a hard cap on the number of automation steps per run, so that a runaway loop can't consume unbounded resources or cost.
28. As the site owner, I want each cart-fill run to be manually triggered, never automatic, so that I stay in control of when it runs.
29. As the site owner, I want a summary at the end of a run of what was added vs. skipped, so that I know what still needs to be added manually.

### Nutrition-matched portions
30. As a signed-in user, I want to enter my own daily calorie and macro (protein/carbs/fat) targets on a profile page, so that portion guidance reflects goals I already know, without the app guessing on my behalf.
31. As a signed-in user viewing a recipe, I want to see the nutrition facts for one full serving, so that I understand what I'm looking at before any portion adjustment.
32. As a signed-in user viewing a recipe, I want to see how one serving compares to my daily targets (e.g. "45% of your daily calories"), so that I can decide how much to eat.
33. As a signed-in user viewing a recipe, I want a suggested portion size (e.g. "~0.75 servings") that would better fit my remaining targets for a meal, so that I get actionable guidance rather than just raw numbers.
34. As a user without saved nutrition targets, I want the recipe page to still show plain per-serving nutrition facts (just without the personalized comparison), so that the feature degrades gracefully instead of breaking.

## Implementation Decisions

### Auth & access control
- **NextAuth.js with Google OAuth** for sign-in. No roles/permissions schema — admin access (review page, Woolworths automation) is determined by checking the signed-in user's email against an allowlist read from an environment variable.
- All recipe-submission, meal-plan, and profile routes require a signed-in session.

### Schema changes (Sanity)
- `recipe`: add `status` (`"pending" | "published" | "rejected"`), `servings` (number), `submittedBy` (reference or stored email/id of the submitting user).
- `ingredient`: add `densityGPerMl` (number, optional — only required for ingredients used with volume units), `caloriesPer100g`, `proteinPer100g`, `carbsPer100g`, `fatPer100g` (numbers, sourced from USDA FoodData Central).
- New `mealPlan` document type: reference to the owning user + array of recipe references. One per user (or reference by user id/email — implementer's choice), persists indefinitely until explicitly deleted or recipes removed.
- New user profile storage for daily nutrition targets (`dailyCalories`, `dailyProtein`, `dailyCarbs`, `dailyFat`), keyed to the NextAuth session (as a Sanity document keyed by user email/id, consistent with how `mealPlan` is keyed — no separate database needed).

### Recipe extraction pipeline
- Given a URL: attempt to parse `schema.org/Recipe` JSON-LD from the page first. If missing or incomplete, fall back to an LLM (Anthropic API) call to extract name, ingredients, instructions, and servings from the page content.
- Image candidates are gathered from the JSON-LD `image` field, `og:image` meta tag, and a scan of `<img>` tags on the page — surfaced as external-URL thumbnails, not uploaded anywhere until one is chosen.
- Only the submitter-chosen image is uploaded to Sanity as an asset (via the Sanity asset upload API); all other candidates are discarded.
- Output of extraction includes a `sourceFormat` flag (`"structured" | "llm"`) so the review UI can indicate which submissions came from the more failure-prone LLM path.

### Ingredient matching & naming
- Parsed ingredient names are fuzzy-matched against existing `ingredient` documents; a suggested match (or "no match — create new") is proposed per line.
- Naming convention enforced at ingredient-creation time (in the review UI): singular, title-case, no brand names, no prep-state words in the name (prep state, if relevant, belongs in the existing `notes` field).
- Ingredient reference resolution (matched or newly created) is finalized as part of approving the recipe in review — a recipe cannot be published with unresolved ingredient lines.

### Unit conversion & aggregation
- Two-part conversion: (1) generic dimensional conversion (cup/tbsp/tsp/oz/etc. → mL or g) via a standard unit-conversion library; (2) density-based mass↔volume bridging using each ingredient's `densityGPerMl`, following the same arithmetic pattern as `@dailykit/food-units-converter` (verified during design: that library provides the mass↔volume arithmetic but ships no per-ingredient density data itself, and doesn't cover cup/tbsp/tsp — so it's either used as a reference implementation or reimplemented directly, combined with a separate dimensional-conversion library for the cup/tbsp/tsp/oz step).
- Canonical units: grams for solids, millilitres for liquids.
- If an ingredient lacks `densityGPerMl` and the shopping list needs a volume↔mass conversion for it, that ingredient's line is flagged as unconverted/unaggregated in the output rather than silently guessed.

### Meal plan & shopping list
- `mealPlan` CRUD (add recipe, remove recipe, delete plan) exposed via API routes, scoped to the signed-in user.
- Shopping list generation reads all recipes in the current meal plan, resolves every ingredient line through the unit conversion module, and aggregates by ingredient into a single combined-quantity list.

### Woolworths cart automation
- Implemented as an in-app, server-side route, but access-gated by the same admin allowlist used for review — not exposed to general users.
- No Woolworths credentials are ever stored; the run operates within a session context provided at trigger time.
- Guardrails enforced in the agent driver itself, not just documented: a hard maximum step count per run; per-ingredient skip-on-failure (no retries); action scope limited to "add to cart" (checkout/payment actions are never issued); the run only starts on an explicit manual trigger.
- Run output: a summary of items added vs. skipped, surfaced to the triggering admin.
- Infra note: this phase needs a persistent browser automation environment and will not run inside a standard Vercel serverless function (execution time limits, no persistent browser process) — expect a separate small always-on worker alongside the Vercel deployment. This is scoped as its own follow-up when Phase 4 is actually built, not part of the initial rollout.

### Nutrition & portion guidance
- Ingredient macros sourced from USDA FoodData Central at ingredient-creation time in review; reviewer selects/confirms the correct database entry rather than typing values.
- Per-recipe nutrition (calories/macros per serving) computed from `servings` + summed ingredient quantities × their per-100g macros.
- Portion guidance is per-recipe and static: it compares one serving's nutrition to the signed-in user's manually-entered daily targets and outputs a percentage-of-daily-target and a suggested portion fraction. It does not track meals eaten, remaining daily budget, or anything across a day/week — that is explicitly future scope, not part of this PRD.
- If the user has no saved targets, the recipe page still shows raw per-serving nutrition facts, just without the personalized comparison.

### Deployment
- All of Phases 1, 2/3, and 5 run as Next.js API routes on the existing Vercel deployment — no new infrastructure required.
- Phase 4 (Woolworths automation) is the sole exception, per the infra note above.

## Modules

The following modules are designed as small, deep interfaces — each hides real internal complexity (parsing strategies, matching heuristics, conversion math, external API calls, or agent-loop control flow) behind a narrow, stable call shape, so each can be developed, tested, and later modified independently of the routes/UI that call it.

1. **Recipe Extractor** — `extractRecipe(url) → { name, servings, ingredients[], instructions, imageCandidates[], sourceFormat }`. Encapsulates JSON-LD parsing, LLM fallback, and image-candidate scanning.
2. **Ingredient Matcher** — `matchIngredient(parsedName, existingIngredients) → { suggestedMatch, confidence, normalizedName }`. Encapsulates fuzzy matching and naming-convention normalization.
3. **Unit Converter** — `convertToCanonical(quantity, unit, densityGPerMl?) → { value, unit }` and `aggregateIngredientLines(lines[]) → aggregatedLines[]`. Encapsulates dimensional conversion and density-based mass↔volume bridging. Pure functions, no I/O.
4. **Nutrition Lookup** — `lookupNutrition(ingredientName) → candidates[]`. Encapsulates the USDA FoodData Central API integration.
5. **Portion Guidance** — `computePortionGuidance(recipe, userTargets) → { perServingMacros, percentOfDailyTargets, suggestedPortionFraction }`. Pure function, no I/O.
6. **Woolworths Cart Agent** — `addIngredientsToCart(items, { maxSteps }) → { added[], skipped[] }`. Encapsulates the guardrailed browser-automation loop.

## Testing Decisions

Good tests here assert on external behavior (inputs → outputs / observable side effects), not on internal implementation details (e.g. not asserting a specific library was called, or a specific intermediate data shape).

- **Unit Converter**: thorough unit tests with no mocking required (pure functions) — cover same-unit summing, cross-unit-same-dimension conversion (cups + tbsp), density-based volume↔mass bridging with known densities, and the "missing density → flagged as unconverted" behavior.
- **Portion Guidance**: thorough unit tests with no mocking required (pure function) — cover standard target comparisons, edge cases (zero/missing targets), and portion-fraction suggestions at various serving sizes.
- **Recipe Extractor**: tests against fixture HTML pages — one with valid JSON-LD (asserting the structured path is used and the LLM is not called), one without (asserting fallback triggers), and assertions on image-candidate extraction. LLM calls mocked.
- **Ingredient Matcher**: tests against a fixture set of existing ingredients — exact match, close fuzzy match, no-match cases, and naming-convention normalization (e.g. "diced tomatoes" input does not silently become the stored name).
- **Nutrition Lookup**: tests against mocked USDA API responses — correct mapping of API fields to the module's output shape, and handling of no-match/multiple-match responses.
- **Woolworths Cart Agent**: tests against a mocked browser-automation layer — asserting the step cap is enforced, a failing ingredient is skipped rather than retried, and no checkout-related action is ever issued regardless of agent state.

No existing test suite/prior art currently exists in this codebase to model these after (no test runner is currently configured in `package.json`); this PRD's implementation will need to introduce one.

## Out of Scope

- Any support for non-Google sign-in methods.
- A roles/permissions system beyond the single admin-email allowlist.
- Editing the chosen recipe image during review (the submitter's choice at submission time is final for this PRD).
- Full day/week-level nutrition tracking, meal logging, or a food diary of any kind.
- Automatic computation of a user's daily nutrition targets (e.g. BMR/TDEE formulas) — targets are always manually entered.
- Integration with any external fitness service (Apple Health, MyFitnessPal, Fitbit, etc.).
- Any automated checkout/purchase action on Woolworths or any other retailer.
- Exposing Woolworths cart automation to non-admin users.
- Storing any third-party retailer credentials.
- Full unit-conversion coverage for units outside cup/tbsp/tsp/oz/g/kg/mg/mL/L (e.g. no support for imperial-only regional units not already covered).
- Sourcing ingredient density automatically (e.g. from an external density database) — it is manually entered during review for this PRD.

## Further Notes

- The existing `ingredient` dataset is currently tiny and clean (3 documents: Mango, Pineapple, Tequila), so there is no backfill/migration burden for the new `densityGPerMl` or macro fields — they simply get populated as new ingredients are created going forward. Existing ingredients can be backfilled opportunistically, not as a blocking task.
- `@dailykit/food-units-converter` (npm, last published 2021) was evaluated as a possible dependency for the Unit Converter module. It provides usable mass↔volume arithmetic given a density, but ships no ingredient density data and doesn't cover cup/tbsp/tsp units at all — so it's not a drop-in solution by itself. Implementer should decide between using it as a reference/dependency for just the mass↔volume step (paired with a separate dimensional-conversion library for cup/tbsp/tsp/oz) or reimplementing the small amount of relevant logic directly.
- Phases are intentionally ordered by priority: Phase 1/1b (add + review) and Phase 2/3 (meal plan + shopping list) are the core value and should be built first; Phase 5 (nutrition) was described as the last, smallest phase; Phase 4 (Woolworths) was explicitly called out as "further down the track" and lowest priority, with real infra implications (a non-Vercel worker) that make it a natural candidate for a separate follow-up PRD when it's actually prioritized.
