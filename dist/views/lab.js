// Labo SQL : bibliothèque et favoris à gauche, éditeur, exécution et résultats à droite.

import { snippets, snippetById } from '../content/snippets.js';
import { focusRows } from '../data.js';
import { toFocusCsv, CORE_COLUMNS, FOCUS_VERSION } from '../focus.js';
import { GENERATOR, GENERATOR_DEFAULTS, generateSql, loadEngine, runQuery, importFocusFile, restoreDemoTable } from '../sql.js';
import { state, rerender } from '../state.js';
import { $, esc, rich, icon, pageHead, selectField, toast, download, copyText, capabilityLink } from '../ui.js';

const FAVORITES_KEY = 'stratus-lab-favoris-v1';

const lab = {
  dialect: 'duckdb',
  filter: '',
  generator: { ...GENERATOR_DEFAULTS },
  drafts: {},
  engine: 'idle',
  source: { kind: 'demo', name: 'Démo Stratus', rows: focusRows.length },
  output: null,
  runNext: false,
  saving: false,
};

/* ---------- Favoris (navigateur local) ---------- */

function loadFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || 'null');
    return {
      starred: (saved?.starred || []).filter((id) => snippetById[id]),
      saved: (saved?.saved || []).filter((f) => f && typeof f.title === 'string' && typeof f.duckdb === 'string'),
    };
  } catch {
    return { starred: [], saved: [] };
  }
}

let favorites = loadFavorites();

function storeFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    toast('Favoris non enregistrés : le stockage du navigateur est indisponible.');
  }
}

/* ---------- Sélection courante ---------- */

function current() {
  const id = state.detail || 'data-quality';
  if (id === 'generator') {
    return {
      key: 'generator',
      title: 'Générateur de requête',
      question: 'Composer une agrégation FOCUS sans écrire de SQL.',
      duckdb: generateSql(lab.generator, 'duckdb'),
      bigquery: generateSql(lab.generator, 'bigquery'),
      reading: 'EffectiveCost pour piloter et allouer, BilledCost pour rapprocher la facture. Le SQL généré peut être modifié puis enregistré en favori.',
    };
  }
  const saved = favorites.saved.find((f) => f.id === id);
  if (saved) return { key: saved.id, custom: true, ...saved, question: 'Requête enregistrée dans ce navigateur.' };
  const snippet = snippetById[id] || snippets[0];
  return { key: snippet.id, ...snippet };
}

const sqlOf = (item, dialect = lab.dialect) => lab.drafts[`${item.key}:${dialect}`] ?? item[dialect] ?? '';

export const requestRun = () => { lab.runNext = true; };

/* ---------- Rendu ---------- */

function sourceBar() {
  const loading = lab.engine === 'loading';
  return `
    <div class="lab-source" id="lab-source">
      <p>
        <span class="source-label">Données interrogées</span>
        <strong>${esc(lab.source.name)}</strong>
        <span>${lab.source.kind === 'demo' ? `FOCUS ${FOCUS_VERSION}, ` : ''}${lab.source.rows.toLocaleString('fr-FR')} lignes, table <code>focus</code></span>
      </p>
      <div class="source-actions">
        <label class="btn btn-small file-button ${loading ? 'is-disabled' : ''}">
          ${icon('upload')}Charger un fichier FOCUS
          <input id="lab-file" type="file" accept=".csv,.parquet" class="sr-only" ${loading ? 'disabled' : ''}>
        </label>
        ${lab.source.kind === 'file' ? '<button class="btn btn-small" data-lab="demo">Revenir à la démo</button>' : ''}
        <button class="btn btn-small" data-lab="download-demo">${icon('download')}Télécharger la démo</button>
      </div>
      ${lab.source.missing?.length ? `<p class="source-warning">${icon('alert')}Colonnes FOCUS absentes du fichier : ${lab.source.missing.map((c) => `<code>${c}</code>`).join(', ')}. Les requêtes qui les utilisent échoueront.</p>` : ''}
      <p class="source-note">Le fichier est lu dans ce navigateur par DuckDB-WASM : aucune donnée n’est envoyée.</p>
    </div>`;
}

