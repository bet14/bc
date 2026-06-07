# Rabby Wallet — Fraud Detection Deep-Dive Deck

Interactive HTML slide deck researching Rabby Wallet's fraud-detection
features (risk scoring, suspicious-transaction/contract/address detection).

## How to view
Open `rabby_overview_slide.html` in a browser — that's the entry point.
Use the left sidebar (☰ button, top-left) to jump between sections; it
collapses/expands and remembers your choice. Toggle dark/light mode with the
button in the top bar.

## Structure
- `rabby_overview_slide.html` — Overview / outline
- `5-layer-detection-with-demo-2.html` — How It Works → 5-Layer Detection Pipeline
- `rabby_rule_engine_with_demo.html` — How It Works → Rules Engine
- `rabby_approval_alerts_feature.html` — Core Features → Approval Risk Alerts
- `rabby_placeholder_*.html` — Core Features (Phishing Detection, Tx Simulation,
  Address Labels, Signature Risk), Wallet Comparison, Conclusion, References —
  currently "Coming soon" placeholders, to be filled in as research continues
- `rabby_sidebar.css` / `rabby_sidebar.js` — shared sidebar component used by
  every page (single source of truth for navigation: edit `RB_NAV` in
  `rabby_sidebar.js` to add/rename sections)
- `rabby_placeholder_template.html` — base template for stamping out new
  "coming soon" / draft pages with the right theme wiring already in place
- `PROMPT_TEMPLATE_new_slide.md` — copy-paste prompt for generating a new
  slide from raw notes while keeping the visual format consistent

## Design system (for anyone extending this deck)
All pages share one CSS-variable-based theme (dark + light), defined per page
in a `[data-theme="dark"]` / `[data-theme="light"]` block:

```
--bg / --bg2 / --bg3 / --border / --text / --text-muted / --accent / --accent2
```

Every page also has: a fixed `#topbar` (title + `#theme-btn` calling
`toggleTheme()`), a content wrapper with `id="main"`, and at the end of
`<body>`:
```html
<script src="rabby_sidebar.js" defer></script>
```
plus a `<link rel="stylesheet" href="rabby_sidebar.css">` in `<head>`.

See `PROMPT_TEMPLATE_new_slide.md` for the exact prompt to use when adding a
new section so it matches this system automatically.
