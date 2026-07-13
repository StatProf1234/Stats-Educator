# Stats Educator

A browser-based library of statistical calculators for teaching and applied biostatistics/epidemiology work — each calculator shows the formula, the worked calculation, and a plain-language explanation of the result.

Open `index.html` in a browser to use it; everything runs client-side with no build step or backend.

## Calculator categories

130 calculators across:

- ANOVA
- Bayesian & Meta-Analysis
- Chi-Square & Categorical
- Correlation & Regression
- Descriptive Statistics
- Diagnostic Testing
- Effect Sizes & Agreement
- Epidemiology & Risk
- Non-Parametric Tests
- Power & Sample Size
- Probability & Distributions
- Survival Analysis
- T-Tests & Z-Tests

Use the sidebar search to find a specific calculator, or the "Which Calculator Should I Use?" wizard for guidance.

## Project structure

- `index.html` — page shell and layout
- `app.js` — UI logic, navigation, search, and rendering
- `calculators.js` — calculator definitions (formulas, inputs, computation)
- `style.css` — styling

## Dependencies

Loaded via CDN, no install required:

- [KaTeX](https://katex.org/) for formula rendering
- [jStat](https://github.com/jstat/jstat) for statistical distribution functions
