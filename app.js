// app.js — The Biostat Toolkit

document.addEventListener('DOMContentLoaded', () => {
  buildNav();
  applyActiveState();

  const searchEl      = document.getElementById('search');
  const searchClearEl = document.getElementById('search-clear');

  searchEl.addEventListener('input', e => {
    searchClearEl.hidden = e.target.value === '';
    buildNav(e.target.value.trim().toLowerCase());
    applyActiveState();
  });

  // Explicit clear button — restores the collapsed, categories-only
  // view in one click instead of having to delete the typed text.
  searchClearEl.addEventListener('click', () => {
    searchEl.value = '';
    searchClearEl.hidden = true;
    buildNav();
    applyActiveState();
    searchEl.focus();
  });

  window.addEventListener('hashchange', () => {
    applyActiveState();
    route();
  });

  // Brand click: always go home, even when already at # (no hashchange fires then)
  document.querySelector('.sidebar-brand').addEventListener('click', e => {
    if (location.hash === '' || location.hash === '#') {
      e.preventDefault();
      renderHome();
    }
  });

  // Mobile nav toggle — below 640px the sidebar collapses to just the
  // brand row + this button (see style.css's .sidebar-collapsible
  // rules); this just flips the class the CSS is keyed on, updates
  // aria-expanded, and swaps the hamburger/close icon. Harmless no-op
  // above that breakpoint, since the media query it depends on never
  // applies there.
  const sidebarEl = document.getElementById('sidebar');
  const sidebarToggleEl = document.getElementById('sidebar-toggle');
  const sidebarToggleIconEl = sidebarToggleEl.querySelector('.sidebar-toggle-icon');

  const setSidebarOpen = open => {
    sidebarEl.classList.toggle('open', open);
    sidebarToggleEl.setAttribute('aria-expanded', String(open));
    sidebarToggleIconEl.textContent = open ? '✕' : '☰';
  };

  sidebarToggleEl.addEventListener('click', () => {
    setSidebarOpen(!sidebarEl.classList.contains('open'));
  });

  // Auto-close after picking a destination, so the user isn't left
  // scrolling past a still-open menu to see what they just navigated to.
  document.getElementById('sidebar-collapsible').addEventListener('click', e => {
    if (e.target.closest('a')) setSidebarOpen(false);
  });

  // Chart export (PNG/JPG) — a single delegated listener attached
  // once here, rather than one per button, since showResults()
  // rebuilds the results DOM (and every button in it) from scratch
  // on every Calculate click; delegating to a listener on `document`
  // means it keeps working across all of those rebuilds without ever
  // needing to be re-attached.
  document.addEventListener('click', e => {
    const btn = e.target.closest('.export-chart-btn');
    if (!btn) return;
    const svgEl = btn.closest('.result-viz')?.querySelector('svg');
    if (!svgEl) return;
    exportSVGAsImage(svgEl, btn.dataset.filename || 'chart', btn.dataset.format);
  });

  route();
});

/* ── ROUTING ────────────────────────────────────────────── */

// GoatCounter's script only auto-counts once, on load — this app never
// reloads the page, so every calculator/guide/wizard view has to be
// recorded manually here instead. Guarded in case the script didn't
// load (ad blockers commonly block analytics domains), so a blocked
// tracker never breaks navigation.
function trackPageview() {
  if (typeof window.goatcounter !== 'undefined' && window.goatcounter.count) {
    window.goatcounter.count({ path: location.pathname + location.hash });
  }
}

function route() {
  trackPageview();
  const hash = location.hash.slice(1);
  if (hash === 'wizard' || hash.startsWith('wizard/')) {
    renderWizard(hash === 'wizard' ? [] : hash.slice('wizard/'.length).split('/'));
    return;
  }
  if (hash === 'learnwizard' || hash.startsWith('learnwizard/')) {
    renderLearnWizard(hash === 'learnwizard' ? [] : hash.slice('learnwizard/'.length).split('/'));
    return;
  }
  if (hash === 'learn' || hash.startsWith('learn/')) {
    if (hash === 'learn') { renderLearnHub(); return; }
    const guide = GUIDES.find(g => g.id === hash.slice('learn/'.length));
    guide ? renderGuide(guide) : renderLearnHub();
    return;
  }
  const calc = CALCULATORS.find(c => c.id === hash);
  calc ? renderCalculator(calc) : renderHome();
}

// Home/"Full Calculator Index" page category sections default CLOSED —
// only the heading + count show at rest, and this tracks the ones a
// user has explicitly opened, same pattern as expandedLearnCategories
// below (there's no sidebar category list at rest either — see
// buildNav — so this is the one place category browsing happens).
const expandedHomeCategories = new Set();

// Same idea for the Learn hub's category sections (Data Types, Reading
// and Understanding Graphs, Critical Appraisal of the Literature,
// Evidence Synthesis & Certainty, Common Statistical Pitfalls,
// Appraising Studies by Design, Quick Reference) — tracked separately
// from expandedHomeCategories, defaults CLOSED, holds categories the
// user has explicitly opened.
const expandedLearnCategories = new Set();

function applyActiveState() {
  const id = location.hash.slice(1);
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });
}

/* ── SIDEBAR ────────────────────────────────────────────── */

// Weighted relevance score for how well `calc` matches a search filter.
// A whole-phrase match anywhere counts most; individual words count less
// (so multi-word natural-language queries like "before and after" still
// match calculators that only contain some of those words). Fields are
// weighted by how strongly they signal intent: the curated SEARCH_KEYWORDS
// synonym list (calculators.js) — common ways to describe a problem,
// like "two independent groups" — outranks the calculator's own name,
// which outranks its hint/description/category.
function scoreWeightedFields(fields, filter, filterWords) {
  let score = 0;
  for (const { text, weight } of fields) {
    if (!text) continue;
    if (text.includes(filter)) score += weight * 3;
    for (const word of filterWords) {
      if (text.includes(word)) score += weight;
    }
  }
  return score;
}

function searchScore(calc, filter, filterWords) {
  const fields = [
    { text: calc.name.toLowerCase(),                                  weight: 10 },
    { text: (SEARCH_KEYWORDS[calc.id] || []).join(' ').toLowerCase(), weight: 12 },
    { text: calc.hint.toLowerCase(),                                  weight: 4 },
    { text: (calc.description || '').toLowerCase(),                   weight: 2 },
    { text: calc.category.toLowerCase(),                              weight: 2 },
  ];
  return scoreWeightedFields(fields, filter, filterWords);
}