function libraryItem(id, title, subtitle, active) {
  return `
    <li>
      <a class="master-item" href="#lab/${id}" data-nav="lab/${id}" ${active ? 'aria-current="true"' : ''}>
        <strong>${esc(title)}</strong>
        ${subtitle ? `<span>${esc(subtitle)}</span>` : ''}
      </a>
    </li>`;
}

function library(item) {
  const words = lab.filter.toLowerCase().split(/\s+/).filter(Boolean);
  const visible = snippets.filter((s) => words.every((w) => `${s.title} ${s.question} ${s.capability} ${s.duckdb}`.toLowerCase().includes(w)));
  const groups = [...new Set(visible.map((s) => s.capability))];
  const starred = favorites.starred.map((id) => snippetById[id]);

  const picker = `
    <label class="field compact-picker">
      <span class="field-label">Requête</span>
      <select id="lab-picker">
        <option value="generator" ${item.key === 'generator' ? 'selected' : ''}>Générateur de requête</option>
        ${favorites.saved.length ? `<optgroup label="Mes requêtes">${favorites.saved.map((f) => `<option value="${esc(f.id)}" ${item.key === f.id ? 'selected' : ''}>${esc(f.title)}</option>`).join('')}</optgroup>` : ''}
        ${[...new Set(snippets.map((s) => s.capability))].map((g) => `
          <optgroup label="${esc(g)}">
            ${snippets.filter((s) => s.capability === g).map((s) => `<option value="${s.id}" ${item.key === s.id ? 'selected' : ''}>${favorites.starred.includes(s.id) ? '★ ' : ''}${esc(s.title)}</option>`).join('')}
          </optgroup>`).join('')}
      </select>
    </label>`;

  return picker + `
    <nav class="master lab-library" aria-label="Bibliothèque de requêtes">
      <label class="field">
        <span class="field-label">Filtrer les requêtes</span>
        <input id="lab-filter" type="search" value="${esc(lab.filter)}" placeholder="Ex. engagement, Tags, BigQuery" autocomplete="off">
      </label>
      <ul class="master-list">
        ${libraryItem('generator', 'Générateur de requête', 'Mesure, regroupement, période', item.key === 'generator')}
      </ul>
      <h2 class="master-heading">Mes favoris</h2>
      ${starred.length || favorites.saved.length ? `<ul class="master-list">
        ${starred.map((s) => libraryItem(s.id, s.title, s.capability, item.key === s.id)).join('')}
        ${favorites.saved.map((f) => libraryItem(f.id, f.title, 'Requête enregistrée', item.key === f.id)).join('')}
      </ul>` : '<p class="empty empty-small">Ajoutez une étoile à une requête ou enregistrez la vôtre.</p>'}
      ${groups.map((g) => `
        <h2 class="master-heading">${esc(g)}</h2>
        <ul class="master-list">
          ${visible.filter((s) => s.capability === g).map((s) => libraryItem(s.id, s.title, '', item.key === s.id)).join('')}
        </ul>`).join('')}
      ${visible.length ? '' : '<p class="empty empty-small">Aucune requête ne correspond au filtre.</p>'}
    </nav>`;
}

function generatorForm() {
  const g = lab.generator;
  return `
    <div class="generator">
      ${selectField('gen-measure', 'Mesure', GENERATOR.measures, g.measure)}
      ${selectField('gen-dimension', 'Regrouper par', GENERATOR.dimensions, g.dimension)}
      ${selectField('gen-dimension2', 'Puis par', [['none', 'Aucun'], ...GENERATOR.dimensions], g.dimension2)}
      ${selectField('gen-period', 'Période', GENERATOR.periods, g.period)}
      ${selectField('gen-charge', 'Charges', GENERATOR.charges, g.charge)}
      ${selectField('gen-limit', 'Lignes', GENERATOR.limits.map((n) => [n, `${n} lignes`]), g.limit)}
    </div>`;
}

