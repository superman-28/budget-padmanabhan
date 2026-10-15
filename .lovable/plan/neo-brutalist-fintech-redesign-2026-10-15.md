# Neo-brutalist fintech redesign

## Goal
Restyle the existing personal-finance app around the uploaded neo-brutalist direction, retaining current routes, sign-in, records, sharing, and calculations.

## User experience changes
- Replace the pastel styling with warm cream, ink-black borders, electric-lime and coral accents, paper-like surfaces, and tactile offset shadows.
- Establish Space Grotesk headings/numbers and Inter body text, with a matching browser title and share metadata.
- Rework shared buttons, cards, form controls, tags, dialogs, and tabs so the redesign reaches the dashboard, sign-in, events, loans, and their existing controls consistently.
- Update the shared navigation for desktop sidebar use and a fixed, touch-friendly mobile bottom bar; add a personalized dashboard heading and feature the existing monthly net/income/expense figures without changing finance calculations.
- Preserve current analytics charts, transaction management, event/category tracking, loan management, exports, sharing, and all existing actions.

## Technical approach
- Put the new colors, border, radius, shadow, and chart styling in semantic CSS design tokens and keep reusable control styles in the existing shared design-system primitives.
- Restyle the existing route-level screens and shared navigation in place; do not add fake budgets, savings goals, or unimplemented routes/data.
- Update only the existing app metadata needed for the new product identity. Do not modify auth or data services.
- Verify the preview at mobile and desktop sizes and inspect the build/error logs after the changes.

## Acceptance
- Existing dashboard, loans, events, and sign-in remain usable with their current data and interactions.
- Neo-brutalist appearance is consistent from desktop through mobile, with no clipped controls or horizontal page overflow.
- Existing financial values and records are unchanged; newly requested features that lack existing data models are not represented as real data.