// Same idea for a Learn guide: title outranks the blurb/dek, which
// outrank its category, which outranks a low-weight sweep of every
// section's heading/body — that last field exists so a guide is
// still findable by a specific term (e.g. "ROBIS") that only appears
// deep in its prose, not in the title or teaser copy.
function searchScoreGuide(guide, filter, filterWords) {
  const bodyText = (guide.sections || []).map(s => `${s.heading} ${s.html}`).join(' ').toLowerCase();
  const fields = [
    { text: guide.title.toLowerCase(),        weight: 10 },
    { text: (guide.blurb || '').toLowerCase(), weight: 4 },
    { text: (guide.dek || '').toLowerCase(),   weight: 3 },
    { text: guide.category.toLowerCase(),      weight: 2 },
    { text: bodyText,                          weight: 1 },
  ];
  return scoreWeightedFields(fields, filter, filterWords);
}

function buildNav(filter) {
  const list = document.getElementById('nav-list');
  list.innerHTML = '';

  // Resting state (no active search): the sidebar no longer duplicates
  // the home page's full, always-open category index here. The list
  // only earns its keep as a live search-results view, so leave it
  // empty until the person actually types something.
  if (!filter) return;

  const filterWords = filter.split(/\s+/).filter(w => w.length > 1);
  const scores = new Map();

  // Calculators and Learn guides are scored separately (different
  // fields, different weights) but rendered through the same grouped
  // nav-category/nav-item markup below, so each is normalized here to
  // a common { id, href, name, hint, category, isGuide } shape.
  // Category names never collide between the two (see calculators.js:
  // CALCULATORS uses subject-matter categories like "ANOVA", GUIDES
  // uses hub sections like "Reference"), so both can share one grouping
  // pass without their results getting jumbled into the same category.
  const items = [];
  for (const calc of CALCULATORS) {
    const score = searchScore(calc, filter, filterWords);
    if (score <= 0) continue;
    items.push({ id: calc.id, href: '#' + calc.id, name: calc.name, hint: calc.hint, category: calc.category, isGuide: false, score });
  }
  for (const guide of GUIDES) {
    const score = searchScoreGuide(guide, filter, filterWords);
    if (score <= 0) continue;
    items.push({ id: guide.id, href: '#learn/' + guide.id, name: guide.title, hint: guide.blurb, category: guide.category, isGuide: true, score });
  }

  const groups = {};
  for (const item of items) {
    scores.set(item.id, item.score);
    (groups[item.category] = groups[item.category] || []).push(item);
  }

  // Best matches first: sort items within each category by score, then
  // sort categories themselves by their single best-scoring item, so
  // the most relevant results surface at the very top instead of being
  // buried under unrelated categories.
  let entries = Object.entries(groups);
  for (const groupItems of Object.values(groups)) {
    groupItems.sort((a, b) => scores.get(b.id) - scores.get(a.id));
  }
  entries = entries.sort(([, a], [, b]) => scores.get(b[0].id) - scores.get(a[0].id));

  for (const [cat, groupItems] of entries) {
    // Always force-open while searching, since every category shown
    // here is a category with matches — nothing to collapse.
    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'nav-category open';
    header.setAttribute('aria-expanded', 'true');
    header.innerHTML = `
      <span class="nav-category-chevron">▸</span>
      <span class="nav-category-name">${esc(cat)}</span>
      <span class="nav-category-count">${groupItems.length}</span>
    `;
    list.appendChild(header);

    const group = document.createElement('div');
    group.className = 'nav-group open';
    group.setAttribute('role', 'list');

    for (const item of groupItems) {
      const a = document.createElement('a');
      a.className  = 'nav-item';
      a.href       = item.href;
      a.dataset.id = item.href.slice(1); // matches location.hash.slice(1) in applyActiveState — 'learn/xyz' for guides, plain id for calculators
      a.setAttribute('role', 'listitem');
      a.innerHTML  = `
        <span class="nav-item-name">${esc(item.name)}${item.isGuide ? '<span class="nav-item-badge">Learn guide</span>' : ''}</span>
        <span class="nav-item-hint">${esc(item.hint)}</span>
      `;
      group.appendChild(a);
    }
    list.appendChild(group);

    // No click-to-toggle handler needed here — while searching, every
    // rendered category is already force-open to show its matches.
  }
}

/* ── HOME VIEW ──────────────────────────────────────────── */

// Shared by the calculator home page and the Learn hub's cross-link
// banner, so neither has to hardcode a count that drifts out of sync
// as calculators are added.
function calculatorCountSummary() {
  const total      = CALCULATOR_INDEX.length;
  const available  = CALCULATOR_INDEX.filter(e => e.status === 'available').length;
  const categories  = new Set(CALCULATOR_INDEX.map(e => e.category)).size;
  const availLabel  = available === total
    ? `<strong>all ${total} available</strong>`
    : `<strong>${available} available now</strong>, the rest coming soon`;
  const plainLabel  = available === total
    ? `all available now`
    : `${available} available now`;
  return { total, available, categories, availLabel, plainLabel };
}

