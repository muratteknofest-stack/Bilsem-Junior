# Colorful package sales page

The public `/paketler` page and parent billing controls now share pastel package cards: peach for 30 days (299 TL), lilac for 90 days (699 TL), and mint for 365 days (1,499 TL). Every package retains the same features, one-student scope, single payment, and no automatic renewal.

The public page uses server-rendered React with no client JavaScript. It adds a geometric illustration, restrained motion, feature overview, three activation steps, native FAQ disclosures, and existing legal/support links. The brand is escaped by React. Styling is scoped to sales/billing selectors and shared through `/sales/sales.css`.

Parent checkout links still require both the server's readiness flag and a validated Shopier product URL. The public page routes an available purchase to parent login. Disabled sales remain explicitly disclosed; no payment settings, provider credentials, ledger logic, database schema, or current access rules changed. The activation form keeps its existing authenticated request and student/account epoch checks.

## Verification

- `npm run check`: TypeScript, 308 tests, and production build passed.
- `npm run test:shopier-layout`: actual server-rendered public HTML, shared cards, and parent activation form across 320, 390, 768, 1024 and 1440 pixel viewports, with sales open and closed (30 checks).
- Browser checks cover exact prices, absence of checkout while closed, available link destinations, 44 pixel card controls, no horizontal overflow, FAQ keyboard interaction, required order input, and reduced-motion behavior.
- Desktop and mobile public screenshots and mobile parent form screenshots visually reviewed. Real payments were not submitted.

Sales remain disabled pending configuration of the real Shopier products and server credentials.
