// Jeu de données synthétique au format FOCUS 1.2 et règles de calcul de la démo.
// Tous les montants sont en centimes entiers dans le code, pour que les totaux se rapprochent au centime.
// Ils sont convertis en euros décimaux à l'export CSV (voir focus.js).

export const teams = ['Data & IA', 'Services numériques', 'Infrastructure', 'Innovation'];

// Valeur du tag `team` pour chaque équipe.
export const TEAM_TAGS = {
  'Data & IA': 'data-ia',
  'Services numériques': 'services-numeriques',
  'Infrastructure': 'infrastructure',
  'Innovation': 'innovation',
  'Partagé': 'shared',
};

export const projects = [
  { id: 'atlas-analytics-prod', name: 'Atlas Analytics', team: 'Data & IA', env: 'Production', region: 'europe-west9', base: 1330, budget: 39500, services: [['BigQuery', .74], ['Cloud Storage', .16], ['Compute Engine', .10]] },
  { id: 'orion-platform-prod', name: 'Orion Platform', team: 'Services numériques', env: 'Production', region: 'europe-west9', base: 1060, budget: 32000, services: [['Kubernetes Engine', .60], ['Cloud SQL', .27], ['Cloud Storage', .13], ['Networking', .06]] },
  { id: 'nova-ml-prod', name: 'Nova Intelligence', team: 'Data & IA', env: 'Production', region: 'europe-west1', base: 820, budget: 27000, services: [['Vertex AI', .68], ['BigQuery', .22], ['Cloud Storage', .10]], growth: { 'Cloud Storage': .012 } },
  { id: 'helios-api-prod', name: 'Helios Services', team: 'Services numériques', env: 'Production', region: 'europe-west9', base: 620, budget: 18000, services: [['Compute Engine', .52], ['Cloud SQL', .33], ['Cloud Storage', .15]] },
  { id: 'core-network-shared', name: 'Socle partagé', team: 'Partagé', env: 'Production', region: 'europe-west9', base: 480, budget: 14500, services: [['Compute Engine', .68], ['Cloud Storage', .32]] },
  { id: 'orion-staging', name: 'Orion Préproduction', team: 'Infrastructure', env: 'Préproduction', region: 'europe-west9', base: 390, budget: 11000, services: [['Kubernetes Engine', .74], ['Cloud SQL', .26]] },
  { id: 'lab-innovation-dev', name: 'Innovation Lab', team: 'Innovation', env: 'Développement', region: 'europe-west1', base: 330, budget: 9500, services: [['Vertex AI', .45], ['Compute Engine', .35], ['BigQuery', .20]] },
  { id: 'sandbox-experiments', name: 'Sandbox R&D', team: null, env: 'Développement', region: 'europe-west1', base: 240, budget: 7000, services: [['Compute Engine', .55], ['Cloud Storage', .45]] },
];

export const sum = (xs, fn = (x) => x) => xs.reduce((s, x) => s + fn(x), 0);

const projectById = Object.fromEntries(projects.map((p) => [p.id, p]));

export const BILLING_ACCOUNT = { id: '01A2B3-C4D5E6-F7A8B9', name: 'Organisation de démonstration' };

const REGION_NAMES = { 'europe-west9': 'Paris', 'europe-west1': 'Belgium' };

const ENV_TAGS = { 'Production': 'production', 'Préproduction': 'staging', 'Développement': 'development' };