function renderHome() {
  // Group CALCULATOR_INDEX by category, preserving insertion order
  const groups = {};
  for (const entry of CALCULATOR_INDEX) {
    (groups[entry.category] = groups[entry.category] || []).push(entry);
  }

  const { total, availLabel } = calculatorCountSummary();

  const sections = Object.entries(groups).map(([cat, entries]) => {
    const cards = entries.map(entry => {
      const isAvailable = entry.status === 'available';
      // For available calculators, find the full definition for the formula hint
      const fullCalc = isAvailable ? CALCULATORS.find(c => c.id === entry.id) : null;
      const hintHtml = fullCalc
        ? `<div class="home-card-hint">${esc(fullCalc.hint)}</div>`
        : '';

      if (isAvailable) {
        return `
          <a class="home-card" href="#${entry.id}">
            <div class="home-card-name">${esc(entry.name)}</div>
            ${hintHtml}
            <div class="home-card-desc">${esc(entry.description)}</div>
          </a>`;
      } else {
        return `
          <div class="home-card planned">
            <div class="home-card-badge">Coming soon</div>
            <div class="home-card-name">${esc(entry.name)}</div>
            <div class="home-card-desc">${esc(entry.description)}</div>
          </div>`;
      }
    }).join('');

    const availCount = entries.filter(e => e.status === 'available').length;
    const countLabel =
      availCount === entries.length ? `${availCount} available` :
      availCount > 0 ? `${availCount} of ${entries.length} available` :
      `${entries.length} calculators`;

    const isOpen = expandedHomeCategories.has(cat);

    return `
      <div class="home-section${isOpen ? '' : ' collapsed'}" data-cat="${esc(cat)}">
        <h2 class="home-section-heading">
          <button type="button" class="home-section-header${isOpen ? ' open' : ''}" aria-expanded="${isOpen}">
            <span class="home-section-chevron">▸</span>
            <span class="home-section-title">${esc(cat)}</span>
            <span class="home-section-count">${countLabel}</span>
          </button>
        </h2>
        <div class="home-cards">${cards}</div>
      </div>`;
  }).join('');

  view().innerHTML = `
    <div class="home-eyebrow">Statistical Calculator Library</div>
    <h1 class="home-title">Full Calculator Index</h1>
    <p class="home-desc">
      ${total} calculators across ${Object.keys(groups).length} categories —
      ${availLabel}.
      Click any available calculator to open it. Looking for critical appraisal
      guides, worksheets, or a notation glossary instead? See Learn.
    </p>
    <a class="wizard-banner" href="#wizard">
      <span class="wizard-banner-icon">?</span>
      <span class="wizard-banner-text">Answer a few quick questions to find the right calculator.</span>
      <span class="wizard-banner-arrow">→</span>
    </a>
    <a class="wizard-banner alt-banner" href="#learn">
      <span class="wizard-banner-icon">L</span>
      <span class="wizard-banner-text">Critical appraisal guides, reporting-guideline checklists, and a notation glossary — all under Learn.</span>
      <span class="wizard-banner-arrow">→</span>
    </a>
    <div class="home-sections-grid">${sections}</div>
  `;
  document.getElementById('main').scrollTop = 0;

  document.querySelectorAll('.home-section-header').forEach(header => {
    header.addEventListener('click', () => {
      const section = header.closest('.home-section');
      const cat = section.dataset.cat;
      const nowOpen = !header.classList.contains('open');
      nowOpen ? expandedHomeCategories.add(cat) : expandedHomeCategories.delete(cat);
      header.classList.toggle('open', nowOpen);
      header.setAttribute('aria-expanded', String(nowOpen));
      section.classList.toggle('collapsed', !nowOpen);
    });
  });
}

/* ── SELECTION WIZARDS ──────────────────────────────────── */

// Shared renderer for both decision-tree wizards — the calculator one
// (WIZARD_TREE, pointed at CALCULATORS) and the Learn hub one
// (LEARN_WIZARD_TREE, pointed at GUIDES). Same {question, options} /
// {results} node shape either way; `path` is the array of node ids
// visited so far, with the LAST entry being the current node ('start'
// if empty). The path lives entirely in the URL hash (e.g.
// #wizard/id1/id2/...), so answering a question is just navigating to
// a longer hash and the browser's own back button walks back through
// it for free. `cfg` supplies everything that differs between the two:
//   tree        — the WIZARD_TREE-shaped object to walk
//   homeHash    — hash prefix for "start over" / back / option links
//   eyebrow     — small label shown above the question/results
//   resolveItem — (id) => the CALCULATORS/GUIDES entry for a result id
//   itemHref    — (item) => href for that item's own page
//   itemName    — (item) => headline text for the result card
//   itemHint    — (item) => secondary line for the result card
function renderWizardGeneric(path, cfg) {
  const { tree, homeHash, eyebrow, resolveItem, itemHref, itemName, itemHint } = cfg;
  const currentId = path.length ? path[path.length - 1] : 'start';
  const node = tree[currentId];

  if (!node) {
    view().innerHTML = `<p class="calc-desc">That wizard step doesn't exist. <a href="#${homeHash}">Start over</a>.</p>`;
    return;
  }

  // Breadcrumb: for each step, look up the option label that was
  // chosen to get there (the label lives on the PREVIOUS node).
  const crumbs = ['start', ...path].map((id, i, arr) => {
    if (i === 0) return null;
    const prevNode = tree[arr[i - 1]];
    const opt = prevNode && prevNode.options && prevNode.options.find(o => o.next === id);
    return opt ? opt.label : null;
  }).filter(Boolean);

  const breadcrumbHtml = crumbs.length ? `
    <div class="wizard-breadcrumb">
      <a href="#${homeHash}">Start over</a>
      ${crumbs.map(c => `<span class="wizard-crumb-sep">›</span><span class="wizard-crumb">${esc(c)}</span>`).join('')}
    </div>` : '';

  const backHref = path.length > 1 ? `#${homeHash}/${path.slice(0, -1).join('/')}` : `#${homeHash}`;
  const backHtml = path.length ? `<a class="wizard-back" href="${backHref}">← Back</a>` : '';

  if (node.question) {
    const optionsHtml = node.options.map(opt => `
      <a class="wizard-option" href="#${homeHash}/${[...path, opt.next].join('/')}">
        <span>${esc(opt.label)}</span>
        <span class="wizard-option-arrow">→</span>
      </a>`).join('');

    view().innerHTML = `
      <div class="calc-eyebrow">${esc(eyebrow)}</div>
      ${breadcrumbHtml}
      <h1 class="wizard-question">${esc(node.question)}</h1>
      <div class="wizard-options">${optionsHtml}</div>
      ${backHtml}
    `;
  } else {
    const [primary, ...also] = node.results;
    const cardFor = (r, isPrimary) => {
      const item = resolveItem(r.id);
      if (!item) return '';
      return `
        <a class="wizard-result-card${isPrimary ? ' primary' : ''}" href="${itemHref(item)}">
          ${isPrimary ? '<div class="wizard-result-badge">Recommended</div>' : ''}
          <div class="wizard-result-name">${esc(itemName(item))}</div>
          <div class="wizard-result-hint">${esc(itemHint(item))}</div>
          <div class="wizard-result-why">${esc(r.why)}</div>
        </a>`;
    };

    view().innerHTML = `
      <div class="calc-eyebrow">${esc(eyebrow)}</div>
      ${breadcrumbHtml}
      <h1 class="wizard-question">Here's what fits</h1>
      <div class="wizard-results">
        ${cardFor(primary, true)}
        ${also.length ? `<div class="wizard-also-label">Also consider</div>` : ''}
        ${also.map(r => cardFor(r, false)).join('')}
      </div>
      ${backHtml}
    `;
  }

  document.getElementById('main').scrollTop = 0;
}

function renderWizard(path) {
  renderWizardGeneric(path, {
    tree: WIZARD_TREE,
    homeHash: 'wizard',
    eyebrow: 'Calculator Finder',
    resolveItem: id => CALCULATORS.find(c => c.id === id),
    itemHref: calc => `#${calc.id}`,
    itemName: calc => calc.name,
    itemHint: calc => calc.hint,
  });
}

