// Situations terrain : liste filtrable à gauche, fiche détaillée à droite.

import { situations, PHASES } from '../content/situations.js';
import { snippetById } from '../content/snippets.js';
import { kpis, capabilityDomain, framework } from '../content/reference.js';
import { state, rerender } from '../state.js';
import { t, pick } from '../i18n.js';
import { $, esc, rich, pageHead, capabilityLink, plural } from '../ui.js';

const filters = { phase: 'all', domain: 'all', query: '' };

const kpiById = Object.fromEntries(kpis.map((k) => [k.id, k]));

const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function matches(situation) {
  if (filters.phase !== 'all' && situation.phase !== filters.phase) return false;
  if (filters.domain !== 'all' && !situation.capabilities.some((c) => capabilityDomain[c] === filters.domain)) return false;
  if (!filters.query) return true;
  const haystack = normalize([pick(situation.title), pick(situation.context), ...situation.signals.map(pick), ...situation.capabilities, pick(situation.pitfall)].join(' '));
  return normalize(filters.query).split(/\s+/).every((word) => haystack.includes(word));
}

function detail(s) {
  return `
    <article class="situation" aria-labelledby="situation-title">
      <p class="situation-phase">${t('situations.phase', { phase: s.phase })}</p>
      <h2 id="situation-title">${esc(pick(s.title))}</h2>
      <p class="situation-context">${rich(pick(s.context))}</p>

      <dl class="facts facts-inline">
        <div><dt>${t('situations.capabilities')}</dt><dd>${s.capabilities.map(capabilityLink).join(', ')}</dd></div>
        <div><dt>${t('situations.personas')}</dt><dd>${s.personas.map(esc).join(', ')}</dd></div>
      </dl>

      <h3>${t('situations.signals')}</h3>
      <ul class="checklist">${s.signals.map((x) => `<li>${rich(pick(x))}</li>`).join('')}</ul>

      <h3>${t('situations.queries')}</h3>
      <ul class="query-list">
        ${s.snippets.map((id) => snippetById[id]).map((q) => `
          <li>
            <a class="query-link" href="#lab/${q.id}" data-nav="lab/${q.id}" data-run="true">
              <strong>${esc(pick(q.title))}</strong>
              <span>${esc(pick(q.question))}</span>
            </a>
          </li>`).join('')}
      </ul>

      <h3>${t('situations.actions')}</h3>
      <ol class="action-list">${s.actions.map((x) => `<li>${rich(pick(x))}</li>`).join('')}</ol>

      <h3>${t('situations.kpis')}</h3>
      <ul class="kpi-list">
        ${s.kpis.map((id) => kpiById[id]).map((k) => `<li><a class="link" href="#reference/kpis" data-nav="reference/kpis">${esc(pick(k.name))}</a> : ${esc(pick(k.formula))}</li>`).join('')}
      </ul>

      <div class="pitfall">
        <h3>${t('situations.pitfall')}</h3>
        <p>${rich(pick(s.pitfall))}</p>
      </div>

      ${s.demo ? `<p class="situation-demo">${t('situations.demoCase', { link: `<a class="link" href="#demo/${s.demo}" data-nav="demo/${s.demo}">${t(`situations.demo.${s.demo}`)}</a>` })}</p>` : ''}
    </article>`;
}

export function renderSituations() {
  const list = situations.filter(matches);
  const current = situations.find((s) => s.id === state.detail) || list[0] || situations[0];

  return pageHead(
    t('situations.title'),
    t('situations.intro'),
  ) + `
    <div class="filter-bar">
      <label class="field field-grow">
        <span class="field-label">${t('situations.search')}</span>
        <input id="situation-search" type="search" value="${esc(filters.query)}" placeholder="${esc(t('situations.searchPlaceholder'))}" autocomplete="off">
      </label>
      <label class="field">
        <span class="field-label">${t('situations.phaseFilter')}</span>
        <select id="situation-phase">
          <option value="all">${t('situations.allPhases')}</option>
          ${PHASES.map((p) => `<option value="${p}" ${filters.phase === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </label>
      <label class="field">
        <span class="field-label">${t('situations.domain')}</span>
        <select id="situation-domain">
          <option value="all">${t('situations.allDomains')}</option>
          ${framework.domains.map((d) => `<option value="${esc(d.name)}" ${filters.domain === d.name ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}
        </select>
      </label>
    </div>

    <div class="master-detail">
      <label class="field compact-picker">
        <span class="field-label">${t('situations.situation')}</span>
        <select id="situation-picker">
          ${list.map((s) => `<option value="${s.id}" ${s.id === current.id ? 'selected' : ''}>${esc(pick(s.title))}</option>`).join('')}
        </select>
      </label>
      <nav class="master" aria-label="${t('situations.navLabel')}">
        <p class="master-count" aria-live="polite">${plural(list.length, t('situations.countOne'), t('situations.countMany'))}</p>
        ${list.length ? `<ul class="master-list">
          ${list.map((s) => `
            <li>
              <a class="master-item" href="#situations/${s.id}" data-nav="situations/${s.id}" ${s.id === current.id ? 'aria-current="true"' : ''}>
                <strong>${esc(pick(s.title))}</strong>
                <span>${s.phase}, ${s.capabilities.join(', ')}</span>
              </a>
            </li>`).join('')}
        </ul>` : `<p class="empty">${t('situations.empty')}</p>`}
      </nav>
      ${detail(current)}
    </div>`;
}

export function bindSituations() {
  const search = $('#situation-search');
  search?.addEventListener('input', () => {
    filters.query = search.value;
    rerender();
  });
  $('#situation-phase')?.addEventListener('change', (e) => { filters.phase = e.target.value; rerender(); });
  $('#situation-picker')?.addEventListener('change', (e) => { location.hash = `situations/${e.target.value}`; });
  $('#situation-domain')?.addEventListener('change', (e) => { filters.domain = e.target.value; rerender(); });
}
