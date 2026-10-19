// État de l'application, persistance de session et données dérivées de la démo.

import { projects, rows, recommendations, teams, sum } from './data.js';
import { dataLabel } from './i18n.js';

// Libellés bilingues {fr, en} : utiliser pick() pour les afficher.
export const MONTHS = {
  8: {
    days: 31,
    key: '2026-08',
    label: { fr: 'Août 2026', en: 'August 2026' },
    axis: { fr: 'août', en: 'Aug.' },
    name: { fr: 'août', en: 'August' },
    range: { fr: 'août 2026', en: 'August 2026' },
    cutoff: { fr: '31 août 2026', en: 'August 31, 2026' },
  },
  9: {
    days: 15,
    key: '2026-09',
    label: { fr: '1er–15 septembre 2026', en: 'September 1–15, 2026' },
    axis: { fr: 'sept.', en: 'Sept.' },
    name: { fr: 'septembre', en: 'September' },
    range: { fr: 'du 1er au 15 septembre 2026', en: 'from September 1 to 15, 2026' },
    cutoff: { fr: '15 septembre 2026', en: 'September 15, 2026' },
  },
};

export const DEFAULTS = { month: 9, team: 'all', recFilter: 'all', method: 'usage', base: 18000, usage: 85, commit: 65, discount: 28 };

export const state = {
  section: 'demo',
  view: 'overview',
  detail: null,
  ...DEFAULTS,
  owners: {},
  statuses: {},
  decisions: [],
};

export const STATUS = {
  candidate: { fr: 'À qualifier', en: 'To qualify' },
  approved: { fr: 'Validée', en: 'Approved' },
  implemented: { fr: 'Déployée, gain à mesurer', en: 'Deployed, saving to measure' },
  rejected: { fr: 'Écartée', en: 'Dropped' },
};

export const DECISION_DONE = {
  candidate: { fr: 'Piste remise à qualifier', en: 'Lead sent back for qualification' },
  approved: { fr: 'Piste validée', en: 'Lead approved' },
  implemented: { fr: 'Piste marquée comme déployée', en: 'Lead marked as deployed' },
  rejected: { fr: 'Piste écartée', en: 'Lead dropped' },
};

const STORAGE_KEY = 'stratus-demo-v1';

export function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      owners: state.owners, statuses: state.statuses, decisions: state.decisions, method: state.method,
    }));
  } catch { /* stockage indisponible : la démo reste utilisable */ }
}

export function restore() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved) return;
    const knownRec = (id) => recommendations.some((r) => r.id === id);
    state.owners = Object.fromEntries(Object.entries(saved.owners || {})
      .filter(([id, team]) => id === 'sandbox-experiments' && teams.includes(team)));
    state.statuses = Object.fromEntries(Object.entries(saved.statuses || {})
      .filter(([id, status]) => knownRec(id) && status in STATUS));
    state.decisions = (saved.decisions || [])
      .filter((d) => knownRec(d.id) && d.status in STATUS && typeof d.note === 'string')
      .slice(-100);
    state.method = saved.method === 'equal' ? 'equal' : 'usage';
  } catch { /* session corrompue : on repart du scénario initial */ }
}

// Les vues demandent un nouveau rendu sans dépendre du routeur.
let renderer = () => {};
export const setRenderer = (fn) => { renderer = fn; };
export const rerender = () => renderer();

export const projectById = Object.fromEntries(projects.map((p) => [p.id, p]));
export const ownerOf = (projectId) => state.owners[projectId] || projectById[projectId].team;
export const inTeam = (projectId) => state.team === 'all' || ownerOf(projectId) === state.team;
// Libellés affichés : les valeurs d'origine (tags, clés de filtre, CSV) ne changent pas.
export const teamLabel = (team) => dataLabel('team', team);
export const projectLabel = (projectId) => dataLabel('project', projectId);
export const envLabel = (env) => dataLabel('env', env);
export const statusOf = (id) => state.statuses[id] || 'candidate';
export const periodRows = () => rows.filter((r) => r.month === state.month && inTeam(r.project));
export const teamRecommendations = () => recommendations.filter((r) => inTeam(r.project));

export function totals(input) {
  const { days } = MONTHS[state.month];
  const total = sum(input, (r) => r.cost);
  const lastWeek = sum(input.filter((r) => r.day > days - 7), (r) => r.cost);
  const forecast = state.month === 9 ? total + Math.round(lastWeek / 7 * 15) : total;
  const budget = sum(projects.filter((p) => inTeam(p.id)), (p) => p.budget) * 100;
  const previous = sum(rows.filter((r) => r.month === 8 && r.day <= 15 && inTeam(r.project)), (r) => r.cost);
  return { total, forecast, budget, delta: previous ? (total / previous - 1) * 100 : 0 };
}