function renderLearnWizard(path) {
  renderWizardGeneric(path, {
    tree: LEARN_WIZARD_TREE,
    homeHash: 'learnwizard',
    eyebrow: 'Guide Finder',
    resolveItem: id => GUIDES.find(g => g.id === id),
    itemHref: guide => `#learn/${guide.id}`,
    itemName: guide => guide.title,
    itemHint: guide => guide.blurb,
  });
}

/* ── LEARN: CHART-READING GUIDES ────────────────────────── */

// Hub page listing every guide in GUIDES (calculators.js), grouped by
// category. Reuses the .home-card grid so a second "Concepts" category
// (fixed vs random effects, heterogeneity, etc.) can be added later
// without any new CSS.
function renderLearnHub() {
  const groups = {};
  for (const g of GUIDES) {
    (groups[g.category] = groups[g.category] || []).push(g);
  }

  const { total: calcTotal, categories: calcCategories, plainLabel: calcAvailLabel } = calculatorCountSummary();

  const catEntries = Object.entries(groups);

  const sections = catEntries.map(([cat, guides]) => {
    const cards = guides.map(g => `
      <a class="home-card" href="#learn/${g.id}">
        <div class="home-card-name">${esc(g.title)}</div>
        <div class="home-card-desc">${esc(g.blurb)}</div>
      </a>`).join('');

    const isOpen = expandedLearnCategories.has(cat);

    return `
      <div class="home-section${isOpen ? '' : ' collapsed'}" data-cat="${esc(cat)}">
        <h2 class="home-section-heading">
          <button type="button" class="home-section-header${isOpen ? ' open' : ''}" aria-expanded="${isOpen}">
            <span class="home-section-chevron">▸</span>
            <span class="home-section-title">${esc(cat)}</span>
            <span class="home-section-count">${guides.length} guide${guides.length === 1 ? '' : 's'}</span>
          </button>
        </h2>
        <div class="home-cards">${cards}</div>
      </div>`;
  }).join('');

  view().innerHTML = `
    <div class="home-eyebrow">Critical Appraisal &amp; Reference</div>
    <h1 class="home-title">Learn</h1>
    <p class="home-desc">Reference guides for using this site well — how to recognize the kind of data you're working with, how to read the charts these calculators produce, and how to critically appraise the studies you're applying them to. Looking for a specific calculator instead? See the Calculator Index.</p>
    <a class="wizard-banner" href="#learnwizard">
      <span class="wizard-banner-icon">?</span>
      <span class="wizard-banner-text">Not sure where to start? Answer a few quick questions to find the right guide.</span>
      <span class="wizard-banner-arrow">→</span>
    </a>
    <a class="wizard-banner alt-banner" href="#">
      <span class="wizard-banner-icon">C</span>
      <span class="wizard-banner-text">${calcTotal} calculators across ${calcCategories} categories — ${calcAvailLabel}.</span>
      <span class="wizard-banner-arrow">→</span>
    </a>
    ${sections}
  `;

  document.querySelectorAll('.home-section-header').forEach(header => {
    header.addEventListener('click', () => {
      const section = header.closest('.home-section');
      const cat = section.dataset.cat;
      const nowOpen = !header.classList.contains('open');
      nowOpen ? expandedLearnCategories.add(cat) : expandedLearnCategories.delete(cat);
      header.classList.toggle('open', nowOpen);
      header.setAttribute('aria-expanded', String(nowOpen));
      section.classList.toggle('collapsed', !nowOpen);
    });
  });

  document.getElementById('main').scrollTop = 0;
}

// Renders a single guide: figure + legend, then prose sections, then
// links to the calculator(s) it applies to.
function renderGuide(guide) {
  // A legend item is either a flat CSS shape (swatchClass/swatchStyle —
  // squares, diamonds, solid lines, all renderable as a styled <span>)
  // or a tiny inline SVG (swatchSvg — used for dashed lines, since CSS
  // border-style:dashed renders inconsistently short/solid-looking at
  // this size, but an SVG stroke-dasharray always looks right).
  // The text is wrapped in its own <span> so it's a single flex item —
  // without it, `.guide-legend li`'s display:flex splits any <strong>/
  // <em>/<br> inside the text into separate flex items, each shoved
  // apart by the li's `gap`, which both breaks intentional <br> line
  // breaks and forces stray extra space around bolded words.
  const legendItem = item => `
    <li>${item.swatchSvg
      ? `<span class="guide-swatch-svg">${item.swatchSvg}</span>`
      : `<span class="guide-swatch ${item.swatchClass}" style="${item.swatchStyle}"></span>`
    }<span class="guide-legend-text">${item.text}</span></li>`;

  const legendHtml = guide.legendColumns
    ? `<div class="guide-legend-columns">${guide.legendColumns.map(col => `
        <div class="guide-legend-col">
          ${col[0] && col[0].colLabel ? `<div class="block-label">${esc(col[0].colLabel)}</div>` : ''}
          <ul class="guide-legend">${col.map(legendItem).join('')}</ul>
        </div>`).join('')}</div>`
    : guide.legend ? `<ul class="guide-legend">${guide.legend.map(legendItem).join('')}</ul>` : '';

  const sectionsHtml = (guide.sections || []).map(s => `
    <details class="guide-accordion-item">
      <summary class="guide-accordion-header">${esc(s.heading)}</summary>
      <div class="guide-body guide-accordion-body">${s.html}</div>
    </details>
  `).join('');

  // A `related` entry can point at either a calculator or another Learn
  // guide (guides cross-link each other constantly — e.g. Cohort ↔
  // Case-Control, or the GRADE guide ↔ the design guides that mention
  // it), so both id spaces are checked here rather than just CALCULATORS.
  const relatedHtml = (guide.related || []).map(r => {
    const calc = CALCULATORS.find(c => c.id === r.id);
    if (calc) {
      return `
        <a class="wizard-result-card" href="#${calc.id}">
          <div class="wizard-result-badge calc">Calculator</div>
          <div class="wizard-result-name">${esc(calc.name)}</div>
          <div class="wizard-result-hint">${esc(calc.hint)}</div>
          <div class="wizard-result-why">${esc(r.why)}</div>
        </a>`;
    }
    const relGuide = GUIDES.find(g => g.id === r.id);
    if (relGuide) {
      return `
        <a class="wizard-result-card" href="#learn/${relGuide.id}">
          <div class="wizard-result-badge">Learn Guide</div>
          <div class="wizard-result-name">${esc(relGuide.title)}</div>
          <div class="wizard-result-hint">${esc(relGuide.blurb)}</div>
          <div class="wizard-result-why">${esc(r.why)}</div>
        </a>`;
    }
    return '';
  }).join('');

  view().innerHTML = `
    <div class="calc-eyebrow"><a class="calc-back" href="#learn">← All Guides</a></div>
    <h1 class="calc-title">${esc(guide.title)}</h1>
    <p class="calc-desc">${guide.dek}</p>
    ${guide.figure ? `
    <div class="formula-block">
      ${guide.figure}
      ${guide.figureCaption ? `<div class="guide-figure-caption">${guide.figureCaption}</div>` : ''}
      ${legendHtml}
    </div>` : ''}
    <div class="guide-accordion">${sectionsHtml}</div>
    ${relatedHtml ? `
      <h2 class="guide-section-title">Related</h2>
      <div class="wizard-results">${relatedHtml}</div>
    ` : ''}
  `;
  document.getElementById('main').scrollTop = 0;
}

