// Référentiel : framework FinOps, FOCUS (avec l'anatomie d'une ligne) et KPI, avec une recherche transversale.

import { framework, focus, kpis } from '../content/reference.js';
import { snippetById } from '../content/snippets.js';
import { focusRows, COMMITMENT, sum } from '../data.js';
import { state, rerender } from '../state.js';
import { $, esc, rich, money, pageHead } from '../ui.js';

const SECTIONS = [
  ['framework', 'Framework FinOps'],
  ['focus', 'FOCUS'],
  ['kpis', 'KPI et formules'],
];

let query = '';
let anatomy = 'used';

const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/* ---------- Framework ---------- */

function frameworkSection() {
  return `
    <section class="ref-block" aria-labelledby="fw-title">
      <h2 id="fw-title">${framework.version}</h2>
      <p class="ref-lede">${esc(framework.definition)}</p>
    </section>

    <section class="ref-block" aria-labelledby="principles-title">
      <h3 id="principles-title">Principes</h3>
      <ol class="ref-principles">
        ${framework.principles.map(([en, fr]) => `<li><strong>${esc(en)}</strong><span>${esc(fr)}</span></li>`).join('')}
      </ol>
    </section>

    <div class="ref-columns">
      <section class="ref-block" aria-labelledby="phases-title">
        <h3 id="phases-title">Phases</h3>
        <dl class="ref-list">${framework.phases.map(([n, t]) => `<div><dt>${n}</dt><dd>${esc(t)}</dd></div>`).join('')}</dl>
        <h3>Maturité</h3>
        <dl class="ref-list">${framework.maturity.map(([n, t]) => `<div><dt>${n}</dt><dd>${esc(t)}</dd></div>`).join('')}</dl>
        <h3>Scopes</h3>
        <p class="ref-text">${esc(framework.scopes)}</p>
      </section>
      <section class="ref-block" aria-labelledby="personas-title">
        <h3 id="personas-title">Personas principaux</h3>
        <dl class="ref-list">${framework.personas.core.map(([n, t]) => `<div><dt>${n}</dt><dd>${esc(t)}</dd></div>`).join('')}</dl>
        <h3>Personas alliés</h3>
        <dl class="ref-list">${framework.personas.allied.map(([n, t]) => `<div><dt>${n}</dt><dd>${esc(t)}</dd></div>`).join('')}</dl>
      </section>
    </div>

    <section class="ref-block" aria-labelledby="domains-title">
      <h3 id="domains-title">Domaines et capacités</h3>
      <div class="domains">
        ${framework.domains.map((d) => `
          <div class="domain">
            <h4>${esc(d.name)}</h4>
            <p class="domain-fr">${esc(d.fr)}</p>
            <dl class="ref-list ref-list-tight">
              ${d.capabilities.map(([n, t]) => `<div><dt>${esc(n)}</dt><dd>${esc(t)}</dd></div>`).join('')}
            </dl>
          </div>`).join('')}
      </div>
    </section>`;
}

/* ---------- FOCUS ---------- */

const ANATOMY_DATE = '2026-09-13';

const EXAMPLES = [
  ['standard', 'Usage à la demande', (r) => r.ChargeCategory === 'Usage' && r.PricingCategory === 'Standard' && r.SubAccountId === 'atlas-analytics-prod' && r.ServiceName === 'BigQuery',
    'Sans remise négociée ni engagement, les quatre coûts sont égaux.'],
  ['used', 'Usage couvert par un engagement', (r) => r.CommitmentDiscountStatus === 'Used' && r.SubAccountId === 'orion-platform-prod',
    'BilledCost vaut 0 : les frais sont facturés sur la ligne Purchase. EffectiveCost porte la part amortie, 28 % sous ContractedCost, qui reste l’équivalent à la demande.'],
  ['unused', 'Part inutilisée', (r) => r.CommitmentDiscountStatus === 'Unused',
    'Seul EffectiveCost est renseigné : c’est l’engagement payé mais non consommé ce jour-là.'],
  ['purchase', 'Achat de l’engagement', (r) => r.ChargeCategory === 'Purchase',
    'BilledCost porte les frais du jour. EffectiveCost vaut 0 car ces frais sont amortis sur les lignes Used et Unused.'],
  ['credit', 'Crédit', (r) => r.ChargeCategory === 'Credit' && r.SubAccountId === 'atlas-analytics-prod' && r.ServiceName === 'BigQuery',
    'Montant négatif ; pour un crédit indépendant, les quatre coûts sont égaux.'],
];

