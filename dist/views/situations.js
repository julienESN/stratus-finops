// Situations terrain : liste filtrable à gauche, fiche détaillée à droite.

import { situations, PHASES } from '../content/situations.js';
import { snippetById } from '../content/snippets.js';
import { kpis, capabilityDomain, framework } from '../content/reference.js';
import { state, rerender } from '../state.js';
import { $, esc, rich, pageHead, capabilityLink } from '../ui.js';

const filters = { phase: 'all', domain: 'all', query: '' };

const kpiById = Object.fromEntries(kpis.map((k) => [k.id, k]));

const DEMO_LABELS = { overview: 'Vue d’ensemble', optimise: 'Optimisations', allocation: 'Allocation', simulate: 'Simulateur CUD' };

const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function matches(situation) {
  if (filters.phase !== 'all' && situation.phase !== filters.phase) return false;
  if (filters.domain !== 'all' && !situation.capabilities.some((c) => capabilityDomain[c] === filters.domain)) return false;
  if (!filters.query) return true;
  const haystack = normalize([situation.title, situation.context, ...situation.signals, ...situation.capabilities, situation.pitfall].join(' '));
  return normalize(filters.query).split(/\s+/).every((word) => haystack.includes(word));
}

function detail(s) {
  return `
    <article class="situation" aria-labelledby="situation-title">
      <p class="situation-phase">Phase ${s.phase}</p>
      <h2 id="situation-title">${esc(s.title)}</h2>
      <p class="situation-context">${rich(s.context)}</p>

      <dl class="facts facts-inline">
        <div><dt>Capacités</dt><dd>${s.capabilities.map(capabilityLink).join(', ')}</dd></div>
        <div><dt>Personas</dt><dd>${s.personas.map(esc).join(', ')}</dd></div>
      </dl>

      <h3>Signaux à repérer</h3>
      <ul class="checklist">${s.signals.map((x) => `<li>${rich(x)}</li>`).join('')}</ul>

      <h3>Requêtes FOCUS</h3>
      <ul class="query-list">
        ${s.snippets.map((id) => snippetById[id]).map((q) => `
          <li>
            <a class="query-link" href="#lab/${q.id}" data-nav="lab/${q.id}" data-run="true">
              <strong>${esc(q.title)}</strong>
              <span>${esc(q.question)}</span>
            </a>
          </li>`).join('')}
      </ul>

      <h3>Actions</h3>
      <ol class="action-list">${s.actions.map((x) => `<li>${rich(x)}</li>`).join('')}</ol>

      <h3>KPI à suivre</h3>
      <ul class="kpi-list">
        ${s.kpis.map((id) => kpiById[id]).map((k) => `<li><a class="link" href="#reference/kpis" data-nav="reference/kpis">${esc(k.name)}</a> : ${esc(k.formula)}</li>`).join('')}
      </ul>

      <div class="pitfall">
        <h3>Piège fréquent</h3>
        <p>${rich(s.pitfall)}</p>
      </div>

      ${s.demo ? `<p class="situation-demo">Voir le cas dans la démonstration : <a class="link" href="#demo/${s.demo}" data-nav="demo/${s.demo}">${DEMO_LABELS[s.demo]}</a></p>` : ''}
    </article>`;
}

export function renderSituations() {
  const list = situations.filter(matches);
  const current = situations.find((s) => s.id === state.detail) || list[0] || situations[0];

  return pageHead(
    'Situations terrain',
    'Les cas qu’on rencontre en arrivant chez un client : les signaux, les requêtes pour vérifier, les actions et le piège à éviter.',
  ) + `
    <div class="filter-bar">
      <label class="field field-grow">
        <span class="field-label">Rechercher</span>
        <input id="situation-search" type="search" value="${esc(filters.query)}" placeholder="Ex. engagement, tag, BigQuery" autocomplete="off">
      </label>
      <label class="field">
        <span class="field-label">Phase</span>
        <select id="situation-phase">
          <option value="all">Toutes les phases</option>
          ${PHASES.map((p) => `<option value="${p}" ${filters.phase === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </label>
      <label class="field">
        <span class="field-label">Domaine du framework</span>
        <select id="situation-domain">
          <option value="all">Tous les domaines</option>
          ${framework.domains.map((d) => `<option value="${esc(d.name)}" ${filters.domain === d.name ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}
        </select>
      </label>
    </div>

    <div class="master-detail">
      <label class="field compact-picker">
        <span class="field-label">Situation</span>
        <select id="situation-picker">
          ${list.map((s) => `<option value="${s.id}" ${s.id === current.id ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}
        </select>
      </label>
      <nav class="master" aria-label="Situations">
        <p class="master-count" aria-live="polite">${list.length} situation${list.length > 1 ? 's' : ''}</p>
        ${list.length ? `<ul class="master-list">
          ${list.map((s) => `
            <li>
              <a class="master-item" href="#situations/${s.id}" data-nav="situations/${s.id}" ${s.id === current.id ? 'aria-current="true"' : ''}>
                <strong>${esc(s.title)}</strong>
                <span>${s.phase}, ${s.capabilities.join(', ')}</span>
              </a>
            </li>`).join('')}
        </ul>` : '<p class="empty">Aucune situation ne correspond. Élargissez la phase ou le domaine.</p>'}
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