/* ── CALCULATOR VIEW ────────────────────────────────────── */

function renderCalculator(calc) {
  const formulas = calc.formulas.map(f => `
    <div>
      <div class="formula-row-label">${esc(f.label)}</div>
      <div class="formula-katex">${tryKatex(f.latex, true)}</div>
    </div>
  `).join('');

  // Notation glossary (NOTATION, defined in calculators.js) — a plain-
  // English meaning for every symbol used in this calculator's formulas,
  // e.g. "e" in a survey sample size calculator meaning margin of error.
  // Looked up by id rather than stored on the calculator itself so it
  // could be added for all 91 calculators without touching each one's
  // existing formulas/inputs/calculate block.
  const notation = NOTATION[calc.id] || [];
  const notationHtml = notation.map(n => `
    <div class="notation-row">
      <div class="notation-symbol">${tryKatex(n.symbol, false)}</div>
      <div class="notation-meaning">${esc(n.meaning)}</div>
    </div>
  `).join('');

  const inputsHtml = calc.inputLayout === '2x2' ? render2x2(calc)
    : calc.inputLayout === 'groups' ? renderGroupedInputs(calc)
    : renderGrid(calc);

  view().innerHTML = `
    <div class="calc-eyebrow">
      <a class="calc-back" href="#" aria-label="Back to all calculators">← All</a>
      ${esc(calc.category)}
    </div>
    <h1 class="calc-title">${esc(calc.name)}</h1>
    <p class="calc-desc">${esc(calc.description)}</p>

    ${calc.example ? `
    <details class="example-block">
      <summary class="example-summary">Medical Example — when &amp; how to use this</summary>
      <p class="example-body" id="example-body"></p>
    </details>` : ''}

    <div class="inputs-block">
      <div class="block-label">Inputs</div>
      ${inputsHtml}
    </div>

    <button class="calc-btn" id="calc-btn">Calculate</button>
    <div id="results-wrap"></div>

    <div class="formula-block">
      <div class="block-label">Formula</div>
      <div class="formula-list">${formulas}</div>
    </div>

    ${notation.length ? `
    <div class="notation-block">
      <div class="block-label">Notation</div>
      <div class="notation-list">${notationHtml}</div>
    </div>` : ''}
  `;
  document.getElementById('main').scrollTop = 0;

  function run() {
    const values = readInputs(calc);
    const results = calc.calculate(values);
    showResults(results, calc.id);
    updateExample(calc, values);
  }

  document.getElementById('calc-btn').addEventListener('click', run);

  if (calc.inputLayout === '2x2') {
    attachTotalListeners();
  }

  attachSliderListeners(calc, run);

  // Auto-run with the defaults already populated into the inputs above,
  // so users see example output immediately without clicking Calculate.
  run();
}

// Re-renders the "Medical Example" text using the calculator's current
// input values, so worked numbers in the example always match what's
// actually entered instead of going stale after the user edits inputs.
function updateExample(calc, values) {
  const el = document.getElementById('example-body');
  if (el && typeof calc.example === 'function') el.textContent = calc.example(values);
}

// Slider inputs recompute live as they're dragged, unlike every other
// input type which waits for the Calculate button — sliders are for
// exploring how an output changes continuously, not a one-shot entry.
function attachSliderListeners(calc, run) {
  calc.inputs.filter(inp => inp.type === 'slider').forEach(inp => {
    const el    = document.getElementById('inp-' + inp.id);
    const label = document.getElementById('val-' + inp.id);
    if (!el) return;
    el.addEventListener('input', () => {
      if (label) label.textContent = inp.format ? inp.format(parseFloat(el.value)) : el.value;
      run();
    });
  });
}

/* ── INPUT RENDERERS ────────────────────────────────────── */

function renderGrid(calc) {
  return `<div class="inputs-grid">` +
    calc.inputs.map(inp => {
      if (inp.type === 'textarea') {
        return `
          <div class="input-field input-field-wide">
            <label class="input-label" for="inp-${inp.id}">${esc(inp.label)}</label>
            <textarea class="input-el inputs-textarea" id="inp-${inp.id}"
                      data-id="${inp.id}" rows="3" spellcheck="false">${esc(String(inp.default))}</textarea>
          </div>`;
      }
      if (inp.type === 'slider') {
        const display = inp.format ? inp.format(inp.default) : String(inp.default);
        return `
          <div class="input-field input-field-wide">
            <label class="input-label" for="inp-${inp.id}">
              ${esc(inp.label)} — <span class="slider-value" id="val-${inp.id}">${esc(display)}</span>
            </label>
            <input class="input-slider" type="range" id="inp-${inp.id}" data-id="${inp.id}"
                   min="${inp.min}" max="${inp.max}" step="${inp.step}" value="${inp.default}">
          </div>`;
      }
      if (inp.type === 'select') {
        const opts = inp.options.map(o =>
          `<option value="${esc(o.value)}"${o.value === inp.default ? ' selected' : ''}>${esc(o.label)}</option>`
        ).join('');
        const hint = inp.note ? `<p class="input-hint">${esc(inp.note)}</p>` : '';
        return `
          <div class="input-field input-field-wide">
            <label class="input-label" for="inp-${inp.id}">${esc(inp.label)}</label>
            <select class="input-el" id="inp-${inp.id}" data-id="${inp.id}">${opts}</select>
            ${hint}
          </div>`;
      }
      if (inp.type === 'text') {
        return `
          <div class="input-field">
            <label class="input-label" for="inp-${inp.id}">${esc(inp.label)}</label>
            <input class="input-el" type="text" id="inp-${inp.id}" data-id="${inp.id}"
                   value="${esc(String(inp.default))}"${inp.placeholder ? ` placeholder="${esc(inp.placeholder)}"` : ''} autocomplete="off" spellcheck="false">
          </div>`;
      }
      return `
        <div class="input-field">
          <label class="input-label" for="inp-${inp.id}">${esc(inp.label)}</label>
          <input class="input-el" type="number" id="inp-${inp.id}"
                 data-id="${inp.id}" value="${inp.default}" step="any">
        </div>`;
    }).join('') +
  `</div>`;
}