function anatomySection() {
  const day = focusRows.filter((r) => r.date === ANATOMY_DATE);
  const [, , find, explanation] = EXAMPLES.find(([id]) => id === anatomy);
  const row = day.find(find);
  const mine = day.filter((r) => r.CommitmentDiscountId === COMMITMENT.id);
  const fee = sum(mine.filter((r) => r.ChargeCategory === 'Purchase'), (r) => r.BilledCost);
  const used = sum(mine.filter((r) => r.CommitmentDiscountStatus === 'Used'), (r) => r.EffectiveCost);
  const unused = sum(mine.filter((r) => r.CommitmentDiscountStatus === 'Unused'), (r) => r.EffectiveCost);
  const columns = ['ChargeCategory', 'ChargeFrequency', 'PricingCategory', 'CommitmentDiscountStatus', 'ServiceName', 'SubAccountId', 'ChargeDescription'];

  return `
    <section class="ref-block anatomy" aria-labelledby="anatomy-title">
      <h3 id="anatomy-title">Anatomie d’une ligne FOCUS</h3>
      <p class="ref-text">Cinq lignes réelles de la démo, le dimanche 13 septembre 2026. Choisissez un type de charge pour voir comment se renseignent les quatre coûts.</p>
      <div class="segmented" role="radiogroup" aria-label="Type de charge">
        ${EXAMPLES.map(([id, label]) => `<button role="radio" aria-checked="${id === anatomy}" data-anatomy="${id}">${label}</button>`).join('')}
      </div>
      <div class="anatomy-costs">
        ${['ListCost', 'ContractedCost', 'BilledCost', 'EffectiveCost'].map((c) => `
          <div class="${row[c] === 0 ? 'is-zero' : ''}">
            <p class="term-label"><code>${c}</code></p>
            <p class="anatomy-value">${money(row[c], 2)}</p>
          </div>`).join('')}
      </div>
      <p class="anatomy-explain">${rich(explanation)}</p>
      <dl class="anatomy-columns">
        ${columns.map((c) => `<div><dt><code>${c}</code></dt><dd>${row[c] === null ? '<span class="null">null</span>' : esc(row[c])}</dd></div>`).join('')}
      </dl>
      <p class="check-formula anatomy-check">Ce jour-là : frais ${money(fee, 2)} = utilisé ${money(used, 2)} + inutilisé ${money(unused, 2)}</p>
    </section>`;
}

