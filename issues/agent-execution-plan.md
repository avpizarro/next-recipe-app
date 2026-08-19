# Agent Execution Plan

Derived from `issues/prd.md` and the 15 open GitHub issues (`gh issue list`), based on each issue's "Blocked by" section. Phase 4 (Woolworths cart automation) has no issues yet — the PRD explicitly defers it, so it's out of scope for this plan.

## Tracks (5 agents)

Each track is one agent working its issues **sequentially**, because the issues within a track repeatedly touch the same files (same module, same page, same route). Splitting a track across multiple agents would create merge conflicts.

| Track | Issues (in order) | Why grouped together |
|---|---|---|
| **Auth** | 001 | Foundational — gates almost everything else |
| **Submission** | 002 → 003 → 004 → 005 | All extend the same Recipe Extractor module + submission route/UI |
| **Review** | 006 → 007 → 008 → 009 | All extend the same `/review` page and its API |
| **Meal Plan** | 011 → 010 → 012 | Unit Converter (011) is standalone; CRUD (010) needs Auth+Review; shopping list (012) needs both |
| **Nutrition** | 014 → 013 → 015 | Portion Guidance (014) is standalone; profile (013) needs Auth; 015 needs Review's 009 too |

## Layers (6 total)

A new layer starts wherever a track must wait on another track finishing.

| Layer | Issues (parallel within layer) | Blocked by |
|---|---|---|
| **0** | 001 Auth, 011 Unit Converter, 014 Portion Guidance | Nothing — 3 agents can start immediately |
| **1** | 002 Submission (base slice), 013 Nutrition Profile | 001 |
| **2** | 003 LLM fallback, 004 Image picker, 005 Ingredient matcher, 006 Review page | 002 (006 also needs 001) |
| **3** | 007 Review ingredient confirmation, 010 Meal Plan CRUD | 005 + 006, and 001 + 006 respectively |
| **4** | 008 Density prompt, 009 Nutrition lookup, 012 Shopping list | 007, and 010 + 011 respectively |
| **5** | 015 Recipe page nutrition/portion UI | 009 + 013 + 014 — final integration point |

**Total: 5 agents, 6 layers.** Max parallelism is 3 agents at once (layer 0).

## Notes / risks

- **Critical path:** Submission (002→005) and Review (006→009) are the long poles — 4 sequential issues each, and Review's ingredient-confirmation slice (007) can't start until Submission's ingredient matcher (005) lands.
- **File-collision risk:** 003, 004, and 005 all extend the Recipe Extractor module. Don't split these into separate parallel agents even though their "Blocked by" only lists 002 — they'll collide on the same file. Same logic applies to 008/009 both extending the review ingredient-confirmation UI.
- **Not covered:** Phase 4 (Woolworths automation) — no issues filed yet; PRD flags it as a future follow-up needing separate non-Vercel infra.
