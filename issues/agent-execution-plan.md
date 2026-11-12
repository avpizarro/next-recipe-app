# Agent Execution Plan

This local plan reflects the current scope in `issues/prd.md`: public recipe browsing and admin-only recipe management using Better Auth. It does not imply that remote GitHub issues have been updated.

## Active work

| Track | Issues | Scope |
|---|---|---|
| Auth | 001 | Admin-only Google login, current allowlist checks, public browsing |
| Submission | 002 → 003 → 004 → 005 | Admin recipe import, extraction, image selection, ingredient matching |
| Review | 006 → 007 → 008 → 009 | Admin review, ingredient confirmation, density and nutrition lookup |
| Public nutrition | 015 | Per-serving facts visible without an account; personalization deferred |

## Dependency order

1. 001 establishes admin authentication.
2. 002 adds admin recipe import.
3. 003–005 extend the same extraction/submission flow sequentially. 006 depends on 001 and 002.
4. 007 depends on 005 and 006.
5. 008 and 009 depend on 007 and share the review flow.
6. 015 depends on 009, with its scope reduced to public nutrition facts. Resolve any required quantity conversion explicitly; do not silently depend on deferred 011.

Issues sharing extraction or review files should be implemented sequentially to avoid conflicting changes.

## Deferred work

- Public recipe contributions and ordinary user accounts.
- 010: personal meal-plan CRUD.
- 011: full unit-conversion and aggregation module, deferred with shopping lists. A required subset for public nutrition can be scoped separately.
- 012: shopping-list generation.
- 013: personal nutrition profiles.
- 014: personalized portion guidance.
- Personalized comparisons and portion suggestions from 015; its public facts remain active.
- Woolworths automation remains deferred as before.

Retain deferred issue specifications for future planning. Do not start them merely because their original dependency lists are satisfied; revisit account/identity requirements when reactivating them.
