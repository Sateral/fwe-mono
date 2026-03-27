# Schema Hardening — Cursor Implementation Prompt

You are hardening a production Prisma schema for a real consumer-facing meal prep business. A single chef fulfills weekly orders; customers can customize meals with substitutions, modifiers, and protein boosts. Real money is processed via Stripe.

Read the entire codebase before making any changes. Understand existing query patterns, API routes, and data flow before touching anything. All existing data is disposable — do not worry about data migrations or preserving existing rows. Reset and reseed as needed.

Implement the changes below in priority order. After all changes, run `prisma validate`, `prisma generate`, and confirm there are no TypeScript errors.

---

## CRITICAL

**1. Customization data (substitutions, modifiers) is stored as unvalidated JSON blobs across multiple models.**
This makes it impossible to query reliably (e.g. "how many chimichurri orders this week?"), causes prep manifest data to be unparseable if malformed, and provides no referential integrity. Find the right relational solution by reading how these fields are written and read across the codebase, then replace the JSON columns with a proper structure.

**2. There are no database-level constraints protecting money fields.**
Nothing prevents a negative charge, a $0 total, or a refund that exceeds the original amount from being written to the database. A pricing bug would be silently accepted. Add appropriate check constraints so the database rejects invalid financial states.

---

## HIGH

**3. There is no direct link from an Order back to its originating CheckoutSession.**
Tracing an order back to its checkout currently requires multiple joins. When something goes wrong in production, support queries need to be fast and direct. Find the right way to make this relationship first-class given how the rest of the checkout pipeline is structured.

**4. When multiple meals are purchased in one Stripe transaction, there is no single model representing that payment.**
One Stripe charge creates multiple Order rows with no parent grouping beyond the CheckoutSession. Issuing a receipt or refund for "this checkout" requires reconstructing the group. Find the right way to model this given how the Stripe webhook handler currently works.

**5. There is no audit trail for fulfillment status changes.**
When an admin updates a fulfillmentStatus, there is no record of who changed it, from what, to what, or why. For a real consumer business this is a liability issue. Every fulfillment status change should be traceable.

**6. FailedOrder rows are created silently with no guaranteed human notification.**
A Stripe payment can succeed while order creation fails. The FailedOrder model exists but there is no mechanism ensuring an admin is actually alerted. This needs to be guaranteed, not best-effort.

---

## MEDIUM

**7. Two substitution options in the same group can both be marked as the default.**
This creates an ambiguous "standard build" in the prep manifest — the chef wouldn't know which configuration to use as the baseline. The database should enforce that only one default is possible per group.

**8. `proteinBoost` is a hardcoded boolean across multiple models.**
This bakes a specific product concept into the schema at multiple levels. If the business ever wants a second boost type or to make boost pricing configurable per meal, it requires changes across many tables. Find a more extensible way to model this that is consistent with how modifiers are already structured.

**9. MealPlan has no record of what a subscriber actually paid.**
You can see a subscriber's credit cap but not the price they agreed to. If pricing changes, historical plan records become unauditable. The plan's price and billing terms at the time of purchase should be stored.

---

## LOW

**10. `RotationStatus.PUBLISHED` is a dead enum variant.**
The codebase comments indicate the storefront uses `not-ARCHIVED` logic, making PUBLISHED and DRAFT behave identically. Dead enum variants create confusion for anyone reading the code. Retire it.

**11. ModifierGroup allows logically invalid selection range configurations.**
`maxSelection` can be set below `minSelection`, or to zero, both of which are nonsensical. The database should reject these states.

**12. `CartItem` has no record of why a unit price differs from the meal's base price.**
If a cart item was discounted, credited through a meal plan, or manually adjusted, there is no way to tell after the fact. Price source should be traceable.

---

## Constraints

- Read the full codebase before writing a single line. Do not guess at patterns.
- Every change that touches more than one table must happen inside a transaction.
- After all changes, search the codebase for any remaining reads of the old JSON customization fields and confirm they are gone.
- Write a short summary of every file changed and why.