// Catalogue des services : classification FOCUS, unité de consommation et prix unitaire fictif.
export const SERVICES = {
  'BigQuery': { category: 'Databases', subcategory: 'Data Warehouses', unit: 'TiB', unitPrice: 6, resourceType: 'Dataset', resource: (p) => `projects/${p.id}/datasets/warehouse` },
  'Compute Engine': { category: 'Compute', subcategory: 'Virtual Machines', unit: 'vCPU-Hours', unitPrice: 0.035, resourceType: 'Instance group', resource: (p) => `projects/${p.id}/zones/${p.region}-b/instanceGroups/workers` },
  'Kubernetes Engine': { category: 'Compute', subcategory: 'Containers', unit: 'vCPU-Hours', unitPrice: 0.035, resourceType: 'Cluster', resource: (p) => `projects/${p.id}/locations/${p.region}/clusters/main` },
  'Cloud Storage': { category: 'Storage', subcategory: 'Object Storage', unit: 'GiB-Hours', unitPrice: 0.00003, resourceType: 'Bucket', resource: (p) => `projects/_/buckets/${p.id}-data` },
  'Cloud SQL': { category: 'Databases', subcategory: 'Relational Databases', unit: 'vCPU-Hours', unitPrice: 0.05, resourceType: 'Database instance', resource: (p) => `projects/${p.id}/instances/main-sql` },
  'Vertex AI': { category: 'AI and Machine Learning', subcategory: 'AI Platforms', unit: 'Node-Hours', unitPrice: 0.9, resourceType: 'Endpoint', resource: (p) => `projects/${p.id}/locations/${p.region}/endpoints/models` },
  'Networking': { category: 'Networking', subcategory: 'Network Connectivity', unit: 'GiB', unitPrice: 0.08, resourceType: 'Load balancer', resource: (p) => `projects/${p.id}/global/forwardingRules/public-lb`, description: 'Internet egress from Paris' },
};

// Engagement flexible (Spend) : 1 900 € d'équivalent à la demande couverts chaque jour, avec 28 % de remise.
// Il est acheté par le socle partagé et s'applique à Compute Engine et Kubernetes Engine dans tous les projets.
export const COMMITMENT = {
  id: `billingAccounts/${BILLING_ACCOUNT.id}/commitments/cud-flex-compute-1y`,
  name: 'Flexible Compute CUD, 1 year',
  type: 'Committed Use Discount (flexible)',
  category: 'Spend',
  coverage: 1900,
  discount: 0.28,
  owner: 'core-network-shared',
  services: ['Compute Engine', 'Kubernetes Engine'],
};

export const CREDIT_RATE = 0.02;

// Surconsommation BigQuery injectée sur Atlas Analytics du 11 au 15 septembre (en euros).
const BIGQUERY_DRIFT = [1920, 1740, 1490, 1810, 1660];

const pad = (n) => String(n).padStart(2, '0');
const nextDay = (date) => new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
const round3 = (n) => Math.round(n * 1000) / 1000;

function tagsOf(project) {
  const tags = {};
  if (project.team) tags.team = TEAM_TAGS[project.team];
  tags.env = ENV_TAGS[project.env];
  tags.app = project.id.split('-')[0];
  return JSON.stringify(tags);
}

function commitmentColumns(status) {
  return {
    CommitmentDiscountId: COMMITMENT.id,
    CommitmentDiscountName: COMMITMENT.name,
    CommitmentDiscountType: COMMITMENT.type,
    CommitmentDiscountCategory: COMMITMENT.category,
    CommitmentDiscountStatus: status,
  };
}

const NO_COMMITMENT = {
  CommitmentDiscountId: null,
  CommitmentDiscountName: null,
  CommitmentDiscountType: null,
  CommitmentDiscountCategory: null,
  CommitmentDiscountStatus: null,
};

// Colonnes communes à toutes les lignes d'un jour. `date`, `month` et `day` sont des champs internes, hors FOCUS.
function period(month, date) {
  return {
    date,
    month,
    day: Number(date.slice(8)),
    BillingAccountId: BILLING_ACCOUNT.id,
    BillingAccountName: BILLING_ACCOUNT.name,
    BillingCurrency: 'EUR',
    BillingPeriodStart: `2026-${pad(month)}-01T00:00:00Z`,
    BillingPeriodEnd: `2026-${pad(month + 1)}-01T00:00:00Z`,
    ChargePeriodStart: `${date}T00:00:00Z`,
    ChargePeriodEnd: `${nextDay(date)}T00:00:00Z`,
    ChargeClass: null,
    ProviderName: 'Google Cloud',
    PublisherName: 'Google Cloud',
    InvoiceIssuerName: 'Google Cloud',
  };
}

function serviceColumns(project, serviceName) {
  const service = SERVICES[serviceName];
  return {
    ServiceName: serviceName,
    ServiceCategory: service.category,
    ServiceSubcategory: service.subcategory,
    SubAccountId: project.id,
    SubAccountName: project.name,
    RegionId: project.region,
    RegionName: REGION_NAMES[project.region],
    ResourceId: service.resource(project),
    ResourceName: service.resource(project).split('/').pop(),
    ResourceType: service.resourceType,
    Tags: tagsOf(project),
  };
}

