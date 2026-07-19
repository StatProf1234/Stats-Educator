# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, client-side biostatistics resource (`The Biostat Toolkit`): a library of statistical/biostatistics calculators plus a "Learn" section of critical appraisal guides, reporting-guideline reference, downloadable worksheets, and a notation glossary. No build step, no backend, no package.json — open `index.html` in a browser to run it. Dependencies (KaTeX for formula rendering, jStat for distribution functions) are loaded from CDN in `index.html`; there is nothing to `npm install`.

There is no test suite, linter, or build/bundling command in this repo. Verify changes by opening `index.html` in a browser and exercising the affected calculator(s) directly.

## Architecture

Four files, each with one job:

- **`index.html`** — page shell only (sidebar nav + `#view` mount point). Never contains calculator markup directly.
- **`calculators.js`** — all data: calculator definitions, plus several other top-level tables (see below). This file is huge (~1MB) — when editing a specific calculator, `grep` for its `id:` to jump straight to it rather than reading the file linearly.
- **`app.js`** — all behavior: hash-based router, sidebar/search rendering, the four input-layout renderers, results rendering, forest-plot SVG generation, chart export.
- **`style.css`** — styling.

### Routing

There's no framework/SPA router — `app.js`'s `route()` reads `location.hash` and dispatches to one of: a calculator (`#calc-id`), the wizard (`#wizard/...`), a Learn guide (`#learn/...`), or falls back to the home index. Every view renders by replacing `view().innerHTML`; there's no virtual DOM or diffing, so re-renders are full rebuilds (this is why the chart-export click handler in `app.js` is delegated on `document` rather than attached per-button — the results DOM is torn down and rebuilt on every Calculate click).

### `calculators.js` top-level tables

- `CALCULATORS` — array of fully-implemented calculators. Each entry has `id`, `name`, `hint`, `category`, `description`, `formulas` (LaTeX shown via KaTeX), `inputs` (+ optional `inputLayout: '2x2'` or `'groups'` for the two special input renderers), `calculate(values)` (returns an array of result rows), and optionally `example(values)` (worked-example prose, re-rendered live as inputs change).
- `CALCULATOR_INDEX` — the *full* catalog shown on the home page, including calculators not yet built (`status: 'planned'` vs `'available'`). This is a superset of `CALCULATORS` and drives the "Coming soon" cards — when adding a new calculator, add it to both `CALCULATOR_INDEX` (status `'available'`) and `CALCULATORS` (the full definition).
- `WIZARD_TREE` — the "Which Calculator Should I Use?" decision tree (`#wizard/...`), keyed by node id; each node is either a question (`options: [{ label, next }]`) or a set of `results` (`{ id, why }`) pointing at `CALCULATORS` entries.
- `SEARCH_KEYWORDS` — per-calculator-id synonym lists (e.g. "two independent groups") that outrank the calculator's own name in sidebar search relevance (see `searchScore()` in `app.js`).
- `NOTATION` — per-calculator-id glossary of symbols used in that calculator's formulas, shown below the results.
- `GUIDES` — the "Learn" section's chart-reading/data-type/critical-appraisal reference articles (`#learn/...`), independent of the calculators themselves but cross-linked via each guide's `related` field and each result row's own links.

### Input layout patterns (`app.js`)

A calculator's `inputLayout` picks which renderer builds its input form:
- default (`renderGrid`) — plain field-per-input grid; supports `number`, `text`, `select`, `slider`, `textarea` input types.
- `'2x2'` (`render2x2`) — a 2×2 contingency table (cells `a`/`b`/`c`/`d` with live-updating row/column/grand totals) for epidemiology calculators; any inputs beyond those four render as a callout *above* the table via `render2x2ExtraInputs` (e.g. a study-design selector, since picking the wrong option there silently changes which results are valid).
- `'groups'` (`renderGroupedInputs`) — one column per group (e.g. Group 1/2/3 Mean/SD/N) for multi-group tests/ANOVA, driven by `calc.groupFields` and `calc.groupMax`.

### Results & CI visualization

`calc.calculate()` returns an array of row objects (`{ label, value, ci, isRatio, isText, isSVG, highlight, isError }`). `showResults()` in `app.js` renders these as a table; rows with a confidence interval get an inline forest-plot SVG (`forestSVG()`), with the domain (log scale for ratios like RR/OR, linear for differences) computed once per result set by `computeDomains()` so all rows in a table share one comparable scale.