// Renders calculators whose inputs come in repeated per-group sets
// (e.g. Group 1 Mean/SD/N, Group 2 Mean/SD/N, ...) as a table — one
// column per group, one row per field — instead of a plain field-by-
// field grid where "Group 1 Mean" and "Group 2 Mean" end up far apart
// and hard to visually line up. Driven by `calc.groupFields` (row
// definitions: [{ prefix, label }]) and, for calculators with more
// than 2 groups, whichever group numbers 1-`calc.groupMax` (default 6)
// actually have at least one of those fields present in `calc.inputs`
// — so purely-optional trailing groups (e.g. Group 4-6 in a 6-group
// ANOVA) don't force empty columns to render for every calculator
// that caps out lower than its declared groupMax.
// Any input NOT part of the group pattern (e.g. a shared alpha) is
// rendered normally, below the table, via the plain grid layout.
function renderGroupedInputs(calc) {
  const byId = id => calc.inputs.find(i => i.id === id);
  const maxGroups = calc.groupMax || 6;
  const groupNums = [];
  for (let i = 1; i <= maxGroups; i++) {
    if (calc.groupFields.some(f => byId(f.prefix + i))) groupNums.push(i);
  }

  const groupedIds = new Set();
  calc.groupFields.forEach(f => groupNums.forEach(i => groupedIds.add(f.prefix + i)));

  const term = calc.groupTerm || 'Group';
  const colLabel = i => (calc.groupLabels && calc.groupLabels[i - 1]) ? `${term} ${i} — ${esc(calc.groupLabels[i - 1])}` : `${term} ${i}`;

  const header = `<div class="group-corner"></div>` +
    groupNums.map(i => `<div class="group-col-header">${colLabel(i)}</div>`).join('');

  const rows = calc.groupFields.map(f => {
    const rowHeader = `<div class="group-row-header">${esc(f.label)}</div>`;
    const cells = groupNums.map(i => {
      const inp = byId(f.prefix + i);
      if (!inp) return `<div class="group-cell"></div>`;
      const isText = inp.type === 'text';
      return `
        <div class="group-cell">
          <input class="input-el" type="${isText ? 'text' : 'number'}" id="inp-${inp.id}" data-id="${inp.id}"
                 value="${esc(inp.default)}" ${isText ? '' : 'step="any"'} aria-label="${term} ${i} ${esc(f.label)}">
        </div>`;
    }).join('');
    return rowHeader + cells;
  }).join('');

  const groupTableHtml = `
    <div class="group-table" style="grid-template-columns: 150px repeat(${groupNums.length}, minmax(110px, 1fr));">
      ${header}
      ${rows}
    </div>
  `;

  const otherInputs = calc.inputs.filter(inp => !groupedIds.has(inp.id));
  const otherHtml = otherInputs.length ? renderGrid({ ...calc, inputs: otherInputs }) : '';

  return groupTableHtml + otherHtml;
}

function render2x2(calc) {
  const [a, b, c, d, ...extraInputs] = calc.inputs;
  const sum = (...ids) => ids.reduce((s, id) => s + +calc.inputs.find(i => i.id === id).default, 0);
  const labels = calc.tableLabels || {};
  const colPos = labels.colPos || 'Outcome +';
  const colNeg = labels.colNeg || 'Outcome −';
  const rowPos = labels.rowPos || 'Exposed +';
  const rowNeg = labels.rowNeg || 'Exposed −';
  return `
    ${render2x2ExtraInputs(extraInputs)}
    <p class="table-instruction">
      Enter your counts in the four shaded cells —
      <strong>a</strong>, <strong>b</strong>, <strong>c</strong>, and <strong>d</strong> —
      then click <strong>Calculate</strong>.
    </p>
    <div class="table-2x2-wrap">
      <div class="table-2x2">
        <div class="t2-corner"></div>
        <div class="t2-col-head">${esc(colPos)}</div>
        <div class="t2-col-head">${esc(colNeg)}</div>
        <div class="t2-total-head">Total</div>

        <div class="t2-row-head">${esc(rowPos)}</div>
        <div class="t2-cell">
          <span class="t2-cell-label">a</span>
          <input class="input-el" type="number" id="inp-a" data-id="a"
                 value="${a.default}" min="0" step="1" aria-label="a — ${esc(a.desc)}">
        </div>
        <div class="t2-cell">
          <span class="t2-cell-label">b</span>
          <input class="input-el" type="number" id="inp-b" data-id="b"
                 value="${b.default}" min="0" step="1" aria-label="b — ${esc(b.desc)}">
        </div>
        <div class="t2-total" id="tot-r1">${sum('a','b')}</div>

        <div class="t2-row-head">${esc(rowNeg)}</div>
        <div class="t2-cell">
          <span class="t2-cell-label">c</span>
          <input class="input-el" type="number" id="inp-c" data-id="c"
                 value="${c.default}" min="0" step="1" aria-label="c — ${esc(c.desc)}">
        </div>
        <div class="t2-cell">
          <span class="t2-cell-label">d</span>
          <input class="input-el" type="number" id="inp-d" data-id="d"
                 value="${d.default}" min="0" step="1" aria-label="d — ${esc(d.desc)}">
        </div>
        <div class="t2-total" id="tot-r2">${sum('c','d')}</div>

        <div class="t2-row-head" style="font-size:10.5px">Total</div>
        <div class="t2-total" id="tot-c1">${sum('a','c')}</div>
        <div class="t2-total" id="tot-c2">${sum('b','d')}</div>
        <div class="t2-total" id="tot-n">${sum('a','b','c','d')}</div>
      </div>
    </div>
  `;
}