// Ligne d'usage : à la demande (`standard`) ou couverte par l'engagement (`used`).
function usageRow(base, project, serviceName, amount, kind) {
  const service = SERVICES[serviceName];
  const used = kind === 'used';
  return {
    ...base,
    ChargeCategory: 'Usage',
    ChargeDescription: used ? `${serviceName}, usage covered by ${COMMITMENT.name}` : service.description || `${serviceName}, on-demand usage`,
    ChargeFrequency: 'Usage-Based',
    ...serviceColumns(project, serviceName),
    PricingCategory: used ? 'Committed' : 'Standard',
    ConsumedQuantity: round3(amount / 100 / service.unitPrice),
    ConsumedUnit: service.unit,
    ListCost: amount,
    ContractedCost: amount,
    BilledCost: used ? 0 : amount,
    EffectiveCost: used ? Math.round(amount * (1 - COMMITMENT.discount)) : amount,
    ...(used ? commitmentColumns('Used') : NO_COMMITMENT),
  };
}

// Crédit : les quatre coûts sont égaux, comme l'exige FOCUS pour une charge indépendante.
function creditRow(base, project, serviceName, amount) {
  return {
    ...base,
    ChargeCategory: 'Credit',
    ChargeDescription: 'Partner promotional credit (2%)',
    ChargeFrequency: 'Usage-Based',
    ...serviceColumns(project, serviceName),
    PricingCategory: null,
    ConsumedQuantity: null,
    ConsumedUnit: null,
    ListCost: amount,
    ContractedCost: amount,
    BilledCost: amount,
    EffectiveCost: amount,
    ...NO_COMMITMENT,
  };
}

// Frais de l'engagement (Purchase) et part inutilisée (Usage, Unused), portés par le socle partagé.
function commitmentRow(base, kind, amount) {
  const owner = projectById[COMMITMENT.owner];
  const purchase = kind === 'purchase';
  return {
    ...base,
    ChargeCategory: purchase ? 'Purchase' : 'Usage',
    ChargeDescription: purchase ? `Daily fees of the ${COMMITMENT.name}` : `Unused part of the ${COMMITMENT.name}`,
    ChargeFrequency: purchase ? 'Recurring' : 'Usage-Based',
    ...serviceColumns(owner, 'Compute Engine'),
    RegionId: null,
    RegionName: null,
    ResourceId: COMMITMENT.id,
    ResourceName: COMMITMENT.name,
    ResourceType: 'Commitment',
    PricingCategory: purchase ? 'Standard' : 'Committed',
    ConsumedQuantity: null,
    ConsumedUnit: null,
    ListCost: purchase ? amount : 0,
    ContractedCost: purchase ? amount : 0,
    BilledCost: purchase ? amount : 0,
    EffectiveCost: purchase ? 0 : amount,
    ...commitmentColumns(purchase ? null : 'Unused'),
  };
}