function editor(item) {
  const starred = favorites.starred.includes(item.key);
  const edited = lab.drafts[`${item.key}:${lab.dialect}`] !== undefined;
  const runnable = lab.dialect === 'duckdb';
  return `
    <section class="lab-main" aria-labelledby="lab-title">
      <div class="lab-head">
        <div>
          <h2 id="lab-title">${esc(item.title)}</h2>
          <p class="lab-question">${esc(item.question)}</p>
          ${item.capability ? `<p class="capabilities">Capacité FinOps : ${capabilityLink(item.capability)}</p>` : ''}
        </div>
        ${item.custom
          ? `<button class="btn btn-small" data-lab="delete-favorite">Supprimer ce favori</button>`
          : item.key !== 'generator' ? `<button class="btn btn-small star-button" data-lab="star" aria-pressed="${starred}">${icon('star')}${starred ? 'Dans mes favoris' : 'Ajouter aux favoris'}</button>` : ''}
      </div>

      ${item.key === 'generator' ? generatorForm() : ''}

      <div class="segmented" role="radiogroup" aria-label="Dialecte SQL">
        <button role="radio" aria-checked="${lab.dialect === 'duckdb'}" data-dialect="duckdb">DuckDB, FOCUS standard</button>
        <button role="radio" aria-checked="${lab.dialect === 'bigquery'}" data-dialect="bigquery">BigQuery, export Google Cloud</button>
      </div>
      <p class="dialect-note">${lab.dialect === 'duckdb'
        ? 'S’exécute ici sur la table <code>focus</code>, et tel quel avec DuckDB sur un export FOCUS AWS, Azure ou la démo.'
        : rich(item.bigqueryNote || 'À lancer dans la console BigQuery du client, sur la table de l’export FOCUS Google Cloud.')}</p>

      <label class="sr-only" for="lab-sql">Requête SQL</label>
      <textarea id="lab-sql" class="sql-editor" spellcheck="false" autocapitalize="off" autocomplete="off" rows="${Math.min(26, Math.max(8, sqlOf(item).split('\n').length + 1))}">${esc(sqlOf(item))}</textarea>

      <div class="lab-actions">
        ${runnable ? `<button class="btn btn-primary" data-lab="run" ${lab.engine === 'loading' ? 'disabled' : ''}>${icon('play')}Exécuter</button><span class="shortcut">Ctrl ou ⌘ + Entrée</span>` : ''}
        <button class="btn" data-lab="copy">${icon('copy')}Copier</button>
        <button class="btn" data-lab="save">Enregistrer comme favori</button>
        ${edited ? '<button class="btn" data-lab="revert">Rétablir la requête d’origine</button>' : ''}
      </div>

      ${lab.saving ? `
        <form class="save-form" id="lab-save-form">
          <label class="field field-grow">
            <span class="field-label">Nom du favori</span>
            <input id="lab-save-name" type="text" maxlength="80" required value="${esc(item.custom ? item.title : `${item.title} (ma version)`)}">
          </label>
          <button class="btn btn-primary" type="submit">Enregistrer</button>
          <button class="btn" type="button" data-lab="cancel-save">Annuler</button>
        </form>` : ''}

      <div class="lab-reading">
        <h3>Comment lire le résultat</h3>
        <p>${rich(item.reading)}</p>
      </div>

      <div id="lab-results" class="lab-results" aria-live="polite">${results()}</div>
    </section>`;
}