// Renders any inputs beyond the four table cells (a, b, c, d) that a
// '2x2'-layout calculator declares — e.g. a study-design selector —
// as a prominent callout ABOVE the table (not a plain input field
// easy to miss below it), since picking the wrong option silently
// changes which results get shown further down.
function render2x2ExtraInputs(inputs) {
  return inputs.map(inp => {
    if (inp.type === 'select') {
      const opts = inp.options.map(o =>
        `<option value="${esc(o.value)}"${o.value === inp.default ? ' selected' : ''}>${esc(o.label)}</option>`
      ).join('');
      const hint = inp.note ? `<p class="input-hint">${esc(inp.note)}</p>` : '';
      return `
        <div class="design-callout">
          <div class="design-callout-label">Before you calculate</div>
          <label class="input-label" for="inp-${inp.id}">${esc(inp.label)}</label>
          <select class="input-el" id="inp-${inp.id}" data-id="${inp.id}">${opts}</select>
          ${hint}
        </div>`;
    }
    return '';
  }).join('');
}

function attachTotalListeners() {
  ['a','b','c','d'].forEach(id => {
    const el = document.getElementById('inp-' + id);
    if (el) el.addEventListener('input', refreshTotals);
  });
}

function refreshTotals() {
  const g = id => +(document.getElementById('inp-' + id)?.value || 0);
  const a = g('a'), b = g('b'), c = g('c'), d = g('d');
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('tot-r1', a+b); set('tot-r2', c+d);
  set('tot-c1', a+c); set('tot-c2', b+d);
  set('tot-n',  a+b+c+d);
}

/* ── READ INPUTS ────────────────────────────────────────── */

function readInputs(calc) {
  const vals = {};
  for (const inp of calc.inputs) {
    const el = document.getElementById('inp-' + inp.id);
    if (!el) { vals[inp.id] = inp.default; continue; }
    vals[inp.id] = (inp.type === 'textarea' || inp.type === 'select' || inp.type === 'text') ? el.value : parseFloat(el.value);
  }
  return vals;
}

/* ── RESULTS ────────────────────────────────────────────── */

function computeDomains(results) {
  const withCI = results.filter(r => r.ci && r.ci.length === 2);

  // Ratio domain (log scale) — include null=1 so reference line is always visible
  const ratioRows = withCI.filter(r => r.isRatio);
  let ratioDomain = null;
  if (ratioRows.length) {
    const vals = ratioRows.flatMap(r => [r.value, r.ci[0], r.ci[1], 1]).filter(v => v > 0);
    const logMin = Math.min(...vals.map(Math.log));
    const logMax = Math.max(...vals.map(Math.log));
    const span   = logMax - logMin;
    const pad    = Math.max(span * 0.4, 0.35); // at least ~0.35 log units each side
    ratioDomain  = [Math.exp(logMin - pad), Math.exp(logMax + pad)];
  }

  // Difference domain (linear) — include null=0
  const diffRows = withCI.filter(r => !r.isRatio);
  let diffDomain = null;
  if (diffRows.length) {
    const vals = diffRows.flatMap(r => [r.value, r.ci[0], r.ci[1], 0]);
    const mn   = Math.min(...vals);
    const mx   = Math.max(...vals);
    const span = mx - mn;
    const pad  = Math.max(span * 0.4, 0.05);
    diffDomain = [mn - pad, mx + pad];
  }

  return { ratioDomain, diffDomain };
}

function showResults(results, calcId) {
  const wrap  = document.getElementById('results-wrap');
  if (!wrap) return;

  const hasCI = results.some(r => r.ci && r.ci.length === 2);
  const cls   = hasCI ? 'has-ci' : 'no-ci';
  const { ratioDomain, diffDomain } = computeDomains(results);

  const headerCICell = hasCI
    ? `<div class="results-header-cell">95% CI</div>` : '';

  let svgCount = 0;
  const rows = results.map(r => {
    if (r.isSVG) {
      svgCount++;
      const filename = [calcId, slugify(r.label), svgCount > 1 ? svgCount : null].filter(Boolean).join('-');
      return `
        <div class="result-row result-viz">
          <div class="viz-toolbar">
            <button type="button" class="export-chart-btn" data-format="png" data-filename="${esc(filename)}" title="Download this chart as a PNG image">PNG ⬇</button>
            <button type="button" class="export-chart-btn" data-format="jpg" data-filename="${esc(filename)}" title="Download this chart as a JPG image">JPG ⬇</button>
          </div>
          ${r.svg}
        </div>`;
    }

    const valStr = (typeof r.value === 'number') ? String(r.value) : (r.value ?? '');

    let ciCell = '';
    if (hasCI && !r.isText) {
      if (r.ci && r.ci.length === 2) {
        const [lo, hi] = r.ci;
        const pt     = typeof r.value === 'number' ? r.value : 0;
        const domain = r.isRatio ? ratioDomain : diffDomain;
        ciCell = `
          <div class="result-ci">
            ${forestSVG(pt, lo, hi, r.isRatio, domain)}
            <span class="ci-text">[${+lo.toFixed(4)}, ${+hi.toFixed(4)}]</span>
          </div>`;
      } else {
        ciCell = `<div class="result-ci"></div>`;
      }
    }

    const rowCls = [
      'result-row',
      cls,
      r.isText    ? 'is-text-row' : '',
      r.highlight ? 'highlight' : '',
      r.isError   ? 'error-row' : '',
    ].filter(Boolean).join(' ');

    const labelText = r.isText ? upperAscii(r.label) : r.label;

    return `
      <div class="${rowCls}">
        <div class="result-label">${esc(labelText)}</div>
        <div class="result-value ${r.isText ? 'is-text' : ''}">${esc(valStr)}</div>
        ${ciCell}
      </div>
    `;
  }).join('');

  const legendHtml = hasCI ? `
    <div class="legend-bar">
      <span class="legend-item">
        <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden="true">
          <line x1="0" y1="5" x2="20" y2="5" stroke="#4E6EDB" stroke-width="1.5"/>
          <line x1="0" y1="2" x2="0" y2="8" stroke="#4E6EDB" stroke-width="1.5"/>
          <line x1="20" y1="2" x2="20" y2="8" stroke="#4E6EDB" stroke-width="1.5"/>
        </svg>
        95% CI
      </span>
      <span class="legend-item">
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <polygon points="5,0 10,5 5,10 0,5" fill="#E07B2C"/>
        </svg>
        Point estimate
      </span>
      <span class="legend-item">
        <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden="true">
          <line x1="10" y1="0" x2="10" y2="10" stroke="#1A1A2E"
                stroke-width="1" stroke-dasharray="2 2" opacity=".4"/>
        </svg>
        Null (1 for ratios, 0 for differences)
      </span>
    </div>
  ` : '';

  wrap.innerHTML = `
    <div class="results-block">
      <div class="results-header ${cls}">
        <div class="results-header-cell">Measure</div>
        <div class="results-header-cell align-right">Value</div>
        ${headerCICell}
      </div>
      <div class="results-table">${rows}</div>
      ${legendHtml}
    </div>
  `;
}