// Génère les lignes FOCUS quotidiennes d'août et du 1er au 15 septembre 2026, identiques à chaque appel.
export function buildFocusRows() {
  const out = [];
  let dayIndex = 0;

  for (const month of [8, 9]) {
    const days = month === 9 ? 15 : 31;
    for (let d = 1; d <= days; d++, dayIndex++) {
      const date = `2026-${pad(month)}-${pad(d)}`;
      const base = period(month, date);
      const weekend = [0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay());

      // 1. Consommation du jour au prix à la demande.
      const usage = [];
      projects.forEach((p, i) => {
        const variation = 1 + Math.sin(d * 1.7 + i) * .085;
        const season = month === 9 ? 1.04 : 1;
        const activity = (weekend && p.env !== 'Production') ? .65 : weekend ? .90 : 1;
        p.services.forEach(([service, weight]) => {
          let amount = p.base * weight * variation * season * activity;
          if (p.growth?.[service]) amount *= 1 + p.growth[service] * dayIndex;
          if (month === 9 && p.id === 'atlas-analytics-prod' && service === 'BigQuery' && d >= 11) amount += BIGQUERY_DRIFT[d - 11];
          usage.push({ project: p, service, list: Math.round(amount * 100) });
        });
      });

      // 2. Part couverte par l'engagement, au prorata de la consommation éligible.
      const eligible = usage.filter((u) => COMMITMENT.services.includes(u.service));
      const eligibleTotal = sum(eligible, (u) => u.list);
      const coverage = COMMITMENT.coverage * 100;
      const share = eligibleTotal ? Math.min(1, coverage / eligibleTotal) : 0;
      const fee = Math.round(coverage * (1 - COMMITMENT.discount));

      const usedRows = [];
      for (const u of usage) {
        const covered = COMMITMENT.services.includes(u.service) ? Math.round(u.list * share) : 0;
        const onDemand = u.list - covered;
        if (covered) {
          const row = usageRow(base, u.project, u.service, covered, 'used');
          usedRows.push(row);
          out.push(row);
        }
        if (onDemand) {
          out.push(usageRow(base, u.project, u.service, onDemand, 'standard'));
          const credit = Math.round(onDemand * CREDIT_RATE);
          if (credit) out.push(creditRow(base, u.project, u.service, -credit));
        }
      }

      // 3. Les frais du jour sont répartis entre usage couvert et part inutilisée.
      //    Le reliquat d'arrondi va à la plus grosse ligne couverte quand l'engagement est entièrement consommé.
      out.push(commitmentRow(base, 'purchase', fee));
      const residual = fee - sum(usedRows, (r) => r.EffectiveCost);
      if (share < 1 || residual <= 0) {
        usedRows.reduce((a, b) => (b.EffectiveCost > a.EffectiveCost ? b : a)).EffectiveCost += residual;
      } else {
        out.push(commitmentRow(base, 'unused', residual));
      }
    }
  }
  return out;
}

export const focusRows = buildFocusRows();

// Vue agrégée utilisée par la démo : un coût effectif (amorti) par jour, projet et service.
export function aggregateRows(input) {
  const byKey = new Map();
  for (const r of input) {
    const key = `${r.date}/${r.SubAccountId}/${r.ServiceName}`;
    let row = byKey.get(key);
    if (!row) {
      const p = projectById[r.SubAccountId];
      row = { date: r.date, month: r.month, day: r.day, project: r.SubAccountId, service: r.ServiceName, cost: 0, billed: 0, list: 0, region: p.region, environment: p.env };
      byKey.set(key, row);
    }
    row.cost += r.EffectiveCost;
    row.billed += r.BilledCost;
    if (r.ChargeCategory === 'Usage') row.list += r.ListCost;
  }
  return [...byKey.values()];
}

export const rows = aggregateRows(focusRows);

