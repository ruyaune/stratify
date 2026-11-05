# STRATIFY — Final Vanilla Offline Competition Build

This is the judge-ready offline build of **Stratify — Student Life OS**.

## Open it

Double-click `START_STRATIFY.bat` or open `index.html`.

It opens **straight to the Home dashboard**. There is no login, account creation, server, database, API key, or internet requirement.

## Final visual system

The interface uses one unified **Strata** design language across every screen:

- one indigo/iris brand palette
- consistent button states
- consistent cards, borders, shadows and spacing
- custom inline SVG navigation icons
- page-specific visual identity for Home, Planner, Focus, Progress and Social
- responsive mobile bottom navigation
- redesigned Strati command panel and Showcase Mode

## Tech stack

- HTML
- CSS
- Plain JavaScript
- Browser `localStorage` for Planner/Focus/Progress persistence
- Browser Web Audio API for generated offline ambient focus sounds

No React, Vue, Angular, Vite, Node server, database, or cloud API is required.

## Recommended judging flow

Home → Planner → Strati → Focus → Progress → Social → Showcase Mode

Useful Strati demo commands:

- `Add Biology revision at 7 PM`
- `I finished Chemistry`
- `Start 25 minute Physics focus`
- `What's left today?`

## Clean reset before judging

Double-click `RESET_AND_OPEN_STRATIFY.bat`.

It clears only Stratify's local demo data and opens a fresh dashboard.

## Accurate judge answer

**Language/stack:** “The frontend is built entirely with vanilla HTML, CSS and JavaScript. It runs offline and stores its competition demo data locally in the browser.”