/* ── FOREST PLOT SVG ────────────────────────────────────── */

function forestSVG(value, lo, hi, isRatio, domain) {
  const W = 200, H = 22, PAD = 14;
  const pw = W - 2*PAD;

  let toX;
  if (isRatio) {
    const [dLo, dHi] = domain || [0.05, 20];
    const lMin = Math.log(dLo), lMax = Math.log(dHi);
    toX = v => PAD + ((Math.log(Math.max(v, 1e-6)) - lMin) / (lMax - lMin)) * pw;
  } else {
    const [dLo, dHi] = domain || [-1.2, 1.2];
    toX = v => PAD + ((Math.max(Math.min(v, dHi), dLo) - dLo) / (dHi - dLo)) * pw;
  }

  const clamp = x => Math.max(PAD, Math.min(W-PAD, x));
  const nullX = isRatio ? toX(1) : toX(0);
  const loX   = clamp(toX(lo));
  const hiX   = clamp(toX(hi));
  const cx    = clamp(toX(value));
  const cy    = H/2;
  const dh    = 5;

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
               class="forest-svg" aria-hidden="true">
    <line x1="${PAD}" y1="${cy}" x2="${W-PAD}" y2="${cy}"
          stroke="#CDD2E0" stroke-width="1"/>
    <rect x="${loX}" y="${cy-3}" width="${Math.max(hiX-loX,2)}" height="6"
          fill="#4E6EDB" opacity=".15" rx="1"/>
    <line x1="${loX}" y1="${cy}" x2="${hiX}" y2="${cy}"
          stroke="#4E6EDB" stroke-width="1.5"/>
    <line x1="${loX}" y1="${cy-4}" x2="${loX}" y2="${cy+4}"
          stroke="#4E6EDB" stroke-width="1.5"/>
    <line x1="${hiX}" y1="${cy-4}" x2="${hiX}" y2="${cy+4}"
          stroke="#4E6EDB" stroke-width="1.5"/>
    <line x1="${nullX}" y1="1" x2="${nullX}" y2="${H-1}"
          stroke="#1A1A2E" stroke-width="1" stroke-dasharray="2 2" opacity=".35"/>
    <polygon points="${cx},${cy-dh} ${cx+dh},${cy} ${cx},${cy+dh} ${cx-dh},${cy}"
             fill="#E07B2C"/>
  </svg>`;
}

/* ── UTILITIES ──────────────────────────────────────────── */

function view() {
  return document.getElementById('view');
}

function tryKatex(latex, display = false) {
  if (typeof katex === 'undefined') return `<code>${esc(latex)}</code>`;
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: display });
  } catch (e) {
    return `<code>${esc(latex)}</code>`;
  }
}

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // x̄, ȳ, etc. (letter + combining macron, U+0304) render unreliably
    // in many web fonts — see .over-bar in style.css for why — so
    // replace the combining mark with a real CSS overline instead.
    .replace(/([A-Za-z])̄/g, '<span class="over-bar">$1</span>');
}

// Uppercases only plain a-z ASCII letters, leaving everything else —
// Greek letters (α, β, χ...), subscripts, symbols — untouched. Used
// instead of CSS text-transform:uppercase for is-text-row labels,
// since that transform turns lowercase Greek letters into their
// capital forms (e.g. α → Α), which render visually identical to
// ordinary Latin letters (Α looks like "A"), silently corrupting any
// stats notation in a label like "Interpretation (α = 0.05)".
function upperAscii(s) {
  return String(s).replace(/[a-z]/g, c => c.toUpperCase());
}

// Turns a result row's label (e.g. "Forest Plot vs Reference") into a
// filesystem-safe filename fragment ("forest-plot-vs-reference").
function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'chart';
}

/* ── CHART EXPORT (PNG / JPG) ──────────────────────────────
   Every chart on the site is a plain inline SVG with no external
   references (no <image> tags, no @font-face) — the SVG rasterizes
   fine in its own right, so no canvas-tainting/cross-origin issue
   applies here. To export: clone the SVG, paint a white background
   rect behind it (JPEG can't represent transparency, and PNG
   shouldn't have to rely on whatever background happens to be behind
   it in the page), serialize it, load it into an <img> via a Blob
   URL, then draw that onto an offscreen canvas at several times the
   SVG's native resolution (charts are typically drawn at ~560×200
   SVG units — rasterizing 1:1 would look soft/pixelated once
   downloaded and viewed at a normal image size). One caveat: the
   custom web fonts used in these charts (IBM Plex Mono etc.) may not
   always carry over into the rasterized image in every browser,
   since the <img> loads the SVG in its own document context — text
   will just fall back to a generic monospace font in that case, not
   fail to export. */
function exportSVGAsImage(svgEl, filename, format) {
  const RESOLUTION_SCALE = 3;
  const viewBox = svgEl.getAttribute('viewBox');
  const [, , vbWidth, vbHeight] = viewBox
    ? viewBox.trim().split(/\s+/).map(Number)
    : [0, 0, svgEl.clientWidth || 560, svgEl.clientHeight || 200];

  const clone = svgEl.cloneNode(true);
  clone.setAttribute('width', vbWidth);
  clone.setAttribute('height', vbHeight);
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', '0');
  bg.setAttribute('y', '0');
  bg.setAttribute('width', String(vbWidth));
  bg.setAttribute('height', String(vbHeight));
  bg.setAttribute('fill', '#ffffff');
  clone.insertBefore(bg, clone.firstChild);

  const svgString = new XMLSerializer().serializeToString(clone);
  const svgUrl = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }));

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = vbWidth * RESOLUTION_SCALE;
    canvas.height = vbHeight * RESOLUTION_SCALE;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(svgUrl);

    const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
    canvas.toBlob(blob => {
      if (!blob) { alert('Sorry, exporting this chart failed. Please try taking a screenshot instead.'); return; }
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${filename}.${format === 'jpg' ? 'jpg' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);
    }, mime, 0.95);
  };
  img.onerror = () => {
    URL.revokeObjectURL(svgUrl);
    alert('Sorry, exporting this chart failed. Please try taking a screenshot instead.');
  };
  img.src = svgUrl;
}