const formatValue = (value, numeric) => {
  if (value === null || value === undefined) return '<span class="null">null</span>';
  if (numeric && typeof value === 'number') return value.toLocaleString('fr-FR', Number.isInteger(value) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  return esc(value);
};

function results() {
  const o = lab.output;
  if (lab.engine === 'loading') return '<p class="lab-status">Chargement du moteur SQL DuckDB-WASM (environ 7 Mo, une seule fois)…</p>';
  if (!o) return lab.dialect === 'duckdb' ? '<p class="lab-status">Exécutez la requête pour voir le résultat ici.</p>' : '';
  if (o.error) {
    return `
      <div class="notice notice-critical">
        ${icon('alert')}
        <p><strong>${o.engineError ? 'Le moteur SQL n’a pas pu être chargé.' : 'La requête a échoué.'}</strong> ${esc(o.error)}</p>
      </div>
      ${o.engineError ? '<p class="lab-status">Vérifiez l’accès à cdn.jsdelivr.net. La requête reste copiable pour DuckDB ou BigQuery.</p>' : ''}`;
  }
  return `
    <div class="results-head">
      <p class="lab-status">${o.total.toLocaleString('fr-FR')} ligne${o.total > 1 ? 's' : ''} en ${o.ms} ms${o.total > o.rows.length ? `, ${o.rows.length} affichées` : ''}</p>
      ${o.rows.length ? '<button class="btn btn-small" data-lab="export-result">' + icon('download') + 'Exporter le résultat</button>' : ''}
    </div>
    ${o.rows.length ? `
    <div class="table-wrap results-table">
      <table>
        <thead><tr>${o.columns.map((c) => `<th scope="col" class="${c.numeric ? 'num' : ''}"><code>${esc(c.name)}</code></th>`).join('')}</tr></thead>
        <tbody>${o.rows.map((row) => `<tr>${row.map((v, i) => `<td class="${o.columns[i].numeric ? 'num' : ''}">${formatValue(v, o.columns[i].numeric)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>` : '<p class="empty">La requête ne renvoie aucune ligne.</p>'}`;
}

export function renderLab() {
  const item = current();
  if (lab.lastKey !== item.key) {
    lab.output = null;
    lab.saving = false;
    lab.lastKey = item.key;
  }
  return pageHead(
    'Labo SQL',
    'Requêtes FOCUS prêtes à l’emploi : exécutez-les ici sur la démo ou sur un export local, copiez-les pour BigQuery.',
  ) + sourceBar() + `<div class="master-detail lab">${library(item)}${editor(item)}</div>`;
}

/* ---------- Actions ---------- */

const message = (error) => String(error?.message || error);

// Charge le moteur au premier usage ; renvoie false s'il est inaccessible.
async function ensureEngine() {
  if (lab.engine === 'ready') return true;
  lab.engine = 'loading';
  rerender();
  try {
    await loadEngine();
    lab.engine = 'ready';
    return true;
  } catch (error) {
    lab.engine = 'idle';
    lab.output = { error: message(error), engineError: true };
    rerender();
    return false;
  }
}

async function run() {
  const sql = $('#lab-sql')?.value ?? sqlOf(current(), 'duckdb');
  if (!(await ensureEngine())) return;
  try {
    lab.output = await runQuery(sql);
  } catch (error) {
    lab.output = { error: message(error) };
  }
  rerender();
}

function exportResult() {
  const o = lab.output;
  const cell = (v) => (v === null || v === undefined ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v));
  const csv = [o.columns.map((c) => c.name), ...o.rows].map((r) => r.map(cell).join(',')).join('\n');
  download(`stratus-${current().key}.csv`, csv);
}

async function loadFile(file) {
  if (!file || !(await ensureEngine())) return;
  try {
    const imported = await importFocusFile(file);
    const lower = imported.columns.map((c) => c.toLowerCase());
    lab.source = {
      kind: 'file',
      name: imported.name,
      rows: imported.rows,
      missing: CORE_COLUMNS.filter((c) => !lower.includes(c.toLowerCase())),
    };
    lab.output = null;
    toast(`${imported.rows.toLocaleString('fr-FR')} lignes chargées depuis ${imported.name}.`);
  } catch (error) {
    toast(`Import impossible : ${message(error)}`);
  }
  rerender();
}

export function bindLab() {
  const item = current();
  const editorEl = $('#lab-sql');
  editorEl?.addEventListener('input', () => {
    lab.drafts[`${item.key}:${lab.dialect}`] = editorEl.value;
  });
  editorEl?.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && lab.dialect === 'duckdb') {
      e.preventDefault();
      run();
    }
  });

  const filter = $('#lab-filter');
  filter?.addEventListener('input', () => { lab.filter = filter.value; rerender(); });

  $('#lab-file')?.addEventListener('change', (e) => loadFile(e.target.files[0]));
  $('#lab-picker')?.addEventListener('change', (e) => { location.hash = `lab/${e.target.value}`; });

  for (const [id, key] of [['gen-measure', 'measure'], ['gen-dimension', 'dimension'], ['gen-dimension2', 'dimension2'], ['gen-period', 'period'], ['gen-charge', 'charge'], ['gen-limit', 'limit']]) {
    $(`#${id}`)?.addEventListener('change', (e) => {
      lab.generator[key] = key === 'limit' ? Number(e.target.value) : e.target.value;
      delete lab.drafts['generator:duckdb'];
      delete lab.drafts['generator:bigquery'];
      lab.output = null;
      rerender();
    });
  }

  $('#lab-save-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('#lab-save-name').value.trim();
    if (!title) return;
    const favorite = {
      id: item.custom ? item.key : `fav-${Date.now()}`,
      title,
      duckdb: sqlOf(item, 'duckdb'),
      bigquery: sqlOf(item, 'bigquery'),
      savedAt: new Date().toISOString(),
    };
    favorites.saved = [...favorites.saved.filter((f) => f.id !== favorite.id), favorite];
    storeFavorites();
    lab.saving = false;
    delete lab.drafts[`${item.key}:duckdb`];
    delete lab.drafts[`${item.key}:bigquery`];
    toast(`Favori « ${title} » enregistré dans ce navigateur.`);
    location.hash = `lab/${favorite.id}`;
  });

  if (lab.runNext) {
    lab.runNext = false;
    if (lab.dialect === 'duckdb') run();
  }
}

