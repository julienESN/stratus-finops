// Point d'entrée : navigation par ancre (#section/détail), en-tête et délégation des clics.

import { state, restore, setRenderer } from './state.js';
import { $, logo } from './ui.js';
import { DEMO_VIEWS, renderDemo, bindDemo, handleDemoClick, showRecommendation } from './views/demo.js';
import { renderSituations, bindSituations } from './views/situations.js';
import { renderLab, bindLab, handleLabClick, requestRun } from './views/lab.js';
import { renderReference, bindReference, handleReferenceClick } from './views/reference.js';

const SECTIONS = {
  demo: { label: 'Démonstration', render: renderDemo, bind: bindDemo },
  situations: { label: 'Situations', render: renderSituations, bind: bindSituations },
  lab: { label: 'Labo SQL', render: renderLab, bind: bindLab },
  reference: { label: 'Référentiel', render: renderReference, bind: bindReference },
};

// Anciennes ancres de la première version (#overview, #allocation…).
const LEGACY = Object.fromEntries(DEMO_VIEWS.map(([id]) => [id, `demo/${id}`]));

function parseRoute(hash) {
  const raw = decodeURIComponent(hash.replace(/^#/, ''));
  const [section, detail = null] = (LEGACY[raw] || raw).split('/');
  if (!SECTIONS[section]) return null;
  if (section === 'demo') return { section, view: DEMO_VIEWS.some(([id]) => id === detail) ? detail : 'overview', detail: null };
  return { section, view: state.view, detail };
}

const routeOf = () => (state.section === 'demo' ? `demo/${state.view}` : `${state.section}${state.detail ? `/${state.detail}` : ''}`);

function renderShell() {
  $('#app').innerHTML = `
    <header class="topbar">
      <div class="topbar-inner">
        <a class="wordmark" href="#demo/overview" data-nav="demo/overview">${logo()}Stratus</a>
        <nav class="tabs" aria-label="Sections">
          ${Object.entries(SECTIONS).map(([id, s]) => `<a class="tab" href="#${id === 'demo' ? 'demo/overview' : id}" data-nav="${id === 'demo' ? `demo/${state.view}` : id}" ${state.section === id ? 'aria-current="page"' : ''}>${s.label}</a>`).join('')}
        </nav>
        <p class="demo-flag">FOCUS 1.2, données synthétiques</p>
      </div>
    </header>
    <main id="main" tabindex="-1"></main>
    <footer class="site-foot">
      <p>Stratus, boîte à outils FinOps conçue par Julien Esnault.</p>
      <p>Aucun compte cloud connecté. Les décisions et favoris restent dans ce navigateur.</p>
    </footer>`;
  renderView();
}

function renderView() {
  const active = document.activeElement;
  const focusedId = active?.id;
  const caret = active && 'selectionStart' in active && ['search', 'text'].includes(active.type) ? active.selectionStart : null;
  const section = SECTIONS[state.section];
  $('#main').innerHTML = section.render();
  section.bind();
  if (focusedId && focusedId !== 'main') {
    const el = document.getElementById(focusedId);
    if (el) {
      el.focus({ preventScroll: true });
      if (caret !== null) el.setSelectionRange(caret, caret);
    }
  }
}

setRenderer(renderView);

function navigate(route, { push = true } = {}) {
  const next = parseRoute(route);
  if (!next) return;
  const sectionChanged = next.section !== state.section;
  Object.assign(state, next);
  if (push && location.hash !== `#${routeOf()}`) history.pushState(null, '', `#${routeOf()}`);
  renderShell();
  // Changer d'élément dans une liste garde la position ; changer de section remonte en haut.
  if (sectionChanged || state.section === 'demo') {
    window.scrollTo({ top: 0 });
    $('#main').focus({ preventScroll: true });
  }
}

document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-nav], [data-guide], [data-project], [data-rec], [data-close], [data-action], [data-scenario], [data-lab], [data-dialect], [data-anatomy]');
  if (!target) return;
  const { nav, guide } = target.dataset;

  if ('close' in target.dataset) {
    $('#detail').close();
    return;
  }
  if (handleReferenceClick(target) || handleLabClick(target)) return;

  if (nav || guide) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault();
    if (target.dataset.run) requestRun();
    navigate(nav || 'demo/optimise');
    if (guide) showRecommendation(guide);
    return;
  }
  handleDemoClick(target);
});

$('#detail').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.close();
});

const onHistory = () => {
  if (location.hash !== `#${routeOf()}`) navigate(location.hash, { push: false });
};
window.addEventListener('popstate', onHistory);
window.addEventListener('hashchange', onHistory);

restore();
Object.assign(state, parseRoute(location.hash) || {});
renderShell();