function focusSection() {
  return `
    <section class="ref-block" aria-labelledby="focus-title">
      <h2 id="focus-title">FOCUS</h2>
      <p class="ref-lede">${esc(focus.definition)}</p>
    </section>

    <section class="ref-block" aria-labelledby="costs-title">
      <h3 id="costs-title">Les quatre coûts</h3>
      <div class="table-wrap">
        <table class="ref-table">
          <thead><tr><th scope="col">Colonne</th><th scope="col">Définition</th><th scope="col">Sert à</th></tr></thead>
          <tbody>${focus.costs.map(([c, d, u]) => `<tr><th scope="row"><code>${c}</code></th><td>${rich(d)}</td><td>${rich(u)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </section>

    ${anatomySection()}

    <section class="ref-block" aria-labelledby="rules-title">
      <h3 id="rules-title">Règles à connaître</h3>
      <ul class="checklist">${focus.rules.map((r) => `<li>${rich(r)}</li>`).join('')}</ul>
    </section>

    <section class="ref-block" aria-labelledby="columns-title">
      <h3 id="columns-title">Colonnes clés</h3>
      <div class="column-groups">
        ${focus.columnGroups.map(([group, columns]) => `
          <div>
            <h4>${group}</h4>
            <dl class="ref-list ref-list-tight">
              ${columns.map(([c, t]) => `<div><dt><code>${c}</code></dt><dd>${rich(t)}</dd></div>`).join('')}
            </dl>
          </div>`).join('')}
      </div>
    </section>

    <section class="ref-block" aria-labelledby="providers-title">
      <h3 id="providers-title">Exports FOCUS par fournisseur</h3>
      <div class="table-wrap">
        <table class="ref-table providers">
          <thead><tr><th scope="col"></th>${focus.providers.map((p) => `<th scope="col">${p.name}</th>`).join('')}</tr></thead>
          <tbody>
            ${[['export', 'Export'], ['subAccount', 'SubAccount'], ['tags', 'Tags'], ['commitments', 'Engagements'], ['gaps', 'Écarts et extensions']].map(([key, label]) => `
              <tr><th scope="row">${label}</th>${focus.providers.map((p) => `<td>${rich(p[key])}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="ref-text">${esc(focus.sovereignNote)}</p>
    </section>

    <section class="ref-block" aria-labelledby="versions-title">
      <h3 id="versions-title">Versions</h3>
      <dl class="ref-list">${focus.versions.map(([v, date, text]) => `<div><dt>FOCUS ${v}<span>${date}</span></dt><dd>${rich(text)}</dd></div>`).join('')}</dl>
    </section>`;
}

/* ---------- KPI ---------- */

function kpiSection() {
  return `
    <section class="ref-block" aria-labelledby="kpi-title">
      <h2 id="kpi-title">KPI et formules</h2>
      <p class="ref-lede">Chaque indicateur est écrit en colonnes FOCUS et relié à une requête exécutable dans le Labo SQL.</p>
    </section>
    <div class="kpi-cards">
      ${kpis.map((k) => `
        <article class="kpi" id="kpi-${k.id}">
          <h3>${esc(k.name)}</h3>
          <p class="kpi-capability">${esc(k.capability)}</p>
          <p class="kpi-formula">${esc(k.formula)}</p>
          <p class="kpi-focus"><code>${esc(k.focus)}</code></p>
          <p class="ref-text">${rich(k.reading)}</p>
          <a class="link" href="#lab/${k.snippet}" data-nav="lab/${k.snippet}" data-run="true">Lancer « ${esc(snippetById[k.snippet].title)} »</a>
        </article>`).join('')}
    </div>`;
}

/* ---------- Recherche ---------- */

function searchIndex() {
  return [
    ...framework.principles.map(([en, fr]) => ['framework', 'Principe', en, fr]),
    ...framework.domains.flatMap((d) => d.capabilities.map(([n, t]) => ['framework', `Capacité, ${d.name}`, n, t])),
    ...[...framework.personas.core, ...framework.personas.allied].map(([n, t]) => ['framework', 'Persona', n, t]),
    ...focus.costs.map(([c, d]) => ['focus', 'Coût', c, d]),
    ...focus.columnGroups.flatMap(([g, cols]) => cols.map(([c, t]) => ['focus', `Colonne, ${g}`, c, t])),
    ...focus.rules.map((r) => ['focus', 'Règle', r, '']),
    ...focus.providers.map((p) => ['focus', 'Fournisseur', p.name, `${p.export} ${p.tags} ${p.commitments} ${p.gaps}`]),
    ...kpis.map((k) => ['kpis', `KPI, ${k.capability}`, k.name, `${k.formula}. ${k.focus}`]),
  ];
}

function results() {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const found = searchIndex().filter((entry) => words.every((w) => normalize(entry.join(' ')).includes(w)));
  return `
    <p class="master-count" aria-live="polite">${found.length} résultat${found.length > 1 ? 's' : ''}</p>
    ${found.length ? `<ul class="search-results">
      ${found.map(([section, kind, title, text]) => `
        <li>
          <a href="#reference/${section}" data-nav="reference/${section}" data-clear-search="true">
            <span class="result-kind">${esc(kind)}</span>
            <strong>${esc(title)}</strong>
            ${text ? `<span>${esc(text)}</span>` : ''}
          </a>
        </li>`).join('')}
    </ul>` : '<p class="empty">Aucun résultat. Essayez un nom de colonne (EffectiveCost), une capacité ou un KPI.</p>'}`;
}

export function renderReference() {
  const section = SECTIONS.some(([id]) => id === state.detail) ? state.detail : 'framework';
  const body = { framework: frameworkSection, focus: focusSection, kpis: kpiSection }[section];
  return pageHead(
    'Référentiel',
    'La cheat sheet du consultant : framework FinOps 2026, spécification FOCUS et KPI avec leurs formules.',
  ) + `
    <div class="filter-bar">
      <label class="field field-grow">
        <span class="field-label">Rechercher dans le référentiel</span>
        <input id="reference-search" type="search" value="${esc(query)}" placeholder="Ex. EffectiveCost, Allocation, ESR" autocomplete="off">
      </label>
    </div>
    ${query.trim() ? results() : `
      <nav class="subnav" aria-label="Sections du référentiel">
        ${SECTIONS.map(([id, label]) => `<a class="subnav-link" href="#reference/${id}" data-nav="reference/${id}" ${id === section ? 'aria-current="page"' : ''}>${label}</a>`).join('')}
      </nav>
      <div class="reference">${body()}</div>`}`;
}

export function bindReference() {
  const search = $('#reference-search');
  search?.addEventListener('input', () => {
    query = search.value;
    rerender();
  });
}

export function handleReferenceClick(target) {
  if (target.dataset.anatomy) {
    anatomy = target.dataset.anatomy;
    rerender();
    return true;
  }
  if (target.dataset.clearSearch) query = '';
  return false;
}