export const recommendations = [
  {
    id: 'bq-partition', project: 'atlas-analytics-prod', service: 'BigQuery', type: { fr: 'Requêtes', en: 'Queries' },
    title: { fr: 'Réduire les scans du pipeline de télémétrie', en: 'Cut the scans of the telemetry pipeline' },
    description: { fr: 'Une requête récurrente relit tout l’historique depuis le 11 septembre.', en: 'A recurring query has been rereading the whole history since September 11.' },
    saving: 386000, risk: { fr: 'Faible', en: 'Low' }, effort: { fr: '2 jours', en: '2 days' }, owner: { fr: 'Équipe Data', en: 'Data team' },
    evidence: { fr: 'La requête telemetry_daily passe de 0,8 à environ 17 Tio lus par exécution, 18 fois par jour (ConsumedQuantity en TiB, données de démonstration).', en: 'The telemetry_daily query goes from 0.8 to about 17 TiB read per run, 18 times a day (ConsumedQuantity in TiB, demo data).' },
    action: { fr: 'Filtrer la colonne de partition event_date, limiter les colonnes lues et définir maximum_bytes_billed après un dry run.', en: 'Filter on the event_date partition column, limit the columns read, and set maximum_bytes_billed after a dry run.' },
    guardrail: { fr: 'Comparer les résultats sur 7 jours, vérifier les arrivées tardives et la fraîcheur des données. Déployer après validation de l’équipe Data.', en: 'Compare results over 7 days, check late-arriving rows and data freshness. Deploy once the Data team has validated it.' },
    validation: { fr: 'Mesurer les octets facturés et le coût par exécution à volume comparable pendant 7 jours.', en: 'Measure billed bytes and cost per run at comparable volume over 7 days.' },
    before: 'SELECT *\nFROM `atlas.telemetry.events`\nWHERE customer_id IS NOT NULL;',
    after: 'SELECT event_date, customer_id, event_type\nFROM `atlas.telemetry.events`\nWHERE event_date = @processing_date\n  AND customer_id IS NOT NULL;',
    formula: { fr: 'Base optimisable de 6 433 €/mois × 60 % de réduction estimée ≈ 3 860 €/mois. Estimation volontairement distincte du pic ponctuel.', en: 'Optimizable base of €6,433/month × 60% estimated reduction ≈ €3,860/month. Deliberately kept separate from the one-off peak.' },
  },
  {
    id: 'gke-schedule', project: 'orion-staging', service: 'Kubernetes Engine', type: { fr: 'Planification', en: 'Scheduling' },
    title: { fr: 'Planifier l’arrêt de la préproduction', en: 'Schedule the shutdown of staging' },
    description: { fr: 'Les environnements de recette restent actifs en dehors des plages utiles.', en: 'Test environments stay running outside the hours when they are useful.' },
    saving: 224000, risk: { fr: 'Modéré', en: 'Moderate' }, effort: { fr: '3 jours', en: '3 days' }, owner: { fr: 'Équipe Infrastructure', en: 'Infrastructure team' },
    evidence: { fr: 'Le cluster de préproduction fonctionne 168 h/semaine pour une fenêtre d’usage déclarée de 70 h.', en: 'The staging cluster runs 168 h a week for a declared usage window of 70 h.' },
    action: { fr: 'Programmer les workloads et adapter les node pools compatibles ; prévoir un redémarrage avant l’ouverture des équipes.', en: 'Schedule the workloads and adjust the compatible node pools; plan a restart before teams come back online.' },
    guardrail: { fr: 'Exclure les services partagés, valider les dépendances et les batchs nocturnes. Recalculer l’utilisation du CUD flexible : moins d’usage éligible peut laisser une part de l’engagement inutilisée.', en: 'Exclude shared services, check dependencies and overnight batch jobs. Recalculate the flexible CUD usage: less eligible usage can leave part of the commitment unused.' },
    validation: { fr: 'Vérifier la disponibilité à 08 h et comparer les heures facturées avant/après.', en: 'Check availability at 08:00 and compare billed hours before and after.' },
    formula: { fr: '3 840 €/mois de capacité éligible × 98 h / 168 h d’arrêt ≈ 2 240 €/mois. Coûts fixes et stockage exclus.', en: '€3,840/month of eligible capacity × 98 h / 168 h of shutdown ≈ €2,240/month. Fixed costs and storage excluded.' },
  },
  {
    id: 'compute-size', project: 'helios-api-prod', service: 'Compute Engine', type: { fr: 'Rightsizing', en: 'Rightsizing' },
    title: { fr: 'Redimensionner les workers de traitement', en: 'Resize the processing workers' },
    description: { fr: 'Une capacité surdimensionnée sur un groupe de workers sans état.', en: 'Oversized capacity on a stateless group of workers.' },
    saving: 148000, risk: { fr: 'Modéré', en: 'Moderate' }, effort: { fr: '5 jours', en: '5 days' }, owner: { fr: 'Équipe Services numériques', en: 'Digital services team' },
    evidence: { fr: 'CPU P95 à 22 %, mémoire P95 à 39 % sur 14 jours ; les pics de charge restent à vérifier.', en: 'CPU P95 at 22%, memory P95 at 39% over 14 days; peak loads still need to be checked.' },
    action: { fr: 'Tester une taille inférieure sur un worker, puis étendre progressivement après un test de charge.', en: 'Test a smaller size on one worker, then extend it gradually after a load test.' },
    guardrail: { fr: 'Conserver la redondance, les objectifs de latence et un retour arrière immédiat. Ne pas toucher à la base de données.', en: 'Keep redundancy, latency targets and an immediate rollback. Do not touch the database.' },
    validation: { fr: 'Suivre latence P95, erreurs, saturation et coût par tâche pendant une semaine.', en: 'Track P95 latency, errors, saturation and cost per task for one week.' },
    formula: { fr: '2 960 €/mois de workers éligibles × 50 % de baisse de capacité = 1 480 €/mois, sous réserve du test de charge.', en: '€2,960/month of eligible workers × 50% capacity reduction = €1,480/month, subject to the load test.' },
  },
  {
    id: 'storage-lifecycle', project: 'nova-ml-prod', service: 'Cloud Storage', type: { fr: 'Stockage', en: 'Storage' },
    title: { fr: 'Adapter le cycle de vie des jeux de données', en: 'Adjust the lifecycle of the datasets' },
    description: { fr: 'Des jeux d’entraînement historiques restent en stockage Standard et le volume croît chaque jour.', en: 'Historical training datasets stay in Standard storage and the volume grows every day.' },
    saving: 52000, risk: { fr: 'Faible', en: 'Low' }, effort: { fr: '2 jours', en: '2 days' }, owner: { fr: 'Équipe Data', en: 'Data team' },
    evidence: { fr: '65 % des objets de plus de 90 jours n’ont pas été relus dans la fenêtre observée.', en: '65% of objects older than 90 days were not reread in the observed window.' },
    action: { fr: 'Simuler une règle de cycle de vie sur le préfixe des archives et choisir une classe selon les accès réels.', en: 'Simulate a lifecycle rule on the archive prefix and choose a storage class based on actual access.' },
    guardrail: { fr: 'Intégrer les frais de récupération, les durées minimales et les obligations de conservation. Aucune suppression automatique.', en: 'Factor in retrieval fees, minimum storage durations and retention obligations. No automatic deletion.' },
    validation: { fr: 'Suivre le coût net avec frais de récupération sur un mois.', en: 'Track the net cost, including retrieval fees, over one month.' },
    formula: { fr: 'Écart de stockage simulé de 620 €/mois − provision de récupération de 100 €/mois = 520 €/mois.', en: 'Simulated storage saving of €620/month − retrieval provision of €100/month = €520/month.' },
  },
];

