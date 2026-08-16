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
    // Set (and immediately consumed) by the glossary quick-index click
    // handler below — it deliberately writes location.hash itself, to
    // get the browser's own native same-page-anchor scrolling (which
    // correctly walks nested scroll containers, unlike several manual
    // attempts at reproducing that in JS), and this skips routing for
    // that one resulting hashchange instead of falling through to
    // route()'s calculator/guide lookup and rendering renderHome().
    if (window.__skipRouteOnce) { window.__skipRouteOnce = false; return; }
    applyActiveState();
    route();
  });

  // Brand click: always go to the front door, even when already there
  // (no hashchange fires in that case, since the hash doesn't change).
  document.querySelector('.sidebar-brand').addEventListener('click', e => {
    if (location.hash === '#home') {
      e.preventDefault();
      renderFrontDoor();
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

  // Breadcrumb category crumb (see renderCalculator/renderGuide's
  // .page-breadcrumb) — pre-expands that category's section before
  // the browser follows the link back to its hub, so the hub lands
  // already open to the relevant section instead of fully collapsed.
  // Delegated (rather than attached per-render) since every
  // calculator/guide page rebuilds this breadcrumb from scratch.
  document.addEventListener('click', e => {
    const link = e.target.closest('a[data-expand-cat]');
    if (!link) return;
    const cat = link.dataset.expandCat;
    const set = link.dataset.expandTarget === 'learn' ? expandedLearnCategories
      : link.dataset.expandTarget === 'designs' ? expandedDesignCategories
      : expandedHomeCategories;
    set.add(cat);
    pendingCategoryScroll = cat;
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

  // Glossary quick-index links (#gloss-*) jump to a row within the
  // SAME rendered guide page — but a #gloss-xxx hash never matches a
  // calculator/guide id, so letting it reach the hash router's route()
  // would fall through to renderHome(), destroying the very page the
  // link is supposed to jump within. Handled here instead: open the
  // row's section/table if collapsed, then let the browser's own
  // native same-page-anchor scrolling do the actual jump (see the
  // longer comment below) rather than reimplementing it by hand.
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#gloss-"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();

    // Every guide section renders as a native <details> element,
    // closed by default (see renderGuide's guide-accordion-item) — its
    // content isn't part of the page layout at all until opened, so a
    // row inside a still-closed section has no meaningful position to
    // scroll to yet. Force it open first.
    const details = target.closest('details');
    if (details && !details.open) details.open = true;

    // Each glossary table is additionally wrapped in a .ref-table-wrap
    // with its own max-height/overflow-y (an independent scrollbar for
    // tall tables) — neutralized here so the row's position resolves
    // against #main (the page's real scroll container — #app is a
    // fixed-height shell with overflow: hidden) instead of getting
    // trapped inside the wrap's own small scrollbox.
    const wrap = target.closest('.ref-table-wrap');
    const prevMaxHeight = wrap ? wrap.style.maxHeight : null;
    const prevOverflowY = wrap ? wrap.style.overflowY : null;
    if (wrap) {
      wrap.style.maxHeight = 'none';
      wrap.style.overflowY = 'visible';
    }

    // Flash the destination row (style.css's .gloss-flash animation)
    // so the eye lands on the right entry — the #gloss-* anchor spans
    // are invisible markers, so the jump alone gives no visual cue of
    // which row it arrived at. Stripping the class everywhere first,
    // then forcing a reflow, restarts the animation even when the same
    // term is clicked twice in a row.
    const row = target.closest('tr');
    if (row) {
      document.querySelectorAll('.gloss-flash').forEach(el => el.classList.remove('gloss-flash'));
      void row.offsetWidth;
      row.classList.add('gloss-flash');
    }

    // Several attempts at reproducing "scroll this into view" by hand
    // (scrollIntoView with various options, then manual pixel math
    // against #main) all produced subtly wrong positions. Simplest
    // reliable fix: let the browser's own native same-page-anchor
    // scrolling do it — writing location.hash makes the browser jump
    // to the matching id itself, correctly walking whatever nested
    // scroll containers exist, the same as a normal in-page anchor
    // link. __skipRouteOnce (see the hashchange listener above) stops
    // the resulting hashchange from reaching the SPA router.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__skipRouteOnce = true;
      location.hash = id;
      setTimeout(() => {
        if (wrap) {
          wrap.style.maxHeight = prevMaxHeight;
          wrap.style.overflowY = prevOverflowY;
          // Re-clamping a tall table would otherwise swallow a row in
          // its bottom half back into the wrap's scrollbox (reset to
          // the top) while the page under the reader shortens by the
          // clamped-off height — so re-point both scroll levels at the
          // row: the wrap's inner scrollbar (offset past the sticky
          // thead, which floats over the first ~36px of the scrollbox),
          // then the page scroll back onto the re-clamped wrap itself.
          // Tables short enough to fit inside the clamp never had the
          // problem, so skip them and avoid a visible late re-scroll.
          if (wrap.scrollHeight > wrap.clientHeight) {
            wrap.scrollTop = (row || target).getBoundingClientRect().top - wrap.getBoundingClientRect().top - 44;
            wrap.scrollIntoView({ block: 'start', behavior: 'instant' });
          }
        }
      }, 400);
    }));
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

// Remembers which of the three hubs (calculators/learn/designs) a
// visitor last actually browsed, so a bare '#' on a later visit in the
// SAME browser session can skip straight back there instead of
// re-showing the front door every time — see route()'s handling of
// hash === '' below. sessionStorage (not localStorage) deliberately,
// so the front door reappears on a fresh visit (new tab/window opened
// later, or the browser reopened) rather than being remembered
// permanently; wrapped in try/catch since some browsers throw on
// storage access in private-browsing/storage-blocked contexts, and
// losing this preference should never break navigation.
function rememberLastHub(hub) {
  try { sessionStorage.setItem('lastHub', hub); } catch (e) { /* storage unavailable — remembering is best-effort only */ }
}

function route() {
  trackPageview();
  const hash = location.hash.slice(1);

  if (hash === 'home') {
    renderFrontDoor();
    return;
  }
  if (hash === 'wizard' || hash.startsWith('wizard/')) {
    renderWizard(hash === 'wizard' ? [] : hash.slice('wizard/'.length).split('/'));
    return;
  }
  if (hash === 'learnwizard' || hash.startsWith('learnwizard/')) {
    renderLearnWizard(hash === 'learnwizard' ? [] : hash.slice('learnwizard/'.length).split('/'));
    return;
  }
  if (hash === 'designwizard' || hash.startsWith('designwizard/')) {
    renderDesignWizard(hash === 'designwizard' ? [] : hash.slice('designwizard/'.length).split('/'));
    return;
  }
  if (hash === 'designs') {
    rememberLastHub('designs');
    renderDesignsHub();
    return;
  }
  if (hash === 'learn' || hash.startsWith('learn/')) {
    rememberLastHub('learn');
    if (hash === 'learn') { renderLearnHub(); return; }
    const guide = GUIDES.find(g => g.id === hash.slice('learn/'.length));
    guide ? renderGuide(guide) : renderLearnHub();
    return;
  }
  if (hash === 'calculators') {
    rememberLastHub('calculators');
    renderHome();
    return;
  }
  const calc = CALCULATORS.find(c => c.id === hash);
  if (calc) {
    rememberLastHub('calculators');
    renderCalculator(calc);
    return;
  }

  // A genuinely empty hash — the first visit of a browser session, or
  // a returning visitor within that same session who cleared it — is
  // the one case route() treats specially: no remembered hub yet (a
  // fresh session) shows the neutral front door; having already
  // visited a hub earlier in this session skips straight back to it.
  // Any other unrecognized hash (a stale/typo'd link) still falls back
  // to the Calculator Index, same as always.
  if (hash === '') {
    const lastHub = (() => { try { return sessionStorage.getItem('lastHub'); } catch (e) { return null; } })();
    if (lastHub === 'learn' || lastHub === 'designs' || lastHub === 'calculators') {
      location.hash = lastHub;
      return;
    }
    renderFrontDoor();
    return;
  }
  renderHome();
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

// Set by clicking a breadcrumb's category crumb (see the delegated
// [data-expand-cat] click handler in the DOMContentLoaded block below)
// just before the browser follows the link back to '#'/'#learn'/
// '#designs' — consumed once by the next renderHome()/renderLearnHub()/
// renderDesignsHub() to scroll straight to that now-expanded section
// instead of dropping the user back at the top of a many-category hub
// page. Same category-name string works across all three hubs' markup
// (they all render sections as .home-section[data-cat="..."]).
let pendingCategoryScroll = null;

// Shared by renderHome()/renderLearnHub()/renderDesignsHub(): if a
// breadcrumb click requested a specific category, scroll its section
// into view instead of resetting to the top of the page. Falls back
// to scrollTop = 0 (the normal behavior) when nothing was requested or
// the category can't be found on this particular hub.
function scrollToPendingCategoryOrTop() {
  const main = document.getElementById('main');
  const cat = pendingCategoryScroll;
  pendingCategoryScroll = null;
  const section = cat && document.querySelector(`.home-section[data-cat="${CSS.escape(cat)}"]`);
  if (section) section.scrollIntoView({ block: 'start' });
  else main.scrollTop = 0;
}

// Maps a Learn guide to its breadcrumb category crumb. Ordinary
// categories link straight back to '#learn' with that category
// pre-expanded. 'Appraising Studies by Design' guides are the
// exception: the Learn hub deliberately excludes that whole category
// (see renderLearnHub) in favor of the separate Designs hub, which
// groups them under its own curated buckets (DESIGN_GLANCE_CATEGORIES)
// rather than by guide.category directly — so this looks up which
// bucket (if any) actually features the guide and points there
// instead. A couple of guides in that category aren't featured in any
// bucket yet (e.g. Genetic Association Studies, Realist Reviews); for
// those this returns a plain, non-clickable crumb rather than link to
// a hub page that won't actually show them.
function guideCategoryCrumb(guide) {
  if (guide.category !== 'Appraising Studies by Design') {
    return { label: guide.category, href: '#learn', expandCat: guide.category, expandTarget: 'learn' };
  }
  for (const { category, keys } of DESIGN_GLANCE_CATEGORIES) {
    if (keys.some(key => DESIGN_WIZARD_TREE[key]?.results?.[0]?.id === guide.id)) {
      return { label: category, href: '#designs', expandCat: category, expandTarget: 'designs' };
    }
  }
  return { label: guide.category, href: null };
}

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

// Same idea as calculatorCountSummary(), for GUIDES — shared by the
// Learn hub's own header and the calculator home page's cross-link
// banner, so neither hardcodes a count that drifts out of sync as
// guides are added. Unlike calculators, every guide in GUIDES is
// already written (there's no "planned" status to report), so this
// is just a total/category count, not an available-vs-coming-soon
// split.
function guideCountSummary() {
  const total      = GUIDES.length;
  const categories = new Set(GUIDES.map(g => g.category)).size;
  return { total, categories };
}

// Shared 3-way toggle at the top of each hub page (Calculator home,
// Learn hub, Designs hub) — `active` marks which one is current.
function hubToggleHtml(active) {
  const link = (href, label, key) => `<a href="${href}" class="hub-toggle-link${active === key ? ' active' : ''}">${label}</a>`;
  return `
    <div class="hub-toggle">
      ${link('#calculators', 'Calculators', 'calculators')}
      ${link('#learn', 'Learn', 'learn')}
      ${link('#designs', 'Designs', 'designs')}
    </div>`;
}

// Display order for the Full Calculator Index's category sections —
// see renderHome() below for how categories missing from this list
// (currently Probability & Distributions, Non-Parametric Tests) are handled.
const HOME_CATEGORY_ORDER = [
  'Descriptive Statistics',
  'Epidemiology & Risk',
  'T-Tests & Z-Tests',
  'Chi-Square & Categorical',
  'Effect Sizes & Agreement',
  'Correlation & Regression',
  'Power & Sample Size',
  'Diagnostic Testing',
  'ANOVA',
  'Survival Analysis',
  'Patient-Reported Outcomes',
  'Bayesian & Meta-Analysis',
  'Genetics & Genomics',
];

// The site's actual landing page — see route()'s handling of a bare
// '#' and the explicit '#home' route. No hub-toggle here on purpose:
// this page sits above the three-way toggle, so showing it would
// wrongly imply one of the three is already selected. Every count and
// category name below is pulled live from the same data the other
// three hubs use, so this never drifts out of sync as calculators,
// guides, or designs are added.
function renderFrontDoor() {
  const { total: calcTotal, categories: calcCatCount } = calculatorCountSummary();
  const { total: guideTotal, categories: guideCatCount } = guideCountSummary();
  const designTotal = DESIGN_GLANCE_CATEGORIES.reduce((s, c) => s + c.keys.length, 0);
  const designCatCount = DESIGN_GLANCE_CATEGORIES.length;

  const calcCats  = HOME_CATEGORY_ORDER.slice(0, 3);
  const guideCats = [...new Set(GUIDES.map(g => g.category))].slice(0, 3);
  const designCats = DESIGN_GLANCE_CATEGORIES.slice(0, 3).map(c => c.category);

  const listHtml = (cats, total, unit) => {
    const items = cats.map(c => `<div class="frontdoor-card-list-item">${esc(c)}</div>`).join('');
    const more = total - cats.length;
    const moreHtml = more > 0 ? `<div class="frontdoor-card-list-more">+${more} more ${unit}</div>` : '';
    return `<div class="frontdoor-card-list">${items}${moreHtml}</div>`;
  };

  view().innerHTML = `
    <div class="frontdoor-hero">
      <div class="frontdoor-hero-text">
        <div class="frontdoor-title">The Biostat Toolkit</div>
        <p class="frontdoor-sub">Calculators, study-design reference, and critical-appraisal guides for coursework, journal clubs, and clinical research.</p>

        <div class="frontdoor-search">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.4"/>
            <line x1="11.2" y1="11.2" x2="15" y2="15" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
          <input type="text" id="frontdoor-search-input" placeholder="Search calculators, guides, or study designs…" autocomplete="off" spellcheck="false">
        </div>
      </div>
      <div class="frontdoor-hero-img">
        <img src="assets/hero-desk.png" alt="A desk with a laptop showing a bell-curve chart, a stethoscope, a calculator, a coffee mug printed with the normal-distribution formula, and an open notebook of statistics notes beside a book titled The Biostat Toolkit.">
      </div>
    </div>

    <div class="frontdoor-grid">
      <div class="frontdoor-card c-blue">
        <a class="frontdoor-card-main" href="#calculators">
          <div class="frontdoor-card-icon" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <rect x="10" y="6" width="44" height="52" rx="9" fill="#DCE6FB" stroke="#4E6EDB" stroke-width="1.5"/>
              <rect x="16" y="12" width="32" height="13" rx="2.5" fill="#1E1A47"/>
              <text x="32" y="21.5" text-anchor="middle" font-family="'IBM Plex Mono', monospace" font-size="7.5" fill="#EEEAF8">x&#772; = 128.4</text>
              <rect x="16" y="30" width="7" height="7" rx="1.8" fill="#4E6EDB"/>
              <rect x="27" y="30" width="7" height="7" rx="1.8" fill="#4E6EDB"/>
              <rect x="38" y="30" width="7" height="7" rx="1.8" fill="#4E6EDB"/>
              <rect x="16" y="40" width="7" height="7" rx="1.8" fill="#4E6EDB"/>
              <rect x="27" y="40" width="7" height="7" rx="1.8" fill="#4E6EDB"/>
              <rect x="38" y="40" width="7" height="7" rx="1.8" fill="#4E6EDB"/>
              <rect x="16" y="50" width="7" height="7" rx="1.8" fill="#4E6EDB"/>
              <rect x="27" y="50" width="7" height="7" rx="1.8" fill="#4E6EDB"/>
              <rect x="38" y="50" width="7" height="7" rx="1.8" fill="#4E6EDB"/>
            </svg>
          </div>
          <div class="frontdoor-card-eyebrow">Statistical Calculator Library</div>
          <div class="frontdoor-card-name">Calculators</div>
          <div class="frontdoor-card-count">${calcTotal} calculators across ${calcCatCount} categories.</div>
          ${listHtml(calcCats, calcCatCount, 'categories')}
          <div class="frontdoor-card-cta">Browse calculators →</div>
        </a>
        <a class="frontdoor-card-wizard" href="#wizard">Not sure which one? Take the quiz</a>
      </div>

      <div class="frontdoor-card c-green">
        <a class="frontdoor-card-main" href="#designs">
          <div class="frontdoor-card-icon" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <line x1="32" y1="12" x2="18" y2="28" stroke="#9CC77A" stroke-width="2"/>
              <line x1="32" y1="12" x2="46" y2="28" stroke="#9CC77A" stroke-width="2"/>
              <line x1="18" y1="28" x2="10" y2="46" stroke="#9CC77A" stroke-width="2"/>
              <line x1="18" y1="28" x2="24" y2="46" stroke="#9CC77A" stroke-width="2"/>
              <line x1="46" y1="28" x2="40" y2="46" stroke="#9CC77A" stroke-width="2"/>
              <line x1="46" y1="28" x2="54" y2="46" stroke="#9CC77A" stroke-width="2"/>
              <circle cx="32" cy="12" r="5.5" fill="#6FA84A"/>
              <circle cx="18" cy="28" r="6.5" fill="#2E6B2E"/>
              <circle cx="46" cy="28" r="6.5" fill="#2E6B2E"/>
              <circle cx="10" cy="46" r="4.5" fill="#6FA84A"/>
              <circle cx="24" cy="46" r="4.5" fill="#6FA84A"/>
              <circle cx="40" cy="46" r="4.5" fill="#6FA84A"/>
              <circle cx="54" cy="46" r="4.5" fill="#6FA84A"/>
            </svg>
          </div>
          <div class="frontdoor-card-eyebrow">Research Design Reference</div>
          <div class="frontdoor-card-name">Study designs</div>
          <div class="frontdoor-card-count">${designTotal} designs across ${designCatCount} groups.</div>
          ${listHtml(designCats, designCatCount, 'groups')}
          <div class="frontdoor-card-cta">Browse designs →</div>
        </a>
        <a class="frontdoor-card-wizard" href="#designwizard">Not sure which one? Take the quiz</a>
      </div>

      <div class="frontdoor-card c-amber">
        <a class="frontdoor-card-main" href="#learn">
          <div class="frontdoor-card-icon" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <path d="M20,14 Q32,3 44,14" fill="none" stroke="#3B2E6B" stroke-width="1.8" stroke-linecap="round"/>
              <circle cx="32" cy="5" r="2" fill="#3B2E6B"/>
              <rect x="10" y="14" width="44" height="42" rx="6" fill="#E4DCF5" stroke="#8B6FC9" stroke-width="1.5"/>
              <line x1="32" y1="14" x2="32" y2="56" stroke="#7A5FB8" stroke-width="1.5"/>
              <line x1="16" y1="24" x2="27" y2="24" stroke="#9B85CE" stroke-width="1.5"/>
              <line x1="16" y1="32" x2="27" y2="32" stroke="#9B85CE" stroke-width="1.5"/>
              <line x1="16" y1="40" x2="27" y2="40" stroke="#9B85CE" stroke-width="1.5"/>
              <line x1="37" y1="24" x2="48" y2="24" stroke="#9B85CE" stroke-width="1.5"/>
              <line x1="37" y1="32" x2="48" y2="32" stroke="#9B85CE" stroke-width="1.5"/>
              <line x1="37" y1="40" x2="48" y2="40" stroke="#9B85CE" stroke-width="1.5"/>
            </svg>
          </div>
          <div class="frontdoor-card-eyebrow">Critical Appraisal &amp; Reference</div>
          <div class="frontdoor-card-name">Learn</div>
          <div class="frontdoor-card-count">${guideTotal} guides across ${guideCatCount} categories.</div>
          ${listHtml(guideCats, guideCatCount, 'categories')}
          <div class="frontdoor-card-cta">Browse guides →</div>
        </a>
        <a class="frontdoor-card-wizard" href="#learnwizard">Not sure which one? Take the quiz</a>
      </div>
    </div>
  `;

  // Mirrors into the sidebar's own search field and reuses its exact
  // existing input pipeline (buildNav + applyActiveState), rather than
  // building a second, separate results list just for this page.
  const frontdoorSearchEl = document.getElementById('frontdoor-search-input');
  frontdoorSearchEl.addEventListener('input', () => {
    const sidebarSearchEl = document.getElementById('search');
    sidebarSearchEl.value = frontdoorSearchEl.value;
    sidebarSearchEl.dispatchEvent(new Event('input', { bubbles: true }));
  });

  scrollToPendingCategoryOrTop();
}

function renderHome() {
  // Group CALCULATOR_INDEX by category, preserving insertion order
  const groups = {};
  for (const entry of CALCULATOR_INDEX) {
    (groups[entry.category] = groups[entry.category] || []).push(entry);
  }

  const { total, availLabel } = calculatorCountSummary();
  const { total: guideTotal, categories: guideCategories } = guideCountSummary();

  // Deliberate display order for the home page's category sections
  // (chosen to read roughly "most commonly reached-for first" rather
  // than CALCULATOR_INDEX's own insertion order). Any category not
  // listed here — currently Probability & Distributions and
  // Non-Parametric Tests — falls back to the end, in whatever order
  // it already had, via the stable sort below.
  const orderedCats = Object.keys(groups).sort((a, b) => {
    const ia = HOME_CATEGORY_ORDER.indexOf(a);
    const ib = HOME_CATEGORY_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const sections = orderedCats.map(cat => {
    const entries = groups[cat];
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
    ${hubToggleHtml('calculators')}
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
      <span class="wizard-banner-text">${guideTotal} critical appraisal guides, reporting-guideline checklists, and reference pages across ${guideCategories} categories — all under Learn.</span>
      <span class="wizard-banner-arrow">→</span>
    </a>
    <div class="home-sections-grid">${sections}</div>
  `;
  scrollToPendingCategoryOrTop();

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

// Reverse index of a decision tree: every reachable node's path (an
// array of node ids from 'start', not including 'start' itself),
// found by a one-time breadth-first walk. Used by the free-text
// "smart start" box below to jump straight to a result node's full
// path rather than only its id — the path is what actually drives
// the wizard (it's the URL hash), so a bare node id isn't enough to
// navigate there. Cached per tree object, since neither WIZARD_TREE
// nor LEARN_WIZARD_TREE changes at runtime.
//
// The same walk also accumulates each leaf's PATH TEXT: every
// question asked plus the specific option label chosen at each step
// leading to it (e.g. "What's your goal for these two groups? ...
// Show that they differ ... Are the two groups paired ... Independent
// (different subjects in each group)"). matchWizardDescription scores
// this alongside the resolved calculator/guide's own name/keywords —
// a free-text query describing a scenario ("independent samples,
// want to know if they differ") often matches this wizard-authored
// phrasing far better than it matches the destination item's own text.
const wizardPathCache = new Map();
function getWizardPaths(tree) {
  if (wizardPathCache.has(tree)) return wizardPathCache.get(tree);
  const paths = { start: [] };
  const texts = { start: '' };
  const queue = ['start'];
  const seen = new Set(['start']);
  while (queue.length) {
    const id = queue.shift();
    const node = tree[id];
    if (!node || !node.options) continue;
    for (const opt of node.options) {
      if (seen.has(opt.next)) continue;
      seen.add(opt.next);
      paths[opt.next] = [...paths[id], opt.next];
      texts[opt.next] = `${texts[id]} ${node.question || ''} ${opt.label}`.trim();
      queue.push(opt.next);
    }
  }
  const result = { paths, texts };
  wizardPathCache.set(tree, result);
  return result;
}

// Free-text descriptions are ordinary prose ("comparing an oral
// health score between two treatment groups..."), unlike the short,
// term-heavy fragments the sidebar search is normally typed with — so
// common filler words are filtered out before scoring here. Otherwise
// a word as short and generic as "vs" can accidentally out-weigh the
// actual medical/statistical terms in the same query, since it still
// counts as a whole-word hit against any curated SEARCH_KEYWORDS
// phrase that happens to contain it (e.g. "generic vs brand-name drug").
const WIZARD_STOPWORDS = new Set([
  'a','an','the','and','or','of','in','on','at','to','for','with','vs','versus',
  'is','are','was','were','be','been','being','my','our','their','this','that',
  'these','those','it','its','as','by','from','after','before','than','then',
  'so','if','not','no','do','does','did','has','have','had','will','would',
  'can','could','should','about','between','across','per','via','using','use',
  'used','who','what','when','where','how','which','i','we','you','your',
  // 'out' is a substring of 'outcome' (and 'without', 'throughout', ...),
  // which are all over this site's calculator/guide text — as its own
  // filterWord it was outscoring genuinely relevant terms in ordinary
  // queries like "...on this emerging topic, find gaps" purely because
  // "out" happened to appear inside some calculator's "outcome".
  'out',
]);

// Path-text weight sits below a calculator/guide's own name (10) or
// curated SEARCH_KEYWORDS (12) but above its hint/blurb (4) — high
// enough that a query written in the wizard's own question/option
// phrasing can carry a leaf across the > 0 threshold on its own, not
// so high that it drowns out a genuinely strong name/keyword match.
const WIZARD_PATH_TEXT_WEIGHT = 8;

// Scores a wizard "results" leaf against a free-text description by
// taking the BEST individual match among everything that leaf
// recommends (not the sum — a leaf with many results, like the plain
// descriptive-stats one, shouldn't win just by having more entries),
// and remembering WHICH result achieved it. That specific result —
// not necessarily the leaf's own nominal "primary" recommendation —
// is what the smart-start preview card shows, so a query that really
// matches a secondary suggestion (e.g. Shapiro-Wilk tucked inside the
// 1-Way ANOVA leaf) is credited to the thing it actually matched.
// Reuses searchScore()/searchScoreGuide() — the exact same weighted
// fields (name, curated SEARCH_KEYWORDS phrases, hint/blurb,
// description/dek, category) the sidebar search already uses — so
// the same phrase finds the same destination whether typed into the
// sidebar or into this box.
//
// On top of that item score, `pathText` — the question text and
// chosen option labels leading to this leaf (see getWizardPaths) — is
// scored the same way and added in. A free-text description often
// describes the SCENARIO ("independent samples, want to know if they
// differ") rather than naming the destination calculator/guide, and
// that scenario language is exactly what the wizard's own questions
// and option labels are written in — so a leaf whose destination item
// scores 0 can still surface correctly on the strength of its path
// alone. When no individual result ever beats 0, bestResult falls
// back to the leaf's first (nominal "primary") result, same as the
// Designs hub's own cards do, so there's still something sensible to
// show and link to.
function scoreWizardLeaf(leaf, pathText, filter, filterWords, resolveItem, scoreItem) {
  let best = 0, bestResult = null;
  for (const r of leaf.results) {
    const item = resolveItem(r.id);
    if (!item) continue;
    const s = scoreItem(item, filter, filterWords);
    if (s > best) { best = s; bestResult = r; }
  }
  const pathScore = pathText
    ? scoreWeightedFields([{ text: pathText, weight: WIZARD_PATH_TEXT_WEIGHT }], filter, filterWords)
    : 0;
  return { score: best + pathScore, bestResult: bestResult || leaf.results[0] };
}

// Ranks every reachable result node in `tree` against a free-text
// description, best first; [] if nothing scored above 0. `resolveItem`
// and `scoreItem` are threaded through from the same cfg the rest of
// renderWizardGeneric uses, so this works for both the calculator
// finder and the Learn guide finder without duplicating it per tree.
// `extraStopwords` (optional) adds tree-specific noise words on top of
// WIZARD_STOPWORDS — e.g. the design wizard drops "test"/"tests" since
// a query like "how good is this diagnostic test" would otherwise
// match every calculator whose NAME merely contains "test" (t-test,
// z-test, Egger's test, ...), a collision the calculator finder
// doesn't have (there, "test" is a genuinely useful query word).
function matchWizardDescription(tree, query, resolveItem, scoreItem, extraStopwords) {
  const filter = query.trim().toLowerCase();
  if (!filter) return [];
  // Free-text prose comes with commas/periods attached to words ("two
  // groups," "measurement.") that a plain whitespace split would leave
  // stuck to the token, silently breaking every match for that word —
  // this pulls out word-like runs instead (keeping internal hyphens/
  // apostrophes, so "case-control" and "don't" stay single tokens).
  const filterWords = (filter.match(/[a-z0-9]+(?:['-][a-z0-9]+)*/g) || [])
    .filter(w => w.length > 1 && !WIZARD_STOPWORDS.has(w) && !(extraStopwords && extraStopwords.has(w)));
  const { paths, texts } = getWizardPaths(tree);
  return Object.keys(tree)
    .filter(key => tree[key].results && paths[key])
    .map(key => {
      const pathText = (texts[key] || '').toLowerCase();
      const { score, bestResult } = scoreWizardLeaf(tree[key], pathText, filter, filterWords, resolveItem, scoreItem);
      return { key, path: paths[key], score, bestResult };
    })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score);
}

// Renders the free-text "smart start" box's own result cards (a
// best-match "primary" card plus up to 2 close runners-up), reusing
// the exact same .wizard-result-card markup as a normal results
// screen so a match found this way looks like what clicking through
// the questions would have produced. Each card is headlined by the
// SPECIFIC calculator/guide that actually matched (m.bestResult) —
// not necessarily the leaf's own nominal "primary" recommendation —
// so a query that really matches a secondary suggestion tucked inside
// a bigger leaf (e.g. Shapiro-Wilk inside the 1-Way ANOVA leaf) gets
// credited to the thing it actually matched. Runners-up only show if
// they scored at least 60% of the top match, so a lopsided win
// doesn't clutter the box with irrelevant "also maybe" noise.
function renderWizardSmartResults(matches, cfg) {
  const container = document.getElementById('wizard-smart-results');
  if (!container) return;

  if (!matches.length) {
    container.innerHTML = `<p class="wizard-smart-empty">No confident match for that — try adding a bit more detail (what's being measured, how many groups, whether it's the same subjects measured twice), or answer the questions below instead.</p>`;
    return;
  }

  const [top, ...rest] = matches;
  const runnersUp = rest.filter(m => m.score >= top.score * 0.6).slice(0, 2);

  const cardFor = (m, isPrimary) => {
    const item = cfg.resolveItem(m.bestResult.id);
    if (!item) return '';
    return `
      <a class="wizard-result-card${isPrimary ? ' primary' : ''}" href="#${cfg.homeHash}/${m.path.join('/')}">
        ${isPrimary ? '<div class="wizard-result-badge">Best Match</div>' : ''}
        <div class="wizard-result-name">${esc(cfg.itemName(item))}</div>
        <div class="wizard-result-hint">${esc(cfg.itemHint(item))}</div>
        <div class="wizard-result-why">${esc(m.bestResult.why)}</div>
      </a>`;
  };

  container.innerHTML = `
    <div class="wizard-results">
      ${cardFor(top, true)}
      ${runnersUp.length ? `<div class="wizard-also-label">Other possibilities</div>` : ''}
      ${runnersUp.map(m => cardFor(m, false)).join('')}
    </div>`;
}

// Wires up the smart-start box's button/Enter-key handling. Only
// called right after the box's own markup has been injected into the
// DOM (see renderWizardGeneric below), so the elements always exist.
function initWizardSmartStart(cfg) {
  const input = document.getElementById('wizard-smart-input');
  const btn = document.getElementById('wizard-smart-submit');
  const clearBtn = document.getElementById('wizard-smart-clear');
  const resultsEl = document.getElementById('wizard-smart-results');
  if (!input || !btn) return;

  const run = () => {
    const matches = matchWizardDescription(cfg.tree, input.value, cfg.resolveItem, cfg.scoreItem, cfg.smartStartExtraStopwords);
    renderWizardSmartResults(matches, cfg);
  };
  btn.addEventListener('click', run);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); run(); } });

  // Clear (×) button — same pattern as the sidebar's #search-clear:
  // hidden until there's text to clear, then one click empties the
  // box, wipes whatever results were showing (so the box is ready for
  // a fresh description rather than looking stuck on the old answer),
  // and refocuses so typing the next query needs no extra click.
  if (clearBtn) {
    input.addEventListener('input', () => { clearBtn.hidden = input.value === ''; });
    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.hidden = true;
      if (resultsEl) resultsEl.innerHTML = '';
      input.focus();
    });
  }
}

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
//   scoreItem   — (optional) (item, filter, filterWords) => number,
//                 enabling the free-text "smart start" box on the
//                 tree's start screen (currently only passed for the
//                 calculator finder — see renderWizard below)
function renderWizardGeneric(path, cfg) {
  const { tree, homeHash, eyebrow, resolveItem, itemHref, itemName, itemHint } = cfg;
  const currentId = path.length ? path[path.length - 1] : 'start';
  const node = tree[currentId];

  if (!node) {
    view().innerHTML = `<p class="calc-desc">That wizard step doesn't exist. <a href="#${homeHash}">Start over</a>.</p>`;
    return;
  }

  // Breadcrumb: for each step, look up the option label that was
  // chosen to get there (the label lives on the PREVIOUS node), and
  // link it back to the point right before that step was answered —
  // clicking a crumb re-asks just that one question instead of
  // forcing "Start over" from scratch.
  const crumbs = [];
  let prevId = 'start';
  path.forEach((id, i) => {
    const prevNode = tree[prevId];
    const opt = prevNode && prevNode.options && prevNode.options.find(o => o.next === id);
    if (opt) {
      const hrefPath = path.slice(0, i);
      crumbs.push({ label: opt.label, href: `#${homeHash}${hrefPath.length ? '/' + hrefPath.join('/') : ''}` });
    }
    prevId = id;
  });

  const breadcrumbHtml = crumbs.length ? `
    <div class="wizard-breadcrumb">
      <a href="#${homeHash}">Start over</a>
      ${crumbs.map(c => `<span class="wizard-crumb-sep">›</span><a href="${c.href}">${esc(c.label)}</a>`).join('')}
    </div>` : '';

  const backHref = path.length > 1 ? `#${homeHash}/${path.slice(0, -1).join('/')}` : `#${homeHash}`;
  const backHtml = path.length ? `<a class="wizard-back" href="${backHref}">← Back</a>` : '';

  // Free-text shortcut, shown only on the tree's very first screen and
  // only when the caller opted in (cfg.scoreItem) — see renderWizard
  // below. Scans the same calculators/guides the questions do, via
  // matchWizardDescription(), so it's a shortcut into the same
  // destinations rather than a separate, unaudited path.
  const smartStartHtml = (cfg.scoreItem && currentId === 'start') ? `
    <div class="wizard-smart-start">
      <label class="wizard-smart-start-label" for="wizard-smart-input">Or, describe your study in your own words</label>
      <div class="wizard-smart-start-row">
        <div class="wizard-smart-input-wrap">
          <input type="text" id="wizard-smart-input" class="input-el wizard-smart-input" autocomplete="off"
                 placeholder="${escAttr(cfg.smartStartPlaceholder)}">
          <button type="button" id="wizard-smart-clear" class="wizard-smart-clear" aria-label="Clear text" hidden>&times;</button>
        </div>
        <button type="button" id="wizard-smart-submit" class="wizard-smart-submit-btn">${esc(cfg.smartStartButtonLabel)}</button>
      </div>
      <div class="wizard-smart-hint">This just matches your words to the same recommendations below — it can guess wrong. Read the explanation under each recommended ${esc(cfg.smartStartResultLabel || 'calculator')} before trusting it.</div>
      <div id="wizard-smart-results"></div>
    </div>
    <div class="wizard-or-divider">or answer step by step</div>` : '';

  if (node.question) {
    const optionsHtml = node.options.map(opt => `
      <a class="wizard-option" href="#${homeHash}/${[...path, opt.next].join('/')}">
        <span>${esc(opt.label)}</span>
        <span class="wizard-option-arrow">→</span>
      </a>`).join('');

    view().innerHTML = `
      <div class="calc-eyebrow">${esc(eyebrow)}</div>
      ${breadcrumbHtml}
      ${smartStartHtml}
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

  if (cfg.scoreItem && currentId === 'start') initWizardSmartStart(cfg);

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
    scoreItem: searchScore,
    smartStartPlaceholder: 'e.g., comparing an oral health score between two treatment groups, adjusting for a baseline measurement',
    smartStartButtonLabel: 'Find my calculator',
    smartStartResultLabel: 'calculator',
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

// Same idea as searchScore()/searchScoreGuide(), but dispatching per
// item on the fly — needed because the design wizard's smart-start
// box (unlike the calculator finder's) scores a mix of calculators
// and guides in the same pass, and each collection's weighted fields
// only make sense against its own shape (calc.hint/description vs.
// guide.blurb/dek). Relies on the _kind tag renderDesignWizard's own
// resolveItem attaches below.
function scoreDesignWizardItem(item, filter, filterWords) {
  return item._kind === 'calc' ? searchScore(item, filter, filterWords) : searchScoreGuide(item, filter, filterWords);
}

// The study-design wizard's leaves mix both calculators and Learn
// guides in the same results list (typically the design's own
// "Appraising X Studies" guide as the primary result, plus a
// companion calculator or two for once data exists), unlike the
// other two trees which are each single-collection. resolveItem
// checks CALCULATORS first, then GUIDES, tagging whichever it found
// with _kind so itemHref/itemName/itemHint (and scoreDesignWizardItem
// above) can all dispatch correctly — renderWizardGeneric itself
// needed no changes for any of this.
function renderDesignWizard(path) {
  renderWizardGeneric(path, {
    tree: DESIGN_WIZARD_TREE,
    homeHash: 'designwizard',
    eyebrow: 'Study Design Finder',
    resolveItem: id => {
      const calc = CALCULATORS.find(c => c.id === id);
      if (calc) return { ...calc, _kind: 'calc' };
      const guide = GUIDES.find(g => g.id === id);
      if (guide) return { ...guide, _kind: 'guide' };
      return null;
    },
    itemHref: item => item._kind === 'calc' ? `#${item.id}` : `#learn/${item.id}`,
    itemName: item => item._kind === 'calc' ? item.name : item.title,
    itemHint: item => item._kind === 'calc' ? item.hint : item.blurb,
    scoreItem: scoreDesignWizardItem,
    smartStartPlaceholder: "e.g., I want to compare oral health outcomes after two different interventions, but haven't started the study yet",
    smartStartButtonLabel: 'Find my design',
    smartStartResultLabel: 'calculator or guide',
    // "test"/"tests" would otherwise match every calculator whose name
    // merely contains "test" (t-test, z-test, Egger's test, ...) for
    // any query mentioning a diagnostic test — see matchWizardDescription.
    smartStartExtraStopwords: new Set(['test', 'tests', 'testing']),
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
    // Now has its own dedicated hub at #designs (renderDesignsHub) —
    // listing it here too would show the same 11 guides twice on the
    // same site.
    if (g.category === 'Appraising Studies by Design') continue;
    (groups[g.category] = groups[g.category] || []).push(g);
  }

  const { total: calcTotal, categories: calcCategories, plainLabel: calcAvailLabel } = calculatorCountSummary();
  const { total: guideTotal, categories: guideCategories } = guideCountSummary();

  const catEntries = Object.entries(groups);

  const externalResourceCard = `
    <a class="home-card resource-card" href="https://www.dental.upenn.edu/research/center-for-integrative-global-oral-health/education/stats-with-crayons/" target="_blank" rel="noopener">
      <span class="resource-icon">🐾</span>
      <span class="resource-body">
        <span class="resource-title-row">
          <span class="resource-title">Stats with Crayons</span>
          <span class="resource-source">dental.upenn.edu ↗</span>
        </span>
        <span class="resource-desc">Short vignettes where a dog teaches a cat statistics — from Penn Dental Medicine's <em>Center for Integrative Global Oral Health</em>. Opens in a new tab.</span>
      </span>
    </a>`;

  const sections = catEntries.map(([cat, guides]) => {
    const isQuickRef = cat === 'Quick Reference';

    const cards = guides.map(g => `
      <a class="home-card" href="#learn/${g.id}">
        <div class="home-card-name">${esc(g.title)}</div>
        <div class="home-card-desc">${esc(g.blurb)}</div>
      </a>`).join('') + (isQuickRef ? externalResourceCard : '');

    const itemCount = guides.length + (isQuickRef ? 1 : 0);
    const isOpen = expandedLearnCategories.has(cat);

    return `
      <div class="home-section${isOpen ? '' : ' collapsed'}" data-cat="${esc(cat)}">
        <h2 class="home-section-heading">
          <button type="button" class="home-section-header${isOpen ? ' open' : ''}" aria-expanded="${isOpen}">
            <span class="home-section-chevron">▸</span>
            <span class="home-section-title">${esc(cat)}</span>
            <span class="home-section-count">${itemCount} guide${itemCount === 1 ? '' : 's'}</span>
          </button>
        </h2>
        <div class="home-cards">${cards}</div>
      </div>`;
  }).join('');

  view().innerHTML = `
    ${hubToggleHtml('learn')}
    <div class="home-eyebrow">Critical Appraisal &amp; Reference</div>
    <h1 class="home-title">Learn</h1>
    <p class="home-desc">
      ${guideTotal} guides across ${guideCategories} categories — reference for using this site well:
      how to recognize the kind of data you're working with, how to read the charts these calculators
      produce, and how to critically appraise the studies you're applying them to. Looking for a
      specific calculator instead? See the Calculator Index.
    </p>
    <a class="wizard-banner" href="#learnwizard">
      <span class="wizard-banner-icon">?</span>
      <span class="wizard-banner-text">Not sure where to start? Answer a few quick questions to find the right guide.</span>
      <span class="wizard-banner-arrow">→</span>
    </a>
    <a class="wizard-banner alt-banner" href="#calculators">
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

  scrollToPendingCategoryOrTop();
}

// The 16 design leaves of DESIGN_WIZARD_TREE, grouped for the hub's
// collapsible category sections — grouping mirrors how these designs
// are actually taught: experimental vs. observational (split further
// into comparative, which tests an exposure-outcome association, vs.
// descriptive, which doesn't) vs. diagnostic/prognostic vs. evidence
// synthesis and planning. Each card reuses its leaf's own primary
// guide + "why" text rather than separately written copy, so this
// page and the wizard's own reasoning can never drift apart.
const DESIGN_GLANCE_CATEGORIES = [
  { category: 'Experimental Trials', keys: ['rctResult', 'clusterRctResult', 'crossoverResult', 'nonInferiorityResult'] },
  { category: 'Observational — Comparative', keys: ['cohortResult', 'caseControlResult'] },
  { category: 'Observational — Descriptive', keys: ['caseSeriesResult', 'prevalenceResult', 'ecologicalResult'] },
  { category: 'Diagnostic & Prognostic', keys: ['diagAccuracyResult', 'aiStudyResult', 'prognosisResult'] },
  { category: 'Evidence Synthesis & Planning', keys: ['systematicReviewResult', 'scopingReviewResult', 'realistReviewResult', 'guidelineResult', 'pilotResult'] },
];

// Tracks which Designs hub categories the user has explicitly opened
// — same pattern as expandedHomeCategories/expandedLearnCategories,
// defaults CLOSED.
const expandedDesignCategories = new Set();

// Dedicated landing page for "planning research, not analyzing it
// yet" — the counterpart to the Calculator home page and Learn hub
// that DESIGN_WIZARD_TREE's own leaves never had until now (they only
// had the wizard, reachable by no other path). Same
// banner-into-its-own-wizard pattern as the other two hubs, and now
// the same collapsible-category accordion too (single-column, like
// Learn's own — several of these category names are too long for a
// half-width column).
function renderDesignsHub() {
  const sections = DESIGN_GLANCE_CATEGORIES.map(({ category, keys }) => {
    const cards = keys.map(key => {
      const leaf = DESIGN_WIZARD_TREE[key];
      const primary = leaf.results[0];
      const guide = GUIDES.find(g => g.id === primary.id);
      if (!guide) return '';
      return `
        <a class="design-card" href="#learn/${guide.id}">
          <div class="design-card-name">${esc(guide.title.replace(/^Appraising /, ''))}</div>
          <div class="design-card-use">${esc(primary.why)}</div>
        </a>`;
    }).join('');

    const isOpen = expandedDesignCategories.has(category);

    return `
      <div class="home-section${isOpen ? '' : ' collapsed'}" data-cat="${esc(category)}">
        <h2 class="home-section-heading">
          <button type="button" class="home-section-header${isOpen ? ' open' : ''}" aria-expanded="${isOpen}">
            <span class="home-section-chevron">▸</span>
            <span class="home-section-title">${esc(category)}</span>
            <span class="home-section-count">${keys.length} design${keys.length === 1 ? '' : 's'}</span>
          </button>
        </h2>
        <div class="design-grid">${cards}</div>
      </div>`;
  }).join('');

  view().innerHTML = `
    ${hubToggleHtml('designs')}
    <div class="home-eyebrow">Research Design Reference</div>
    <h1 class="home-title">Study Designs</h1>
    <p class="home-desc">Planning a study rather than analyzing one you already have? Start here — a quick reference for matching your research question to the design built for it, before you get to the calculator stage. Each design links to its own in-depth critical-appraisal guide. Looking for a specific calculator or guide instead? See Calculators or Learn.</p>
    <a class="wizard-banner" href="#designwizard">
      <span class="wizard-banner-icon">?</span>
      <span class="wizard-banner-text">Not sure where to start? Answer a few quick questions to find the right design.</span>
      <span class="wizard-banner-arrow">→</span>
    </a>
    <a class="wizard-banner alt-banner" href="#learn">
      <span class="wizard-banner-icon">L</span>
      <span class="wizard-banner-text">Each design below links to its own in-depth critical-appraisal guide, under Learn.</span>
      <span class="wizard-banner-arrow">→</span>
    </a>
    ${sections}
  `;

  document.querySelectorAll('.home-section-header').forEach(header => {
    header.addEventListener('click', () => {
      const section = header.closest('.home-section');
      const cat = section.dataset.cat;
      const nowOpen = !header.classList.contains('open');
      nowOpen ? expandedDesignCategories.add(cat) : expandedDesignCategories.delete(cat);
      header.classList.toggle('open', nowOpen);
      header.setAttribute('aria-expanded', String(nowOpen));
      section.classList.toggle('collapsed', !nowOpen);
    });
  });

  scrollToPendingCategoryOrTop();
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

  const crumb = guideCategoryCrumb(guide);
  const crumbMiddleHtml = crumb.href
    ? `<a href="${crumb.href}" data-expand-cat="${esc(crumb.expandCat)}" data-expand-target="${crumb.expandTarget}">${esc(crumb.label)}</a>`
    : `<span>${esc(crumb.label)}</span>`;

  view().innerHTML = `
    <div class="page-breadcrumb">
      <a href="#learn">Learn</a>
      <span class="page-crumb-sep">›</span>
      ${crumbMiddleHtml}
      <span class="page-crumb-sep">›</span>
      <span class="page-crumb-current">${esc(guide.title)}</span>
    </div>
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
  // 'explorer' calculators (e.g. Power with Graph, Type I & Type II
  // Error Explorer) use a completely different page template — live-
  // updating header/chart/stats instead of the standard inputs-grid +
  // Calculate + results table — so they're handed off entirely rather
  // than threaded through the rest of this function.
  if (calc.inputLayout === 'explorer') {
    renderExplorerCalculator(calc);
    return;
  }

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
    : calc.inputLayout === 'columns' ? renderColumnInputs(calc)
    : renderGrid(calc);

  view().innerHTML = `
    <div class="page-breadcrumb">
      <a href="#calculators">Calculators</a>
      <span class="page-crumb-sep">›</span>
      <a href="#calculators" data-expand-cat="${esc(calc.category)}" data-expand-target="home">${esc(calc.category)}</a>
      <span class="page-crumb-sep">›</span>
      <span class="page-crumb-current">${esc(calc.name)}</span>
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

    <div class="calc-actions">
      <button class="calc-btn" id="calc-btn">Calculate</button>
      <button class="reset-btn" id="reset-btn" type="button">Reset</button>
    </div>
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

  // Blanks the inputs rather than restoring calc.inputs[]'s defaults —
  // navigating to this calculator again (route() re-renders from
  // scratch) is what brings the defaults back, not Reset.
  document.getElementById('reset-btn').addEventListener('click', () => {
    zeroInputs(calc);
    if (calc.inputLayout === '2x2') refreshTotals();
    run();
  });

  if (calc.inputLayout === '2x2') {
    attachTotalListeners();
  }

  attachSliderListeners(calc, run);
  attachShowIfListeners(calc);

  // Auto-run with the defaults already populated into the inputs above,
  // so users see example output immediately without clicking Calculate.
  run();
}

// Page template for calculators with inputLayout: 'explorer' (e.g.
// Power with Graph, Type I & Type II Error Explorer) — a live-
// updating hero visualization rather than the standard inputs-grid +
// Calculate button + results table. calc.calculate() returns a single
// { title, subtitle, chartSvg, legend, stats, footnote } object here
// instead of the usual row array (or the usual [err(...)] array on
// invalid input, handled the same way every other calculator does).
// Every control — sliders AND the tails <select> — re-runs
// immediately with no Calculate click, since watching the chart move
// *is* the point of this layout.
function renderExplorerCalculator(calc) {
  const initialValues = {};
  calc.inputs.forEach(inp => { initialValues[inp.id] = inp.default; });

  const controlsHtml = calc.inputs.map(inp => {
    if (inp.type === 'select') {
      const opts = inp.options.map(o =>
        `<option value="${esc(o.value)}"${o.value === inp.default ? ' selected' : ''}>${esc(o.label)}</option>`
      ).join('');
      return `
        <div class="explorer-control explorer-control-select">
          <label class="explorer-control-label" for="inp-${inp.id}">${esc(upperAscii(inp.label))}</label>
          <select class="input-el" id="inp-${inp.id}" data-id="${inp.id}">${opts}</select>
        </div>`;
    }
    // An action trigger (e.g. "re-flip" on the coin-flip simulator) —
    // clicking it just re-runs calculate() with the same slider values,
    // which is enough to show a fresh result whenever calculate() draws
    // its own randomness. fullRow opts it onto its own centered row
    // instead of squeezed into a shared row with sliders — useful when
    // a sibling slider needs the extra width (see `wide` below).
    if (inp.type === 'button') {
      return `
        <div class="explorer-control${inp.fullRow ? ' explorer-control-select' : ''}">
          <label class="explorer-control-label">&nbsp;</label>
          <button type="button" class="reflip-btn" id="inp-${inp.id}" data-id="${inp.id}">${esc(inp.label)}</button>
        </div>`;
    }
    const display = inp.format ? inp.format(inp.default) : String(inp.default);
    const note = inp.note ? `<p class="input-hint explorer-control-note">${esc(inp.note)}</p>` : '';
    return `
      <div class="explorer-control${inp.wide ? ' explorer-control-wide' : ''}">
        <label class="explorer-control-label" for="inp-${inp.id}">${esc(upperAscii(inp.label))}</label>
        <input class="input-slider explorer-slider" type="range" id="inp-${inp.id}" data-id="${inp.id}"
               min="${inp.min}" max="${inp.max}" step="${inp.step}" value="${inp.default}">
        <div class="explorer-control-valuewrap">
          <input class="explorer-control-num" type="number" id="num-${inp.id}" data-id="${inp.id}"
                 min="${inp.min}" max="${inp.max}" step="any" value="${inp.default}"
                 aria-label="${escAttr(inp.label)} — exact value">
          <span class="explorer-control-caption" id="val-${inp.id}">${esc(display)}</span>
        </div>
        ${note}
      </div>`;
  }).join('') + `
    <div class="explorer-control explorer-control-select">
      <label class="explorer-control-label">&nbsp;</label>
      <button type="button" class="reflip-btn" id="explorer-reset-btn">Reset</button>
    </div>`;

  const notation = NOTATION[calc.id] || [];
  const notationHtml = notation.map(n => `
    <div class="notation-row">
      <div class="notation-symbol">${tryKatex(n.symbol, false)}</div>
      <div class="notation-meaning">${esc(n.meaning)}</div>
    </div>
  `).join('');

  view().innerHTML = `
    <div class="page-breadcrumb">
      <a href="#calculators">Calculators</a>
      <span class="page-crumb-sep">›</span>
      <a href="#calculators" data-expand-cat="${esc(calc.category)}" data-expand-target="home">${esc(calc.category)}</a>
      <span class="page-crumb-sep">›</span>
      <span class="page-crumb-current">${esc(calc.name)}</span>
    </div>

    <div class="explorer-header">
      <h1 class="explorer-title" id="explorer-title">${esc(calc.name)}</h1>
      <p class="explorer-subtitle" id="explorer-subtitle"></p>
    </div>

    ${calc.example ? `
    <details class="example-block">
      <summary class="example-summary">Medical Example — when &amp; how to use this</summary>
      <p class="example-body" id="example-body"></p>
    </details>` : ''}

    <div class="explorer-controls">${controlsHtml}</div>

    <div class="explorer-chart-card">
      <div class="result-viz">
        ${calc.chartIsSVG === false ? '' : `
        <div class="viz-toolbar">
          <button type="button" class="export-chart-btn" data-format="png" data-filename="${esc(calc.id)}-chart" title="Download this chart as a PNG image">PNG ⬇</button>
          <button type="button" class="export-chart-btn" data-format="jpg" data-filename="${esc(calc.id)}-chart" title="Download this chart as a JPG image">JPG ⬇</button>
        </div>`}
        <div id="explorer-chart"></div>
      </div>
      <div class="explorer-legend" id="explorer-legend" hidden></div>
      <div class="explorer-stats" id="explorer-stats"></div>
      <p class="explorer-footnote" id="explorer-footnote"></p>
    </div>

    <div class="formula-block">
      <div class="block-label">Formula</div>
      <div class="formula-list">${calc.formulas.map(f => `
        <div>
          <div class="formula-row-label">${esc(f.label)}</div>
          <div class="formula-katex">${tryKatex(f.latex, true)}</div>
        </div>`).join('')}</div>
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
    const result = calc.calculate(values);

    if (Array.isArray(result)) {
      // Same [err(...)] shape every other calculator returns on invalid input.
      document.getElementById('explorer-title').textContent = calc.name;
      document.getElementById('explorer-subtitle').textContent = '';
      document.getElementById('explorer-chart').innerHTML = '';
      document.getElementById('explorer-legend').hidden = true;
      document.getElementById('explorer-legend').innerHTML = '';
      document.getElementById('explorer-footnote').textContent = '';
      document.getElementById('explorer-stats').innerHTML =
        `<div class="explorer-stat explorer-stat-error">${esc(result[0].value)}</div>`;
      return;
    }

    document.getElementById('explorer-title').textContent = result.title;
    document.getElementById('explorer-subtitle').textContent = result.subtitle;
    document.getElementById('explorer-chart').innerHTML = result.chartSvg;
    const legendEl = document.getElementById('explorer-legend');
    const legend = result.legend || [];
    legendEl.hidden = legend.length === 0;
    legendEl.innerHTML = legend.map(item => `
      <span class="explorer-legend-item">
        <span class="explorer-legend-swatch" style="background:${item.color}"></span>
        ${esc(item.label)}
      </span>`).join('');
    document.getElementById('explorer-stats').innerHTML = result.stats.map(s => `
      <div class="explorer-stat">
        <div class="explorer-stat-label">${esc(upperAscii(s.label))}</div>
        <div class="explorer-stat-value">${esc(String(s.value))}</div>
      </div>`).join('');
    document.getElementById('explorer-footnote').textContent = result.footnote;

    updateExample(calc, values);
  }

  calc.inputs.forEach(inp => {
    const el = document.getElementById('inp-' + inp.id);
    if (!el) return;

    // Sliders get a paired exact-value number field (see controlsHtml
    // above). The range element's own `value` is NOT a safe source of
    // truth for this: per spec, a range input's value sanitization
    // algorithm snaps to the nearest multiple of `step` even when set
    // programmatically (not just when dragged), so writing e.g. 0.0224
    // into a slider with step 0.05 silently collapses it to 0. The
    // exact typed/dragged number is instead kept in `el.dataset.exact`,
    // which readInputs() reads in preference to el.value; el.value
    // itself is still set (and left to snap) purely to position the
    // visible thumb.
    if (inp.type === 'slider') {
      const numEl = document.getElementById('num-' + inp.id);
      const caption = document.getElementById('val-' + inp.id);
      const decimals = inp.decimals != null ? inp.decimals : stepDecimalPlaces(inp.step);
      const clampToBounds = v => Math.min(inp.max, Math.max(inp.min, v));
      const setCaption = v => { if (caption) caption.textContent = inp.format ? inp.format(v) : String(v); };

      el.addEventListener('input', () => {
        const v = parseFloat(el.value);
        el.dataset.exact = v;
        if (numEl) numEl.value = v.toFixed(decimals);
        setCaption(v);
        run();
      });

      if (numEl) {
        numEl.addEventListener('input', () => {
          const v = parseFloat(numEl.value);
          if (isNaN(v)) return;
          const clamped = clampToBounds(v);
          el.value = clamped;
          el.dataset.exact = clamped;
          setCaption(v);
          run();
        });

        // Only touches the field when it's actually invalid or out of
        // range — an in-range value like 0.037 is left exactly as
        // typed, not rounded to the slider's own coarser step.
        const clampNumField = () => {
          let v = parseFloat(numEl.value);
          if (isNaN(v)) { v = parseFloat(el.value); }
          else if (v >= inp.min && v <= inp.max) return;
          else v = clampToBounds(v);
          numEl.value = v;
          el.value = v;
          el.dataset.exact = v;
          setCaption(v);
          run();
        };
        numEl.addEventListener('blur', clampNumField);
        numEl.addEventListener('keydown', e => { if (e.key === 'Enter') { clampNumField(); numEl.blur(); } });
      }
      return;
    }

    const evt = inp.type === 'select' ? 'change' : 'click';
    el.addEventListener(evt, run);
  });

  // Blanks the sliders rather than restoring calc.inputs[]'s defaults —
  // navigating to this calculator again (route() re-renders from
  // scratch) is what brings the defaults back, not Reset.
  document.getElementById('explorer-reset-btn').addEventListener('click', () => {
    zeroInputs(calc);
    run();
  });

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

// Renders the markup for a single input field — factored out of
// renderGrid so renderColumnInputs (below) can reuse the exact same
// per-type templates inside its own column wrappers instead of
// duplicating this switch.
function renderInputField(inp) {
  // Fields with a `showIf(values)` predicate start rendered (visibility
  // is corrected immediately by attachShowIfListeners, which runs right
  // after this HTML is inserted) but carry a `field-<id>` wrapper id so
  // that predicate can find and toggle them — e.g. a calculator with two
  // entry modes ("group summary data" vs. "published estimate") whose
  // mode select shows only the inputs the current mode actually uses.
  const fieldId = ` id="field-${inp.id}"`;
  if (inp.type === 'textarea') {
    return `
      <div class="input-field input-field-wide"${fieldId}>
        <label class="input-label" for="inp-${inp.id}">${esc(inp.label)}</label>
        <textarea class="input-el inputs-textarea" id="inp-${inp.id}"
                  data-id="${inp.id}" rows="3" spellcheck="false">${esc(String(inp.default))}</textarea>
      </div>`;
  }
  if (inp.type === 'slider') {
    const display = inp.format ? inp.format(inp.default) : String(inp.default);
    return `
      <div class="input-field input-field-wide"${fieldId}>
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
      <div class="input-field input-field-wide"${fieldId}>
        <label class="input-label" for="inp-${inp.id}">${esc(inp.label)}</label>
        <select class="input-el" id="inp-${inp.id}" data-id="${inp.id}">${opts}</select>
        ${hint}
      </div>`;
  }
  if (inp.type === 'checkbox') {
    const hint = inp.note ? `<p class="input-hint">${esc(inp.note)}</p>` : '';
    return `
      <div class="input-field input-field-wide"${fieldId}>
        <label class="input-checkbox-label">
          <input class="input-checkbox" type="checkbox" id="inp-${inp.id}" data-id="${inp.id}"${inp.default ? ' checked' : ''}>
          ${esc(inp.label)}
        </label>
        ${hint}
      </div>`;
  }
  if (inp.type === 'text') {
    return `
      <div class="input-field"${fieldId}>
        <label class="input-label" for="inp-${inp.id}">${esc(inp.label)}</label>
        <input class="input-el" type="text" id="inp-${inp.id}" data-id="${inp.id}"
               value="${esc(String(inp.default))}"${inp.placeholder ? ` placeholder="${esc(inp.placeholder)}"` : ''} autocomplete="off" spellcheck="false">
      </div>`;
  }
  return `
    <div class="input-field"${fieldId}>
      <label class="input-label" for="inp-${inp.id}">${esc(inp.label)}</label>
      <input class="input-el" type="number" id="inp-${inp.id}"
             data-id="${inp.id}" value="${inp.default}" step="any">
    </div>`;
}

function renderGrid(calc) {
  return `<div class="inputs-grid">` + calc.inputs.map(renderInputField).join('') + `</div>`;
}

// Renders inputs split into labeled side-by-side columns (e.g. "Sample"
// vs. "Population / Null Hypothesis" for a one-sample z/t-test) instead
// of one flat field-by-field grid — driven by `calc.inputColumns`
// ([{ label, ids }]), so it's clear at a glance which values come from
// the data in hand and which describe the fixed hypothesis being tested
// against. Any input not listed in any column (e.g. a shared alpha or
// tails selector that belongs to neither) renders below as a plain grid,
// same as the `beforeInputs`/`afterInputs` split in renderGroupedInputs.
function renderColumnInputs(calc) {
  const usedIds = new Set(calc.inputColumns.flatMap(col => col.ids));
  const columnsHtml = calc.inputColumns.map(col => {
    const fields = calc.inputs.filter(inp => col.ids.includes(inp.id));
    return `
      <div class="input-column">
        <div class="input-column-header">${esc(col.label)}</div>
        <div class="inputs-grid input-column-grid">${fields.map(renderInputField).join('')}</div>
      </div>`;
  }).join('');

  // Any input not listed in a column (e.g. a shared alpha/tails selector,
  // or a mode toggle that decides which field shows *inside* a column —
  // e.g. "known population SD" vs. "sample SD only") renders as a plain
  // grid. `renderBeforeGroup` puts it above the columns instead of below,
  // same convention as renderGroupedInputs, since a mode toggle needs to
  // be seen before the fields it switches, not after.
  const remaining      = calc.inputs.filter(inp => !usedIds.has(inp.id));
  const beforeInputs    = remaining.filter(inp => inp.renderBeforeGroup);
  const afterInputs     = remaining.filter(inp => !inp.renderBeforeGroup);
  const beforeHtml = beforeInputs.length ? renderGrid({ ...calc, inputs: beforeInputs }) : '';
  const afterHtml  = afterInputs.length  ? renderGrid({ ...calc, inputs: afterInputs })  : '';

  return beforeHtml + `<div class="input-columns">${columnsHtml}</div>` + afterHtml;
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
                 value="${esc(inp.default)}" ${isText ? '' : 'step="any"'} aria-label="${term} ${i} ${escAttr(f.label)}">
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

  const otherInputs  = calc.inputs.filter(inp => !groupedIds.has(inp.id));
  const beforeInputs = otherInputs.filter(inp => inp.renderBeforeGroup);
  const afterInputs  = otherInputs.filter(inp => !inp.renderBeforeGroup);
  const beforeHtml = beforeInputs.length ? renderGrid({ ...calc, inputs: beforeInputs }) : '';
  const afterHtml  = afterInputs.length  ? renderGrid({ ...calc, inputs: afterInputs })  : '';

  // calc.groupShowIf lets a calculator hide the whole group table (e.g.
  // when a mode toggle elsewhere switches to a non-group data-entry
  // path) — attachShowIfListeners toggles this wrapper the same way it
  // toggles any single field's `field-<id>` wrapper.
  const groupTableWrapped = typeof calc.groupShowIf === 'function'
    ? `<div id="field-group-table">${groupTableHtml}</div>`
    : groupTableHtml;

  return beforeHtml + groupTableWrapped + afterHtml;
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

// Shows/hides inputs whose definition carries a `showIf(values)` predicate
// — e.g. a calculator with two entry modes, where the mode select should
// reveal only the fields that mode actually uses. Re-evaluates every
// showIf on every input's change (not just the mode select's own), since
// a field can depend on more than one earlier answer (mode -> paired ->
// only-if-paired sdChange). Hidden fields stay in the DOM and still feed
// readInputs() — calculate() is expected to ignore whichever branch's
// fields aren't relevant to the current mode, the same way it always has
// to validate/branch on a mode value anyway.
function attachShowIfListeners(calc) {
  const hasGroupShowIf = typeof calc.groupShowIf === 'function';
  if (!calc.inputs.some(inp => typeof inp.showIf === 'function') && !hasGroupShowIf) return;
  const refresh = () => {
    const values = readInputs(calc);
    calc.inputs.forEach(inp => {
      if (typeof inp.showIf !== 'function') return;
      const field = document.getElementById('field-' + inp.id);
      if (field) field.hidden = !inp.showIf(values);
    });
    if (hasGroupShowIf) {
      const groupField = document.getElementById('field-group-table');
      if (groupField) groupField.hidden = !calc.groupShowIf(values);
    }
  };
  calc.inputs.forEach(inp => {
    const el = document.getElementById('inp-' + inp.id);
    if (el) el.addEventListener('change', refresh);
  });
  refresh();
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

// Clears every input to blank ('' for numbers/text/textarea — so the
// user isn't stuck deleting a placeholder "0" before typing a real
// value) rather than restoring calc.inputs[]'s defaults — that's what
// the Reset button does; the defaults only come back when the
// calculator is next visited fresh (route() always re-renders from
// calc.inputs[].default, so no extra work is needed there). Sliders
// have no natural blank state and snap to 0 (or their min); a select
// has no natural "zero" and is left alone.
function zeroInputs(calc) {
  calc.inputs.forEach(inp => {
    if (inp.type === 'button' || inp.type === 'select') return;
    const el = document.getElementById('inp-' + inp.id);
    if (!el) return;
    if (inp.type === 'checkbox') {
      el.checked = false;
    } else if (inp.type === 'slider') {
      el.value = (inp.min <= 0 && inp.max >= 0) ? 0 : inp.min;
      el.dataset.exact = el.value;
      const numEl = document.getElementById('num-' + inp.id);
      if (numEl) numEl.value = (+el.value).toFixed(stepDecimalPlaces(inp.step));
      const label = document.getElementById('val-' + inp.id);
      if (label) label.textContent = inp.format ? inp.format(parseFloat(el.value)) : el.value;
    } else {
      el.value = '';
    }
  });
}

/* ── READ INPUTS ────────────────────────────────────────── */

function readInputs(calc) {
  const vals = {};
  for (const inp of calc.inputs) {
    if (inp.type === 'button') continue; // an action trigger, not a value — e.g. explorer "re-flip" buttons
    const el = document.getElementById('inp-' + inp.id);
    if (!el) { vals[inp.id] = inp.default; continue; }
    vals[inp.id] = (inp.type === 'textarea' || inp.type === 'select' || inp.type === 'text') ? el.value
      : inp.type === 'checkbox' ? el.checked
      // Range inputs snap their own `value` to the nearest multiple of
      // `step` even when set from script, so a slider paired with an
      // exact-value number field (see renderExplorerCalculator) stashes
      // the un-snapped number in data-exact — prefer that when present.
      : inp.type === 'slider' && el.dataset.exact !== undefined ? parseFloat(el.dataset.exact)
      : parseFloat(el.value);
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

  // Difference domain (linear) — include null=0. Grouped by r.domainKey so
  // rows in incommensurable units (e.g. a raw Mean Difference vs. a
  // standardized Hedges' g from the same calculator) don't get forced onto
  // one shared scale, which would squash whichever row has the smaller
  // magnitude down to an unreadable sliver. Rows with no domainKey all
  // share the 'default' bucket, matching the old single-domain behavior.
  const diffRows = withCI.filter(r => !r.isRatio);
  const diffGroups = {};
  for (const r of diffRows) {
    const key = r.domainKey || 'default';
    (diffGroups[key] || (diffGroups[key] = [])).push(r);
  }
  const diffDomains = {};
  for (const key in diffGroups) {
    const vals = diffGroups[key].flatMap(r => [r.value, r.ci[0], r.ci[1], 0]);
    const mn   = Math.min(...vals);
    const mx   = Math.max(...vals);
    const span = mx - mn;
    const pad  = Math.max(span * 0.4, 0.05);
    diffDomains[key] = [mn - pad, mx + pad];
  }

  return { ratioDomain, diffDomains };
}

function showResults(results, calcId) {
  const wrap  = document.getElementById('results-wrap');
  if (!wrap) return;

  const hasCI = results.some(r => r.ci && r.ci.length === 2);
  const cls   = hasCI ? 'has-ci' : 'no-ci';
  const { ratioDomain, diffDomains } = computeDomains(results);

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
    if (hasCI && !r.isText && !r.wideValue) {
      if (r.ci && r.ci.length === 2) {
        const [lo, hi] = r.ci;
        const pt     = typeof r.value === 'number' ? r.value : 0;
        const domain = r.isRatio ? ratioDomain : diffDomains[r.domainKey || 'default'];
        ciCell = `
          <div class="result-ci">
            ${forestSVG(pt, lo, hi, r.isRatio, domain, r.band)}
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
      r.wideValue ? 'wide-value' : '',
    ].filter(Boolean).join(' ');

    const labelText = r.isText ? upperAscii(r.label) : r.label;

    // isHtml opts a single row out of escaping so its value can contain
    // an internal link (e.g. "see the X calculator") — only for
    // isText rows, whose value is always calculator-authored template
    // text, never raw user input, matching the same trust level as
    // GUIDES html content elsewhere in the app.
    const valueHtml = (r.isText && r.isHtml) ? valStr : esc(valStr);

    return `
      <div class="${rowCls}">
        <div class="result-label">${esc(labelText)}</div>
        <div class="result-value ${r.isText ? 'is-text' : ''}">${valueHtml}</div>
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

function forestSVG(value, lo, hi, isRatio, domain, band) {
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

  // Optional shaded "trivial zone" band (e.g. +/-MID around the null),
  // drawn first so the CI whisker and point estimate sit on top of it —
  // same green (#23875B) used for the MID threshold line on multi-study
  // forest plots, and the same shaded-region idea as the equivalence/
  // non-inferiority zone plot, just folded into this single-study whisker.
  let bandSvg = '';
  if (band && isFinite(band[0]) && isFinite(band[1])) {
    const bLoX = clamp(toX(band[0]));
    const bHiX = clamp(toX(band[1]));
    bandSvg = `<rect x="${bLoX}" y="2" width="${Math.max(bHiX-bLoX,0)}" height="${H-4}" fill="#23875B" opacity=".12"/>`;
  }

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
               class="forest-svg" aria-hidden="true">
    ${bandSvg}
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
    .replace(/([A-Za-z])̄/g, '<span class="over-bar">$1</span>')
    // p̂, x̂, etc. (letter + combining circumflex, U+0302) have the same
    // problem — see .over-hat in style.css.
    .replace(/([A-Za-z])̂/g, '<span class="over-hat">$1</span>');
}

// Plain-text escape for use INSIDE an HTML attribute value (e.g.
// aria-label="..."). Unlike esc(), this never injects markup — esc()'s
// over-bar <span> substitution is only safe in element content; inside
// an attribute, the span's own quote characters would prematurely
// close the attribute and spill the rest of the tag out as visible text.
function escAttr(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Uppercases only plain a-z ASCII letters, leaving everything else —
// Greek letters (α, β, χ...), subscripts, symbols — untouched. Used
// instead of CSS text-transform:uppercase for is-text-row labels,
// since that transform turns lowercase Greek letters into their
// capital forms (e.g. α → Α), which render visually identical to
// ordinary Latin letters (Α looks like "A"), silently corrupting any
// stats notation in a label like "Interpretation (α = 0.05)".
// Uppercases English words but leaves standalone single-letter Latin
// math symbols (n, p, t, r, z...) alone — a blanket per-character
// uppercase would turn "Sample Size (n)" into "SAMPLE SIZE (N)",
// wrongly implying population size (N) instead of sample size (n),
// the opposite of this site's own n/N convention. Matching runs of
// 2+ lowercase letters (i.e. actual words) rather than every single
// lowercase letter leaves isolated one-letter symbols untouched.
function upperAscii(s) {
  return String(s).replace(/[a-z]{2,}/g, word => word.toUpperCase());
}

// How many decimal places an explorer slider's own `step` carries
// (e.g. 0.01 -> 2, 50 -> 0) — used only to tidy up the paired exact-
// value number field after a *drag* (float step arithmetic can land
// on 0.30000000000000004); a value the user *typed* into that field
// is never rounded through this, so it can still be more precise
// than the slider's own step.
function stepDecimalPlaces(step) {
  const s = String(step);
  const i = s.indexOf('.');
  return i === -1 ? 0 : s.length - i - 1;
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
    // Belt-and-suspenders: paint white BEHIND whatever was just drawn,
    // catching any transparency in the rasterized image itself (not
    // just the canvas underneath it) — normal source-over compositing
    // already shouldn't need this, but this costs nothing and removes
    // any doubt if a browser's SVG-to-canvas rasterization ever leaves
    // stray transparent pixels.
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
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
