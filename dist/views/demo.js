// Démonstration : vue d'ensemble, optimisations, allocation, simulateur CUD et méthode.

import { teams, projects, rows, focusRows, recommendations, sum, allocation, commitment } from '../data.js';
import { toFocusCsv } from '../focus.js';
import {
  state, DEFAULTS, MONTHS, STATUS, DECISION_DONE, persist, rerender,
  projectById, ownerOf, inTeam, teamLabel, statusOf, periodRows, teamRecommendations, totals,
} from '../state.js';
import {
  $, money, pct, signedPct, kEuros, plural, esc, icon, pageHead, selectField, filterBar,
  term, operator, statusText, meter, toast, download, openSheet, sheetHead,
} from '../ui.js';
import { lineChart, bindCharts, serviceBars } from '../charts.js';

const periodField = () => selectField('period', 'Période', [[9, MONTHS[9].label], [8, MONTHS[8].label]], state.month);

const teamField = () => selectField('team', 'Équipe',
  [['all', 'Toutes les équipes'], ...[...teams, 'Partagé'].map((t) => [t, teamLabel(t)])], state.team);

function dailyChart(input) {
  const month = MONTHS[state.month];
  const partial = state.month === 9;
  const xs = Array.from({ length: month.days }, (_, i) => i + 1);
  const daily = (list) => xs.map((day) => sum(list.filter((r) => r.day === day), (r) => r.cost));
  const series = [{ key: 'current', label: partial ? 'Septembre 2026' : 'Août 2026', values: daily(input) }];
  if (partial) {
    series.push({ key: 'reference', label: 'Août 2026, mêmes jours', values: daily(rows.filter((r) => r.month === 8 && r.day <= month.days && inTeam(r.project))) });
  }
  const step = month.days > 20 ? 6 : 3;

  const chart = lineChart({
    id: 'daily',
    label: `Dépenses quotidiennes en euros, ${partial ? 'septembre comparé à août' : 'août 2026'}`,
    xs,
    xDomain: [1, month.days],
    xTicks: xs.filter((d) => (d - 1) % step === 0 || d === month.days).map((d) => ({ value: d, label: `${d} ${month.axis}` })),
    series,
    axis: kEuros,
    title: (d) => `${d} ${month.name} 2026`,
    value: (cents) => money(cents),
    annotations: partial && inTeam('atlas-analytics-prod') ? [{ x: 11, label: 'Début de la dérive BigQuery', tone: 'critical', align: 'end' }] : [],
  });

  const table = `
    <details class="data-view">
      <summary>Afficher les valeurs</summary>
      <div class="table-wrap">
        <table>
          <thead><tr><th scope="col">Jour</th>${series.map((s) => `<th scope="col" class="num">${esc(s.label)}</th>`).join('')}</tr></thead>
          <tbody>${xs.map((d, i) => `<tr><th scope="row">${d} ${month.name}</th>${series.map((s) => `<td class="num">${money(s.values[i], 2)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
    </details>`;

  return chart + table;
}

/* ---------- Vue d'ensemble ---------- */

function overview() {
  const input = periodRows();
  const t = totals(input);
  const partial = state.month === 9;
  const open = teamRecommendations().filter((r) => statusOf(r.id) !== 'rejected');
  const unallocated = sum(input.filter((r) => !ownerOf(r.project)), (r) => r.cost);
  const allocatedShare = t.total ? (1 - unallocated / t.total) * 100 : 100;

  return pageHead(
    'Vue d’ensemble',
    'Coût effectif (EffectiveCost, amorti) de l’organisation de démonstration, en euros hors taxes.',
    `<button class="btn" data-action="export">${icon('download')}Exporter au format FOCUS</button>`,
    ['Reporting & Analytics', 'Forecasting', 'Anomaly Management'],
  )
    + filterBar([periodField(), teamField()], `Données arrêtées au ${MONTHS[state.month].cutoff}`)
    + forecastStatement(t)
    + `
    <div class="followups">
      <p>Potentiel d’optimisation : <strong>${money(sum(open, (r) => r.saving))} par mois</strong>, estimé sur ${plural(open.length, 'piste', 'pistes')}.
        <a class="link" href="#demo/optimise" data-nav="demo/optimise">Voir les pistes</a></p>
      <p>Coûts attribués à une équipe : <strong>${pct(allocatedShare)}</strong>${unallocated
        ? `, ${money(unallocated)} sans équipe. <a class="link" href="#demo/allocation" data-nav="demo/allocation">Attribuer</a>`
        : '.'}</p>
    </div>`
    + (partial && inTeam('atlas-analytics-prod') ? driftNotice() : '')
    + `
    <div class="split section">
      <section aria-labelledby="daily-title">
        <h2 id="daily-title">Dépenses quotidiennes</h2>
        <p class="section-note">${partial ? 'Septembre comparé aux mêmes jours d’août.' : 'Mois clôturé.'}</p>
        ${dailyChart(input)}
      </section>
      <section aria-labelledby="services-title">
        <h2 id="services-title">Par service</h2>
        <p class="section-note">Coût effectif sur la période.</p>
        ${serviceBars(input)}
      </section>
    </div>`
    + projectTable(input);
}

function forecastStatement(t) {
  const partial = state.month === 9;
  const gap = t.forecast - t.budget;
  const ratio = t.budget ? t.forecast / t.budget * 100 : 0;
  const budgetNote = gap > 0
    ? statusText('critical', `Dépassement ${partial ? 'prévu ' : ''}de ${money(gap)}`)
    : statusText('good', `Marge ${partial ? 'prévue ' : ''}de ${money(-gap)}`);
  const budget = term('Budget mensuel', money(t.budget), budgetNote, 'term-aside');

  // Chaque terme est arrondi à l'euro ; le reste à courir est déduit des arrondis pour que l'addition tombe juste.
  const euro = (cents) => Math.round(cents / 100) * 100;

  if (!partial) {
    return `
      <section class="statement" aria-label="Réalisé et budget">
        ${term('Réalisé en août', `<span class="total">${money(t.total)}</span>`, `Mois clôturé, ${pct(ratio)} du budget`, 'term-result')}
        ${budget}
      </section>`;
  }

  return `
    <section class="statement" aria-label="Projection de fin de mois">
      ${term('Réalisé du 1er au 15 sept.', money(t.total), `${signedPct(t.delta)} par rapport au 1er–15 août`)}
      ${operator('+', 'plus')}
      ${term('Reste à courir, 15 jours', money(euro(t.forecast) - euro(t.total)), 'Moyenne des 7 derniers jours × 15')}
      ${operator('=', 'égale')}
      ${term('Projection fin septembre', `<span class="total">${money(t.forecast)}</span>`, `${pct(ratio)} du budget`, 'term-result')}
      ${budget}
    </section>`;
}

function driftNotice() {
  const bigQuery = rows.filter((r) => r.month === 9 && r.project === 'atlas-analytics-prod' && r.service === 'BigQuery');
  const average = (list) => sum(list, (r) => r.cost) / list.length;
  const extra = average(bigQuery.filter((r) => r.day >= 11)) - average(bigQuery.filter((r) => r.day < 11));
  return `
    <div class="notice notice-critical">
      ${icon('alert')}
      <p><strong>Dérive BigQuery sur Atlas Analytics.</strong> Depuis le 11 septembre, le projet coûte environ ${money(Math.round(extra / 10000) * 10000)} de plus par jour.</p>
      <div class="notice-actions"><button class="btn" data-rec="bq-partition">Examiner la dérive</button></div>
    </div>`;
}

function projectTable(input) {
  const list = projects
    .map((p) => ({ ...p, cost: sum(input.filter((r) => r.project === p.id), (r) => r.cost) }))
    .filter((p) => p.cost)
    .sort((a, b) => b.cost - a.cost);
  const total = sum(list, (p) => p.cost);
  const budget = sum(list, (p) => p.budget * 100);

  return `
    <section class="section" aria-labelledby="projects-title">
      <div class="section-head">
        <div>
          <h2 id="projects-title">Projets</h2>
          <p class="section-note">Budget consommé : dépenses de la période rapportées au budget mensuel. Montants arrondis à l’euro.</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Projet</th>
              <th scope="col">Équipe</th>
              <th scope="col">Environnement</th>
              <th scope="col">Région</th>
              <th scope="col" class="num">Dépenses</th>
              <th scope="col" class="num">Budget consommé</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((p) => `
              <tr>
                <td><button class="row-link" data-project="${p.id}">${esc(p.name)}</button><span class="cell-sub">${p.id}</span></td>
                <td>${ownerOf(p.id) ? esc(teamLabel(ownerOf(p.id))) : statusText('critical', 'À attribuer')}</td>
                <td>${p.env}</td>
                <td>${p.region}</td>
                <td class="num">${money(p.cost)}</td>
                <td class="num">${meter(p.cost / (p.budget * 100) * 100)}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <th scope="row">Total, ${plural(list.length, 'projet', 'projets')}</th>
              <td></td><td></td><td></td>
              <td class="num">${money(total)}</td>
              <td class="num">${budget ? meter(total / budget * 100) : ''}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>`;
}

/* ---------- Optimisations ---------- */

function optimise() {
  const recs = teamRecommendations();
  const visible = recs.filter((r) => state.recFilter === 'all' || statusOf(r.id) === state.recFilter);
  const open = recs.filter((r) => statusOf(r.id) !== 'rejected');
  const approved = recs.filter((r) => ['approved', 'implemented'].includes(statusOf(r.id)));

  return pageHead(
    'Optimisations',
    'Pistes chiffrées au 15 septembre 2026. Chaque décision est motivée, et chaque gain reste à mesurer après déploiement.',
    '',
    ['Usage Optimization', 'Rate Optimization'],
  )
    + filterBar([
      teamField(),
      selectField('rec-filter', 'Statut', [['all', 'Tous les statuts'], ...Object.entries(STATUS)], state.recFilter),
    ], 'Estimations mensuelles, indépendantes de la période choisie')
    + `
    <dl class="figures">
      <div class="figure">
        <dt>Potentiel estimé</dt>
        <dd class="figure-value">${money(sum(open, (r) => r.saving))}<span class="unit"> par mois</span></dd>
        <dd class="figure-note">${plural(open.length, 'piste non écartée', 'pistes non écartées')}, hors engagements CUD</dd>
      </div>
      <div class="figure">
        <dt>Pistes validées</dt>
        <dd class="figure-value">${money(sum(approved, (r) => r.saving))}<span class="unit"> par mois</span></dd>
        <dd class="figure-note">${approved.length} sur ${recs.length}</dd>
      </div>
      <div class="figure">
        <dt>Gains constatés</dt>
        <dd class="figure-value">Non mesurés</dd>
        <dd class="figure-note">Mesure après déploiement, à volume comparable</dd>
      </div>
    </dl>`
    + recommendationTable(visible)
    + decisionLog();
}

function recommendationTable(list) {
  const counted = list.filter((r) => statusOf(r.id) !== 'rejected');
  return `
    <section class="section" aria-labelledby="plan-title">
      <div class="section-head"><h2 id="plan-title">Plan d’optimisation</h2></div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Piste</th>
              <th scope="col">Service et projet</th>
              <th scope="col">Risque</th>
              <th scope="col">Effort</th>
              <th scope="col">Statut</th>
              <th scope="col" class="num">Gain estimé par mois</th>
            </tr>
          </thead>
          <tbody>
            ${list.length ? list.map((r) => {
              const rejected = statusOf(r.id) === 'rejected';
              return `
                <tr class="${rejected ? 'is-rejected' : ''}">
                  <td class="cell-wide"><button class="row-link" data-rec="${r.id}">${esc(r.title)}</button><span class="cell-sub">${esc(r.description)}</span></td>
                  <td>${r.service}<span class="cell-sub">${r.project}</span></td>
                  <td>${r.risk}</td>
                  <td>${r.effort}</td>
                  <td>${STATUS[statusOf(r.id)]}</td>
                  <td class="num"><span class="amount">${money(r.saving)}</span></td>
                </tr>`;
            }).join('') : `<tr><td colspan="6" class="empty">Aucune piste avec ce statut pour cette équipe. Choisissez « Tous les statuts » pour tout afficher.</td></tr>`}
          </tbody>
          ${list.length ? `
          <tfoot>
            <tr class="total-row">
              <th scope="row" colspan="5">Total affiché, hors pistes écartées</th>
              <td class="num">${money(sum(counted, (r) => r.saving))}</td>
            </tr>
          </tfoot>` : ''}
        </table>
      </div>
    </section>`;
}

function decisionLog() {
  const time = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `
    <section class="section" aria-labelledby="log-title">
      <div class="section-head">
        <div>
          <h2 id="log-title">Journal des décisions</h2>
          <p class="section-note">Décisions motivées, enregistrées uniquement dans cet onglet.</p>
        </div>
        <button class="btn" data-action="export-decisions" ${state.decisions.length ? '' : 'disabled'}>Exporter en JSON</button>
      </div>
      ${state.decisions.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th scope="col">Heure</th><th scope="col">Piste</th><th scope="col">Décision</th><th scope="col">Motif</th></tr></thead>
          <tbody>
            ${state.decisions.slice().reverse().map((d) => `
              <tr>
                <td class="nowrap">${time(d.at)}</td>
                <td>${esc(recommendations.find((r) => r.id === d.id).title)}</td>
                <td class="nowrap">${STATUS[d.status]}</td>
                <td>${esc(d.note)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<p class="empty">Aucune décision pour l’instant. Ouvrez une piste pour la valider ou l’écarter.</p>'}
    </section>`;
}

/* ---------- Allocation ---------- */

function allocationView() {
  const input = rows.filter((r) => r.month === state.month);
  const a = allocation(input, state.owners, state.method);
  const allocated = sum(a.items, (x) => x.total);
  const unowned = projects.filter((p) => !p.team && !state.owners[p.id]);
  const gap = a.total - allocated - a.unallocated;
  const max = Math.max(1, ...a.items.map((r) => r.total));
  const share = (v) => a.total ? pct(v / a.total * 100) : '—';

  return pageHead(
    'Allocation',
    'Répartir les coûts par équipe, redistribuer le socle partagé et vérifier que le total est rapproché au centime.',
    `<button class="btn" data-action="export-allocation">Exporter le showback</button>
     <button class="btn btn-primary" data-action="export-chargeback" ${a.unallocated ? 'disabled' : ''}>Préparer le chargeback</button>`,
    ['Allocation', 'Invoicing & Chargeback'],
  )
    + filterBar([
      periodField(),
      selectField('allocation-method', 'Clé de partage du socle', [['usage', 'Prorata des coûts directs'], ['equal', 'Parts égales']], state.method),
    ], 'Organisation entière. Brouillon de refacturation, aucune écriture comptable.')
    + (unowned.length ? `
    <div class="notice notice-critical">
      ${icon('alert')}
      <p><strong>Sandbox R&amp;D n’a pas d’équipe responsable.</strong> ${money(a.unallocated)} ne peuvent pas être refacturés, et le chargeback reste bloqué tant qu’aucune équipe n’est choisie.</p>
      <div class="notice-actions">
        <label class="sr-only" for="assign-owner">Équipe responsable de Sandbox R&amp;D</label>
        <select id="assign-owner">${teams.map((t) => `<option ${t === 'Innovation' ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <button class="btn btn-primary" data-action="assign">Attribuer</button>
      </div>
    </div>` : `
    <div class="notice notice-good">
      ${icon('check')}
      <p><strong>Tous les coûts ont une équipe.</strong> Le brouillon de chargeback peut être préparé.</p>
    </div>`)
    + `
    <section class="section" aria-labelledby="split-title">
      <div class="section-head">
        <div>
          <h2 id="split-title">Répartition par équipe</h2>
          <p class="section-note">Les coûts directs restent à l’équipe ; seul le socle partagé est redistribué.</p>
        </div>
        <ul class="legend">
          <li><span class="key key-rect key-direct"></span>Coûts directs</li>
          <li><span class="key key-rect key-shared"></span>Quote-part du socle partagé</li>
        </ul>
      </div>
      <div class="stacks">
        ${a.items.map((r) => `
          <div class="stack-row">
            <span class="stack-name">${r.team}</span>
            <span class="stack" role="img" aria-label="${r.team} : ${money(r.direct)} de coûts directs et ${money(r.shared)} de socle partagé">
              <span class="stack-direct" style="width:${(r.direct / max * 98).toFixed(2)}%" title="Coûts directs : ${money(r.direct)}"></span>
              ${r.shared ? `<span class="stack-shared" style="width:${(r.shared / max * 98).toFixed(2)}%" title="Socle partagé : ${money(r.shared)}"></span>` : ''}
            </span>
            <span class="stack-value">${money(r.total)}</span>
          </div>`).join('')}
      </div>

      <div class="table-wrap stacks-table">
        <table>
          <thead>
            <tr>
              <th scope="col">Équipe</th>
              <th scope="col" class="num">Coûts directs</th>
              <th scope="col" class="num">Socle partagé</th>
              <th scope="col" class="num">Total alloué</th>
              <th scope="col" class="num">Part du total</th>
            </tr>
          </thead>
          <tbody>
            ${a.items.map((r) => `
              <tr>
                <th scope="row">${r.team}</th>
                <td class="num">${money(r.direct, 2)}</td>
                <td class="num">${money(r.shared, 2)}</td>
                <td class="num">${money(r.total, 2)}</td>
                <td class="num">${share(r.total)}</td>
              </tr>`).join('')}
            ${a.unallocated ? `
              <tr>
                <th scope="row">${statusText('critical', 'Non attribué')}</th>
                <td class="num">${money(a.unallocated, 2)}</td>
                <td class="num">—</td>
                <td class="num">${money(a.unallocated, 2)}</td>
                <td class="num">${share(a.unallocated)}</td>
              </tr>` : ''}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <th scope="row">Total rapproché</th>
              <td class="num">${money(a.totalDirect + a.unallocated, 2)}</td>
              <td class="num">${money(a.shared, 2)}</td>
              <td class="num">${money(a.total, 2)}</td>
              <td class="num">100 %</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="check">
        <p class="check-formula">Total facturé ${money(a.total, 2)} − alloué aux équipes ${money(allocated, 2)} − non attribué ${money(a.unallocated, 2)} = <strong>${money(gap, 2)}</strong></p>
        ${gap === 0 ? statusText('good', 'Rapproché au centime') : statusText('critical', 'Écart à analyser')}
      </div>

      <p class="section-note">Montants en coût effectif (EffectiveCost) : la remise du CUD flexible profite aux projets qui consomment, sa part inutilisée reste au socle partagé. Les centimes résiduels sont attribués aux plus forts restes. ${state.method === 'usage'
        ? 'La clé dépend des dépenses directes connues, sans utiliser les coûts non attribués.'
        : 'Le socle partagé est divisé entre les quatre équipes.'} ${state.month === 9 ? 'Septembre est une période partielle : tout export de chargeback reste provisoire.' : ''}</p>
    </section>`;
}

/* ---------- Simulateur CUD ---------- */

function range(id, label, min, max, minNote = '', maxNote = '') {
  return `
    <div class="control">
      <div class="control-head">
        <label for="${id}">${label}</label>
        <output id="${id}-output" for="${id}">${state[id]} %</output>
      </div>
      <input id="${id}" type="range" min="${min}" max="${max}" step="1" value="${state[id]}">
      <div class="range-scale"><span>${min} %${minNote}</span><span>${max} %${maxNote}</span></div>
    </div>`;
}

function simulate() {
  return pageHead(
    'Simulateur CUD',
    'Comparer un engagement de consommation à la facturation à la demande, y compris quand l’usage baisse.',
    '',
    ['Rate Optimization', 'Planning & Estimating'],
  ) + `
    <div class="sim">
      <section class="controls" aria-labelledby="controls-title">
        <h2 id="controls-title">Hypothèses</h2>
        <div class="control">
          <label for="base">Dépense à la demande à 100 % d’usage</label>
          <div class="input-affix">
            <input id="base" type="number" min="100" max="1000000" step="100" value="${state.base}" inputmode="numeric">
            <span>€ par mois</span>
          </div>
        </div>
        ${range('usage', 'Usage réel', 20, 120, ', contraction', ', croissance')}
        ${range('commit', 'Part du socle engagée', 0, 100)}
        ${range('discount', 'Remise de l’engagement', 10, 60)}
        <div class="control">
          <p class="control-label">Scénarios</p>
          <div class="presets">
            <button class="btn btn-small" data-scenario="stable">Usage stable</button>
            <button class="btn btn-small" data-scenario="drop">Usage à 40 %</button>
            <button class="btn btn-small" data-scenario="none">Sans engagement</button>
          </div>
        </div>
        <p class="control-note">Paramètres illustratifs, sans valeur de devis. Le calcul exclut taxes, change, autres remises et granularité horaire. Aucun engagement n’est acheté.</p>
      </section>
      <div id="simulation-results"></div>
    </div>`;
}

function simResults() {
  const { base, usage, commit, discount } = state;
  const r = commitment(base, usage, commit, discount);
  const euros = (v) => money(Math.round(v * 100));
  const breakeven = commit * (1 - discount / 100);
  const outcome = r.saving > 0
    ? statusText('good', `Économie de ${euros(r.saving)} par mois`)
    : r.saving < 0
      ? statusText('critical', `Surcoût de ${euros(-r.saving)} par mois`)
      : '<span class="status">Aucun écart</span>';

  const xs = [...new Set([...Array.from({ length: 25 }, (_, i) => i * 5), commit, usage])].sort((a, b) => a - b);

  return `
    <section class="statement statement-compact" aria-label="Coût mensuel avec engagement">
      ${term('Engagement fixe', euros(r.fee), `${commit} % du socle, remise de ${discount} %`)}
      ${operator('+', 'plus')}
      ${term('Usage au-delà', money(Math.round(r.cost) * 100 - Math.round(r.fee) * 100), 'Facturé à la demande')}
      ${operator('=', 'égale')}
      ${term('Avec engagement', `<span class="total">${euros(r.cost)}</span>`, `À ${usage} % d’usage`, 'term-result')}
      ${term('À la demande', euros(r.actual), outcome, 'term-aside')}
    </section>

    ${r.unused ? `
    <div class="notice notice-critical">
      ${icon('alert')}
      <p><strong>${euros(r.unused)} d’engagement payé sans être consommé.</strong> L’engagement reste dû même quand l’usage baisse.</p>
    </div>` : ''}

    <section class="section section-tight" aria-labelledby="sim-chart-title">
      <h2 id="sim-chart-title">Coût mensuel selon l’usage</h2>
      <p class="section-note">${commit
        ? `Dans ce modèle, l’engagement devient rentable au-delà de ${pct(breakeven)} d’usage. Taux d’utilisation de l’engagement : ${pct(r.utilization)}.`
        : 'Sans engagement, toute la consommation reste facturée à la demande.'}</p>
      ${lineChart({
        id: 'commitment',
        label: 'Coût mensuel avec engagement comparé à la facturation à la demande, selon le niveau d’usage',
        xs,
        xDomain: [0, 120],
        xTicks: [0, 20, 40, 60, 80, 100, 120].map((u) => ({ value: u, label: `${u} %` })),
        series: [
          { key: 'current', label: 'Avec engagement', values: xs.map((u) => commitment(base, u, commit, discount).cost * 100) },
          { key: 'reference', label: 'À la demande', values: xs.map((u) => base * u) },
        ],
        axis: kEuros,
        title: (u) => `Usage ${u} %`,
        value: (cents) => money(Math.round(cents)),
        annotations: [{ x: usage, label: `Usage actuel, ${usage} %`, tone: 'neutral', align: usage > 90 ? 'end' : 'start' }],
        dots: [{ key: 'current', x: usage, y: r.cost * 100 }],
      })}
      <p class="section-note">Le gain d’un engagement ne s’additionne pas automatiquement aux gains de rightsizing : réduire la capacité réduit aussi la base à engager.</p>
    </section>`;
}

function bindSimulator() {
  const update = () => {
    $('#simulation-results').innerHTML = simResults();
    bindCharts($('#simulation-results'));
  };
  update();

  ['usage', 'commit', 'discount'].forEach((id) => {
    $(`#${id}`).addEventListener('input', (e) => {
      state[id] = Number(e.target.value);
      $(`#${id}-output`).textContent = `${state[id]} %`;
      update();
    });
  });

  const base = $('#base');
  base.addEventListener('input', () => {
    const v = Number(base.value);
    if (Number.isFinite(v) && v >= 100 && v <= 1000000) {
      state.base = v;
      update();
    }
  });
  base.addEventListener('change', () => {
    if (!base.checkValidity()) {
      base.value = state.base;
      base.reportValidity();
    }
  });
}

/* ---------- Méthode ---------- */

function method() {
  const steps = [
    ['demo/overview', '', 'Observer', 'Repérer la dérive BigQuery et la projection au-dessus du budget.'],
    ['demo/optimise', 'bq-partition', 'Qualifier', 'Ouvrir la piste, justifier l’action et ses garde-fous.'],
    ['demo/allocation', '', 'Responsabiliser', 'Attribuer Sandbox R&D, puis rapprocher les coûts.'],
    ['demo/simulate', '', 'Arbitrer', 'Tester le risque d’un engagement trop élevé.'],
    ['situations/bill-spike', '', 'Outiller', 'Ouvrir une situation terrain et lancer sa requête FOCUS.'],
  ];

  const rules = [
    ['Format', 'Lignes FOCUS 1.2 quotidiennes : usage, crédits, achat d’engagement et part inutilisée. La démo agrège l’EffectiveCost par jour, projet et service.'],
    ['Engagement', 'CUD flexible de 1 900 € d’équivalent à la demande par jour, remise de 28 %, porté par le socle partagé. Frais en Purchase (EffectiveCost = 0), usage couvert en Used, reliquat en Unused.'],
    ['Crédits', 'Crédit promotionnel de 2 % sur l’usage à la demande, en lignes Credit dont les quatre coûts sont égaux.'],
    ['Projection', 'Septembre : réalisé du 1er au 15 + moyenne quotidienne des 7 derniers jours × 15 jours restants. Extrapolation simple, sans intervalle de confiance.'],
    ['Comparaison', 'Septembre du 1er au 15 comparé à août du 1er au 15. Les budgets sont mensuels.'],
    ['Potentiel', 'Somme des estimations des pistes non écartées, sur des ressources distinctes. Aucune économie constatée n’est inventée.'],
    ['Répartition', 'Coûts directs par équipe, socle partagé redistribué au prorata ou à parts égales. Les coûts non attribués restent visibles et bloquent le chargeback.'],
    ['Arrondis', 'Calculs en centimes entiers, reliquat aux plus forts restes. Affichage à l’euro, exports au centime.'],
  ];

  const pipeline = [
    ['Activer l’export FOCUS.', 'Google Cloud : export FOCUS vers BigQuery (preview), dans un projet dédié, lecture au moindre privilège. AWS et Azure : exports FOCUS vers S3 ou un compte de stockage.'],
    ['Contrôler et rapprocher.', 'Lancer le contrôle qualité du Labo SQL, rapprocher BilledCost de la facture d’un mois clôturé, noter les écarts de conformité.'],
    ['Attribuer et enrichir.', 'Rapprocher projets, labels et centres de coûts ; joindre les métriques d’usage et les propriétaires applicatifs.'],
    ['Servir les vues de pilotage.', 'Ajouter une API authentifiée, un contrôle d’accès par équipe et un historique auditable des décisions.'],
  ];

  const references = [
    ['https://focus.finops.org/focus-specification/', 'Spécification FOCUS', 'Colonnes, valeurs autorisées et règles de coût.'],
    ['https://www.finops.org/framework/', 'FinOps Framework', 'Principes, domaines, capacités et maturité.'],
    ['https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/focus-export', 'Export FOCUS de Google Cloud', 'Schéma et écarts de conformité de l’export BigQuery.'],
    ['https://cloud.google.com/docs/cuds', 'Engagements de consommation', 'Une dépense engagée reste due même si elle n’est pas utilisée.'],
  ];

  return pageHead(
    'Méthode',
    'Périmètre des données, règles de calcul et passage à un export FOCUS réel.',
    '<button class="btn" data-action="reset">Réinitialiser la démo</button>',
  ) + `
    <section class="section section-first" aria-labelledby="tour-title">
      <h2 id="tour-title">Parcours de démonstration en 5 minutes</h2>
      <ol class="steps">
        ${steps.map(([route, rec, title, text], i) => `
          <li>
            <a class="step" href="#${route}" ${rec ? `data-guide="${rec}"` : `data-nav="${route}"`}>
              <span class="step-number">${i + 1}</span>
              <strong>${title}</strong>
              <span>${text}</span>
            </a>
          </li>`).join('')}
      </ol>
    </section>

    <div class="columns section">
      <section class="prose" aria-labelledby="scope-title">
        <h2 id="scope-title">Périmètre</h2>
        <p>8 projets fictifs, 4 équipes, 7 services Google Cloud et 2 régions européennes. Les données couvrent août 2026 et les 15 premiers jours de septembre, soit ${focusRows.length.toLocaleString('fr-FR')} lignes FOCUS.</p>
        <p>Un générateur déterministe produit les mêmes lignes à chaque ouverture : variation quotidienne, activité réduite le week-end, croissance du stockage de Nova Intelligence et surconsommation BigQuery à partir du 11 septembre.</p>
        <p>Aucune donnée d’entreprise réelle, aucun compte cloud connecté. Les affectations et décisions restent dans la session de cet onglet ; fermer l’onglet ou réinitialiser la démo les efface.</p>
        <h3>Règles de calcul</h3>
        <dl class="rules">
          ${rules.map(([name, text]) => `<div><dt>${name}</dt><dd>${text}</dd></div>`).join('')}
        </dl>
      </section>

      <section class="prose" aria-labelledby="real-title">
        <h2 id="real-title">Brancher un export réel</h2>
        <ol class="pipeline">
          ${pipeline.map(([title, text]) => `<li><strong>${title}</strong> ${text}</li>`).join('')}
        </ol>
        <p>Les tests automatiques vérifient les règles de coût FOCUS de la démo et exécutent chaque requête de la bibliothèque. Ce prototype ne contient ni connecteur actif, ni moteur de facturation, ni automatisation de ressources.</p>
        <h3>Références</h3>
        <ul class="references">
          ${references.map(([href, title, text]) => `<li><a class="link" href="${href}" target="_blank" rel="noopener noreferrer">${title}</a><span>${text}</span></li>`).join('')}
        </ul>
      </section>
    </div>`;
}

/* ---------- Fiches détaillées ---------- */

function showProject(id) {
  const p = projectById[id];
  const input = rows.filter((r) => r.month === state.month && r.project === id);
  const cost = sum(input, (r) => r.cost);
  const owner = ownerOf(id);

  openSheet(sheetHead(esc(p.name), `${p.id}, ${p.region}`) + `
    <div class="sheet-figure">
      <p class="figure-value">${money(cost)}</p>
      <p class="figure-note">Coût effectif ${MONTHS[state.month].range}</p>
    </div>
    <dl class="facts">
      <div><dt>Équipe</dt><dd>${owner ? esc(teamLabel(owner)) : statusText('critical', 'À attribuer')}</dd></div>
      <div><dt>Environnement</dt><dd>${p.env}</dd></div>
      <div><dt>Budget mensuel</dt><dd>${money(p.budget * 100)}</dd></div>
      <div><dt>Budget consommé</dt><dd>${pct(cost / (p.budget * 100) * 100)}</dd></div>
    </dl>
    <h3>Par service</h3>
    ${serviceBars(input)}
    <p class="sheet-foot">Nom et montants fictifs, sans lien avec une organisation réelle.</p>`);
}

function showRecommendation(id) {
  const r = recommendations.find((x) => x.id === id);
  const status = statusOf(id);
  const actions = {
    candidate: [['approved', 'Valider la piste', true], ['rejected', 'Écarter la piste']],
    approved: [['implemented', 'Marquer comme déployée', true], ['rejected', 'Écarter la piste']],
    implemented: [['candidate', 'Remettre à qualifier']],
    rejected: [['candidate', 'Remettre à qualifier']],
  }[status];

  openSheet(sheetHead(esc(r.title), `${r.service}, ${r.project}`) + `
    <dl class="facts facts-four">
      <div><dt>Statut</dt><dd>${STATUS[status]}</dd></div>
      <div><dt>Risque</dt><dd>${r.risk}</dd></div>
      <div><dt>Effort</dt><dd>${r.effort}</dd></div>
      <div><dt>Responsable</dt><dd>${r.owner}</dd></div>
    </dl>
    <div class="sheet-figure">
      <p class="figure-value">${money(r.saving)}<span class="unit"> par mois</span></p>
      <p class="figure-note">Gain estimé, non constaté</p>
      <p class="formula">${r.formula}</p>
    </div>
    <h3>Constat</h3>
    <p>${r.evidence}</p>
    <h3>Action proposée</h3>
    <p>${r.action}</p>
    ${r.before ? `
    <details class="sql">
      <summary>Exemple SQL avant et après</summary>
      <p class="code-caption">Avant : relit tout l’historique</p>
      <pre><code>${esc(r.before)}</code></pre>
      <p class="code-caption">Après : lit une seule partition</p>
      <pre><code>${esc(r.after)}</code></pre>
      <p>Exemple fictif. @processing_date doit être défini et la table partitionnée sur event_date. Les rattrapages nécessitent une fenêtre adaptée.</p>
    </details>` : ''}
    <h3>Garde-fous</h3>
    <p>${r.guardrail}</p>
    <h3>Mesure après déploiement</h3>
    <p>${r.validation}</p>
    <form id="decision-form" class="decision">
      <label for="decision-note">Motif de la décision</label>
      <textarea id="decision-note" rows="3" maxlength="500" placeholder="Ex. Valider en recette avant de modifier la production."></textarea>
      <p class="form-help">Obligatoire pour tracer la décision. Rien n’est modifié dans Google Cloud.</p>
      <div class="decision-actions">
        ${actions.map(([value, label, primary]) => `<button type="submit" class="btn ${primary ? 'btn-primary' : ''}" value="${value}">${label}</button>`).join('')}
      </div>
    </form>`);

  const note = $('#decision-note');
  note.addEventListener('input', () => note.setCustomValidity(''));
  $('#decision-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = note.value.trim();
    if (!text) {
      note.setCustomValidity('Ajoutez un motif pour tracer cette décision.');
      note.reportValidity();
      return;
    }
    const next = e.submitter.value;
    state.statuses[id] = next;
    state.decisions.push({ id, status: next, note: text, at: new Date().toISOString() });
    persist();
    $('#detail').close();
    rerender();
    toast(`${DECISION_DONE[next]}. Décision enregistrée dans cet onglet.`);
  });
}


function exportFocus() {
  const input = focusRows.filter((r) => r.month === state.month && inTeam(r.SubAccountId));
  download(`stratus-focus-${MONTHS[state.month].key}.csv`, toFocusCsv(input));
  toast(`${input.length} lignes FOCUS 1.2 exportées. Le fichier se recharge dans le Labo SQL.`);
}

function exportAllocation(chargeback = false) {
  const input = rows.filter((r) => r.month === state.month);
  const a = allocation(input, state.owners, state.method);
  if (chargeback && a.unallocated) {
    toast('Attribuez les coûts restants avant de préparer le chargeback.');
    return;
  }
  const period = MONTHS[state.month].key;
  const header = ['Period', 'Mode', 'Team', 'DirectCostEUR', 'SharedCostEUR', 'TotalEUR', 'AllocationMethod', 'Status'];
  const lines = a.items.map((r) => [
    period, chargeback ? 'Chargeback' : 'Showback', r.team,
    (r.direct / 100).toFixed(2), (r.shared / 100).toFixed(2), (r.total / 100).toFixed(2),
    state.method, state.month === 9 ? 'PROVISOIRE_1_15_SEPTEMBRE' : 'BROUILLON_A_VALIDER',
  ]);
  if (a.unallocated) {
    lines.push([period, 'Showback', 'Non attribué', (a.unallocated / 100).toFixed(2), '0.00', (a.unallocated / 100).toFixed(2), state.method, 'NON_ATTRIBUE']);
  }
  download(`stratus-${chargeback ? 'chargeback-brouillon' : 'showback'}-2026-${state.month}.csv`, [header, ...lines].map((l) => l.join(',')).join('\r\n'));
  toast(`${chargeback ? 'Brouillon de chargeback' : 'Showback'} exporté, total ${money(a.total, 2)}.`);
}

function exportDecisions() {
  const payload = state.decisions.map((d) => ({ ...d, title: recommendations.find((r) => r.id === d.id).title, simulation: true }));
  download('stratus-decisions.json', JSON.stringify(payload, null, 2), 'application/json');
  toast('Journal des décisions exporté.');
}

function resetDemo() {
  Object.assign(state, DEFAULTS, { owners: {}, statuses: {}, decisions: [] });
  persist();
  rerender();
  toast('La démo a été réinitialisée.');
}

const SCENARIOS = {
  stable: { usage: 85, commit: 65 },
  drop: { usage: 40, commit: 85 },
  none: { commit: 0 },
};

export const DEMO_VIEWS = [
  ['overview', 'Vue d’ensemble', overview],
  ['optimise', 'Optimisations', optimise],
  ['allocation', 'Allocation', allocationView],
  ['simulate', 'Simulateur CUD', simulate],
  ['method', 'Méthode', method],
];

export function renderDemo() {
  const view = DEMO_VIEWS.find(([id]) => id === state.view) || DEMO_VIEWS[0];
  return `
    <nav class="subnav" aria-label="Vues de la démonstration">
      ${DEMO_VIEWS.map(([id, label]) => `<a class="subnav-link" href="#demo/${id}" data-nav="demo/${id}" ${view[0] === id ? 'aria-current="page"' : ''}>${label}</a>`).join('')}
    </nav>
    ${view[2]()}`;
}

export function bindDemo() {
  const on = (selector, type, handler) => $(selector)?.addEventListener(type, handler);
  on('#period', 'change', (e) => { state.month = Number(e.target.value); rerender(); });
  on('#team', 'change', (e) => { state.team = e.target.value; rerender(); });
  on('#rec-filter', 'change', (e) => { state.recFilter = e.target.value; rerender(); });
  on('#allocation-method', 'change', (e) => { state.method = e.target.value; persist(); rerender(); });
  if (state.view === 'simulate') bindSimulator();
  bindCharts();
}

export { showRecommendation };

// Renvoie true si le clic concernait la démo.
export function handleDemoClick(target) {
  const { project, rec, action, scenario } = target.dataset;
  if (project) { showProject(project); return true; }
  if (rec) { showRecommendation(rec); return true; }
  if (scenario) {
    Object.assign(state, SCENARIOS[scenario]);
    rerender();
    return true;
  }
  switch (action) {
    case 'export': exportFocus(); return true;
    case 'export-allocation': exportAllocation(); return true;
    case 'export-chargeback': exportAllocation(true); return true;
    case 'export-decisions': exportDecisions(); return true;
    case 'reset': resetDemo(); return true;
    case 'assign':
      state.owners['sandbox-experiments'] = $('#assign-owner').value;
      persist();
      rerender();
      toast(`Sandbox R&D est attribué à ${state.owners['sandbox-experiments']}. La répartition a été recalculée.`);
      return true;
    default:
      return false;
  }
}