// Répartit les coûts par équipe. Le socle « Partagé » est redistribué selon la clé choisie ;
// le reliquat de centimes va aux plus forts restes. Les coûts sans équipe restent visibles.
export function allocation(input, owners = {}, method = 'usage') {
  const direct = Object.fromEntries(teams.map((t) => [t, 0]));
  let shared = 0;
  let unallocated = 0;

  for (const r of input) {
    const p = projectById[r.project];
    const owner = owners[p.id] || p.team;
    if (owner === 'Partagé') shared += r.cost;
    else if (direct[owner] !== undefined) direct[owner] += r.cost;
    else unallocated += r.cost;
  }

  const totalDirect = sum(Object.values(direct));
  const weights = teams.map((t) => method === 'equal' ? 1 : direct[t]);
  const denom = sum(weights);
  const raw = weights.map((w) => denom ? shared * w / denom : 0);
  const shares = raw.map(Math.floor);
  const remainder = denom ? shared - sum(shares) : 0;
  const order = raw.map((v, i) => ({ i, f: v - Math.floor(v) })).sort((a, b) => b.f - a.f);
  for (let n = 0; n < remainder; n++) shares[order[n % order.length].i]++;

  return {
    items: teams.map((team, i) => ({ team, direct: direct[team], shared: shares[i], total: direct[team] + shares[i] })),
    shared,
    unallocated: unallocated + (denom ? 0 : shared),
    total: sum(input, (r) => r.cost),
    totalDirect,
  };
}

// Modèle mensuel simplifié d'un engagement de consommation (CUD), utilisé par le simulateur.
// La part engagée est due même si elle n'est pas consommée.
export function commitment(base, usage, commitment, discount) {
  const actual = base * usage / 100;
  const engaged = base * commitment / 100;
  const fee = engaged * (1 - discount / 100);
  const overflow = Math.max(actual - engaged, 0);
  const cost = fee + overflow;
  return {
    actual, engaged, fee, overflow, cost,
    saving: actual - cost,
    unused: Math.max(engaged - actual, 0) * (1 - discount / 100),
    utilization: engaged ? Math.min(actual / engaged, 1) * 100 : 100,
  };
}
