# The Biostat Toolkit

A browser-based library of statistical calculators for teaching and applied biostatistics/epidemiology work — each calculator shows the formula, the worked calculation, and a plain-language explanation of the result.

Open `index.html` in a browser to use it; everything runs client-side with no build step or backend.

## What's in it

- **131 calculators** (below), each with its formula, a worked medical example, and a plain-language interpretation of the result.
- **Learn** (`#learn`) — 70+ reference guides on critical appraisal of the literature, reporting-guideline checklists, chart/data-type reference, and common statistical pitfalls.
- **Study Designs** (`#designs`) — a quick-reference hub matching a research question to the design built for it, each card linking to its own critical-appraisal guide.
- Two decision wizards for when you're not sure where to start: "Which Calculator Should I Use?" (`#wizard`) and "Which Design Should I Use?" (`#designwizard`).

## Calculator categories

131 calculators across:

- ANOVA
- Bayesian & Meta-Analysis
- Chi-Square & Categorical
- Correlation & Regression
- Descriptive Statistics
- Diagnostic Testing
- Effect Sizes & Agreement
- Epidemiology & Risk
- Genetics & Genomics
- Non-Parametric Tests
- Patient-Reported Outcomes
- Power & Sample Size
- Probability & Distributions
- Survival Analysis
- T-Tests & Z-Tests

Use the sidebar search to find a specific calculator, or the "Which Calculator Should I Use?" wizard for guidance.

## Project structure

- `index.html` — page shell and layout
- `app.js` — UI logic, navigation, search, and rendering
- `calculators.js` — calculator definitions plus the Learn guides, study-design reference, and wizard decision trees (formulas, inputs, computation)
- `style.css` — styling
- `vendor/` — locally vendored KaTeX and jStat (see Dependencies)

## Dependencies

Vendored locally under `vendor/` — no install, no CDN, works fully offline:

- [KaTeX](https://katex.org/) for formula rendering
- [jStat](https://github.com/jstat/jstat) for statistical distribution functions

Google Fonts are still loaded from a CDN for typography, and an optional GoatCounter analytics snippet loads remotely — neither is required for the app to function.