// Renvoie true si le clic concernait le Labo.
export function handleLabClick(target) {
  if (target.dataset.dialect) {
    lab.dialect = target.dataset.dialect;
    rerender();
    return true;
  }
  const action = target.dataset.lab;
  if (!action) return false;
  const item = current();

  switch (action) {
    case 'run':
      run();
      break;
    case 'copy':
      copyText($('#lab-sql').value).then((ok) => toast(ok ? 'Requête copiée.' : 'Copie impossible : sélectionnez le texte manuellement.'));
      break;
    case 'star':
      favorites.starred = favorites.starred.includes(item.key)
        ? favorites.starred.filter((id) => id !== item.key)
        : [...favorites.starred, item.key];
      storeFavorites();
      rerender();
      break;
    case 'save':
      lab.saving = true;
      rerender();
      $('#lab-save-name')?.select();
      break;
    case 'cancel-save':
      lab.saving = false;
      rerender();
      break;
    case 'revert':
      delete lab.drafts[`${item.key}:${lab.dialect}`];
      rerender();
      break;
    case 'delete-favorite':
      favorites.saved = favorites.saved.filter((f) => f.id !== item.key);
      storeFavorites();
      toast(`Favori « ${item.title} » supprimé.`);
      location.hash = 'lab/generator';
      break;
    case 'export-result':
      exportResult();
      break;
    case 'download-demo':
      download(`stratus-demo-focus-${FOCUS_VERSION}.csv`, toFocusCsv(focusRows));
      toast('Démo exportée au format FOCUS : rechargeable ici ou dans DuckDB.');
      break;
    case 'demo':
      restoreDemoTable().then(() => {
        lab.source = { kind: 'demo', name: 'Démo Stratus', rows: focusRows.length };
        lab.output = null;
        rerender();
        toast('Retour aux données de démonstration.');
      });
      break;
  }
  return true;
}
