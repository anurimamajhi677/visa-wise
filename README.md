# VisaReady

Free Schengen tourist visa readiness check for Indian passport holders.
Answer questions about your trip, passport, money and documents and get:

- a **readiness score** (capped while any red flag is open)
- **red flags**: passport validity, passport age and pages, apply timing, 90-day limit
- **where to apply** (main-destination rule) and the visa fee
- a **timeline**: earliest/latest apply day, appointment booking, fresh statements
- a **document checklist** for your work status (salaried, self-employed, student, retired, not working)

Nothing is uploaded or stored on a server. Answers stay in the browser (localStorage).
Not affiliated with any embassy, consulate, visa centre or government.

## Rules and sources

All rules live in `src/lib/rules.js`, each with its source:

| Rule | Source | Status |
|---|---|---|
| Passport valid 3 months after leaving | European Commission | verified 2026-11-25 |
| Apply 15 days – 6 months before | European Commission | verified 2026-11-25 |
| 90 days in any 180 | European Commission | verified 2026-11-25 |
| Fee €90 adults, €45 children 6–12 | European Commission | verified 2026-11-25 |
| Processing 15 days, up to 45 | European Commission | verified 2026-11-25 |
| Passport issued within 10 years, 2 blank pages | EU Visa Code Art. 12 | **verify before launch** |
| Insurance at least €30,000 | EU Visa Code Art. 15 | **verify before launch** |
| Bank statements 3 months, salary slips 3 months, ITR 2 years, leave letter | Visa centre checklists (India) | typical; varies by country |
| Book appointment 60 days ahead, funds 1.5× trip cost | VisaReady guideline | not official |

## Commands

```bash
npm install
npm run dev     # http://localhost:4321
npm test        # rules and scoring tests
npm run build   # static site in dist/
```

## Next

- Verify the Visa Code rules and country-specific daily funds amounts
- Country-specific extras (e.g. France, Germany, Italy checklists)
- Guides for search traffic; more visa types (UK, UAE, US)
