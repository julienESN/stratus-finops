// Situations terrain : ce qu'un consultant FinOps rencontre en arrivant chez un client.
// Chaque situation relie un symptôme aux requêtes, actions, KPI et capacités du framework.
// Textes bilingues { fr, en } ; identifiants, requêtes, KPI et capacités identiques dans les deux langues.

export const situations = [
  {
    id: 'first-week',
    title: {
      fr: 'Premier jour : on te donne accès à l’export de facturation',
      en: 'Day one: you get access to the billing export',
    },
    context: {
      fr: 'Avant toute recommandation, il faut savoir si les données sont complètes, conformes et rapprochables de la facture.',
      en: 'Before making any recommendation, you need to know whether the data is complete, compliant and reconcilable with the invoice.',
    },
    phase: 'Inform',
    capabilities: ['Data Ingestion', 'FinOps Assessment'],
    personas: ['FinOps Practitioner', 'Finance'],
    signals: [
      {
        fr: 'Personne ne sait quelle version de FOCUS ou quel export alimente les tableaux de bord.',
        en: 'Nobody knows which FOCUS version or which export feeds the dashboards.',
      },
      {
        fr: 'Les totaux du tableau de bord et de la facture ne concordent pas.',
        en: 'Dashboard totals and the invoice do not match.',
      },
      {
        fr: 'Certains projets ou comptes n’apparaissent pas.',
        en: 'Some projects or accounts are missing.',
      },
    ],
    snippets: ['data-quality', 'billed-by-period', 'cost-by-service'],
    actions: [
      {
        fr: 'Contrôler volume, jours couverts, valeurs autorisées et coûts à NULL.',
        en: 'Check row volume, days covered, allowed values and NULL costs.',
      },
      {
        fr: 'Rapprocher BilledCost de la facture d’un mois clôturé.',
        en: 'Reconcile BilledCost with the invoice for a closed month.',
      },
      {
        fr: 'Cartographier la hiérarchie : organisation, dossiers, projets, comptes de facturation.',
        en: 'Map the hierarchy: organization, folders, projects, billing accounts.',
      },
      {
        fr: 'Lister les écarts de conformité de l’export (chez Google Cloud : labels dans x_Labels, CUD dans x_Credits).',
        en: 'List the export’s compliance gaps (on Google Cloud: labels in x_Labels, CUDs in x_Credits).',
      },
    ],
    kpis: ['allocation-rate'],
    pitfall: {
      fr: 'Conclure sur un mois non clôturé ou un export encore en propagation : les données Google Cloud arrivent avec plusieurs heures de retard et les corrections après la clôture.',
      en: 'Drawing conclusions from a month that is not closed, or from an export still settling: Google Cloud data arrives several hours late, and corrections land after close.',
    },
  },
  {
    id: 'bill-spike',
    title: {
      fr: 'La facture a pris 15 % et personne ne sait pourquoi',
      en: 'The bill jumped 15% and nobody knows why',
    },
    context: {
      fr: 'La direction financière demande une explication avant le comité de fin de mois.',
      en: 'Finance wants an explanation before the end-of-month review.',
    },
    phase: 'Inform',
    capabilities: ['Anomaly Management', 'Reporting & Analytics'],
    personas: ['Finance', 'Leadership', 'FinOps Practitioner'],
    signals: [
      {
        fr: 'Hausse visible au niveau du total, sans service ou projet identifié.',
        en: 'The total is up, with no service or project identified.',
      },
      {
        fr: 'Aucune alerte n’a été déclenchée.',
        en: 'No alert fired.',
      },
      {
        fr: 'Les équipes affirment ne rien avoir changé.',
        en: 'The teams say they changed nothing.',
      },
    ],
    snippets: ['cost-by-service', 'daily-anomalies', 'bigquery-scans'],
    actions: [
      {
        fr: 'Décomposer la hausse par service, puis par projet, puis par jour.',
        en: 'Break the increase down by service, then by project, then by day.',
      },
      {
        fr: 'Isoler la date de rupture et la relier à un déploiement ou à une requête.',
        en: 'Pinpoint the break date and link it to a deployment or a query.',
      },
      {
        fr: 'Distinguer effet volume (ConsumedQuantity) et effet prix (coût unitaire).',
        en: 'Separate the volume effect (ConsumedQuantity) from the price effect (unit cost).',
      },
      {
        fr: 'Mettre en place une détection quotidienne avec un propriétaire par alerte.',
        en: 'Set up daily detection, with one owner per alert.',
      },
    ],
    kpis: ['forecast-variance'],
    pitfall: {
      fr: 'Comparer un mois partiel à un mois complet, ou confondre un achat d’engagement (BilledCost) avec une hausse de consommation.',
      en: 'Comparing a partial month with a full one, or mistaking a commitment purchase (BilledCost) for a rise in consumption.',
    },
    demo: 'overview',
  },
  {
    id: 'no-owner',
    title: {
      fr: 'Personne ne veut payer ces coûts',
      en: 'Nobody wants to pay for these costs',
    },
    context: {
      fr: 'Une partie de la facture n’a pas de propriétaire et bloque la refacturation.',
      en: 'Part of the bill has no owner, which blocks chargeback.',
    },
    phase: 'Inform',
    capabilities: ['Allocation'],
    personas: ['FinOps Practitioner', 'Engineering', 'Finance'],
    signals: [
      {
        fr: 'Des projets ou ressources sans tag team.',
        en: 'Projects or resources with no team tag.',
      },
      {
        fr: 'Une ligne « non attribué » qui grossit chaque mois.',
        en: 'An “unallocated” line that grows every month.',
      },
      {
        fr: 'Des coûts partagés comptés à tort comme non alloués.',
        en: 'Shared costs wrongly counted as unallocated.',
      },
    ],
    snippets: ['allocation-rate', 'untagged-cost', 'cost-by-project'],
    actions: [
      {
        fr: 'Définir un socle minimal de tags : team, env, app.',
        en: 'Define a minimum tag set: team, env, app.',
      },
      {
        fr: 'Rattacher par défaut au propriétaire du projet en attendant les tags.',
        en: 'Until tags are in place, default costs to the project owner.',
      },
      {
        fr: 'Documenter la clé de répartition des coûts partagés.',
        en: 'Document the allocation key for shared costs.',
      },
      {
        fr: 'Publier chaque mois le montant non alloué et son évolution.',
        en: 'Publish the unallocated amount and its trend every month.',
      },
    ],
    kpis: ['allocation-rate'],
    pitfall: {
      fr: 'Viser 100 % de ressources taguées au lieu d’allouer par la hiérarchie (projets, comptes) et traiter « shared » comme un coût non alloué.',
      en: 'Aiming for 100% of resources tagged instead of allocating by hierarchy (projects, accounts), and treating “shared” as unallocated cost.',
    },
    demo: 'allocation',
  },
  {
    id: 'unused-commitment',
    title: {
      fr: 'On paie un engagement qu’on n’utilise pas entièrement',
      en: 'We pay for a commitment we don’t fully use',
    },
    context: {
      fr: 'Un CUD, une réservation ou un Savings Plan a été acheté ; son utilisation n’est pas suivie.',
      en: 'A CUD, a reservation or a Savings Plan was bought, and nobody tracks how much of it is used.',
    },
    phase: 'Optimize',
    capabilities: ['Rate Optimization'],
    personas: ['FinOps Practitioner', 'Procurement', 'Finance'],
    signals: [
      {
        fr: 'Des lignes CommitmentDiscountStatus = Unused.',
        en: 'Rows with CommitmentDiscountStatus = Unused.',
      },
      {
        fr: 'Une utilisation qui chute le week-end ou après une optimisation.',
        en: 'Utilization drops on weekends or after an optimization.',
      },
      {
        fr: 'Un engagement dimensionné sur la consommation moyenne.',
        en: 'A commitment sized on average consumption.',
      },
    ],
    snippets: ['commitment-utilization', 'effective-savings-rate', 'billed-vs-effective'],
    actions: [
      {
        fr: 'Mesurer l’utilisation jour par jour, pas seulement au mois.',
        en: 'Measure utilization day by day, not just per month.',
      },
      {
        fr: 'Réorienter des charges éligibles vers la période sous-utilisée quand c’est possible.',
        en: 'Where possible, move eligible workloads into the underused period.',
      },
      {
        fr: 'Au renouvellement, dimensionner sur le socle minimal observé.',
        en: 'At renewal, size the commitment on the observed minimum baseline.',
      },
      {
        fr: 'Suivre l’ESR, qui intègre la part inutilisée.',
        en: 'Track the ESR, which includes the unused share.',
      },
    ],
    kpis: ['commitment-utilization', 'effective-savings-rate'],
    pitfall: {
      fr: 'Arrêter la hors-production ou redimensionner sans recalculer l’engagement : moins de consommation éligible, c’est plus de part inutilisée.',
      en: 'Shutting down non-production, or resizing without recalculating the commitment: less eligible usage means a larger unused share.',
    },
    demo: 'simulate',
  },
  {
    id: 'low-coverage',
    title: {
      fr: 'Tout est à la demande alors que l’usage est stable',
      en: 'Everything is on-demand although usage is steady',
    },
    context: {
      fr: 'Le compute tourne en continu depuis des mois sans aucun engagement.',
      en: 'Compute has been running non-stop for months with no commitment at all.',
    },
    phase: 'Optimize',
    capabilities: ['Rate Optimization', 'Planning & Estimating'],
    personas: ['FinOps Practitioner', 'Procurement', 'Engineering'],
    signals: [
      {
        fr: 'Une couverture faible sur Compute.',
        en: 'Low coverage on Compute.',
      },
      {
        fr: 'Une consommation quotidienne stable sur 30 à 90 jours.',
        en: 'Stable daily consumption over 30 to 90 days.',
      },
      {
        fr: 'Aucun ESR suivi.',
        en: 'No ESR tracked.',
      },
    ],
    snippets: ['commitment-coverage', 'effective-savings-rate', 'non-prod-weekend'],
    actions: [
      {
        fr: 'Mesurer le plancher de consommation éligible, pas la moyenne.',
        en: 'Measure the floor of eligible consumption, not the average.',
      },
      {
        fr: 'Optimiser l’usage avant de s’engager.',
        en: 'Optimize usage before committing.',
      },
      {
        fr: 'Échelonner les achats pour lisser les échéances.',
        en: 'Stagger purchases to smooth out renewal dates.',
      },
      {
        fr: 'Valider durée, type (ressource ou dépense) et périmètre avec les achats et l’engineering.',
        en: 'Agree the term, type (resource or spend) and scope with procurement and engineering.',
      },
    ],
    kpis: ['commitment-coverage', 'effective-savings-rate'],
    pitfall: {
      fr: 'S’engager sur la moyenne au lieu du plancher, ou avant d’avoir optimisé l’usage.',
      en: 'Committing to the average instead of the floor, or before optimizing usage.',
    },
    demo: 'simulate',
  },
  {
    id: 'non-prod-always-on',
    title: {
      fr: 'La préproduction tourne la nuit et le week-end',
      en: 'Staging runs at night and on weekends',
    },
    context: {
      fr: 'Les environnements de test coûtent presque autant que la production.',
      en: 'Test environments cost almost as much as production.',
    },
    phase: 'Optimize',
    capabilities: ['Usage Optimization'],
    personas: ['Engineering', 'FinOps Practitioner'],
    signals: [
      {
        fr: 'Coût du week-end proche de celui de la semaine sur les environnements hors production.',
        en: 'Weekend cost close to weekday cost on non-production environments.',
      },
      {
        fr: 'Pas d’horaires d’usage déclarés.',
        en: 'No declared usage hours.',
      },
      {
        fr: 'Des node pools et instances jamais réduits.',
        en: 'Node pools and instances never scaled down.',
      },
    ],
    snippets: ['non-prod-weekend', 'cost-by-project'],
    actions: [
      {
        fr: 'Recenser les plages d’usage réelles avec les équipes.',
        en: 'List the real usage windows with the teams.',
      },
      {
        fr: 'Planifier l’arrêt ou la mise à zéro des node pools compatibles.',
        en: 'Schedule stop or scale-to-zero for the compatible node pools.',
      },
      {
        fr: 'Prévoir un redémarrage avant l’arrivée des équipes et une procédure d’exception.',
        en: 'Plan a restart before the teams arrive, and an exception procedure.',
      },
      {
        fr: 'Mesurer les heures facturées avant et après.',
        en: 'Measure billed hours before and after.',
      },
    ],
    kpis: ['unit-cost'],
    pitfall: {
      fr: 'Oublier les batchs de nuit, les dépendances partagées et l’effet sur l’utilisation des engagements.',
      en: 'Forgetting night batch jobs, shared dependencies, and the effect on commitment utilization.',
    },
    demo: 'optimise',
  },
  {
    id: 'bigquery-full-scan',
    title: {
      fr: 'Une requête relit toute la table chaque jour',
      en: 'A query rereads the whole table every day',
    },
    context: {
      fr: 'La facture BigQuery d’un projet data a doublé en quelques jours.',
      en: 'The BigQuery bill for a data project doubled in a few days.',
    },
    phase: 'Optimize',
    capabilities: ['Usage Optimization', 'Anomaly Management'],
    personas: ['Engineering', 'FinOps Practitioner'],
    signals: [
      {
        fr: 'Volume analysé (Tio) en forte hausse à coût unitaire constant.',
        en: 'Data scanned (TiB) sharply up at a constant unit cost.',
      },
      {
        fr: 'Une requête planifiée en SELECT *.',
        en: 'A scheduled query running SELECT *.',
      },
      {
        fr: 'Pas de maximum_bytes_billed.',
        en: 'No maximum_bytes_billed.',
      },
    ],
    snippets: ['bigquery-scans', 'daily-anomalies'],
    actions: [
      {
        fr: 'Identifier la requête dans INFORMATION_SCHEMA.JOBS.',
        en: 'Identify the query in INFORMATION_SCHEMA.JOBS.',
      },
      {
        fr: 'Filtrer sur la colonne de partition et limiter les colonnes lues.',
        en: 'Filter on the partition column and limit the columns read.',
      },
      {
        fr: 'Poser maximum_bytes_billed après un dry run.',
        en: 'Set maximum_bytes_billed after a dry run.',
      },
      {
        fr: 'Si la charge est stable et forte, comparer avec une édition à capacité (slots).',
        en: 'If the load is steady and heavy, compare with a capacity-based edition (slots).',
      },
    ],
    kpis: ['unit-cost'],
    pitfall: {
      fr: 'Passer en capacité (slots) pour masquer une requête mal écrite.',
      en: 'Moving to capacity pricing (slots) to hide a poorly written query.',
    },
    demo: 'optimise',
  },
  {
    id: 'storage-growth',
    title: {
      fr: 'Le stockage ne fait que grossir',
      en: 'Storage just keeps growing',
    },
    context: {
      fr: 'Les jeux de données s’accumulent en classe Standard depuis des années.',
      en: 'Datasets have piled up in Standard storage for years.',
    },
    phase: 'Optimize',
    capabilities: ['Usage Optimization', 'Sustainability'],
    personas: ['Engineering', 'FinOps Practitioner'],
    signals: [
      {
        fr: 'Croissance régulière des Gio stockés, sans palier.',
        en: 'Steady growth in stored GiB, with no plateau.',
      },
      {
        fr: 'Aucune règle de cycle de vie.',
        en: 'No lifecycle rule.',
      },
      {
        fr: 'Des objets anciens jamais relus.',
        en: 'Old objects that are never read again.',
      },
    ],
    snippets: ['storage-growth', 'top-resources'],
    actions: [
      {
        fr: 'Analyser les accès réels par préfixe.',
        en: 'Analyze actual access by prefix.',
      },
      {
        fr: 'Simuler des règles de cycle de vie vers des classes plus froides.',
        en: 'Simulate lifecycle rules that move data to colder classes.',
      },
      {
        fr: 'Vérifier les obligations de conservation avec le métier et la conformité.',
        en: 'Check retention obligations with the business and compliance.',
      },
      {
        fr: 'Supprimer les snapshots et copies orphelins après validation.',
        en: 'Delete orphaned snapshots and copies once validated.',
      },
    ],
    kpis: ['unit-cost'],
    pitfall: {
      fr: 'Ignorer les frais de récupération et les durées minimales de stockage des classes froides.',
      en: 'Ignoring retrieval fees and the minimum storage durations of colder classes.',
    },
  },
  {
    id: 'unexpected-egress',
    title: {
      fr: 'Une ligne réseau apparaît sur la facture',
      en: 'A network line shows up on the bill',
    },
    context: {
      fr: 'Un coût d’egress Internet ou inter-régions monte sans que personne ne l’ait prévu.',
      en: 'Internet or inter-region egress costs are climbing, and nobody planned for it.',
    },
    phase: 'Optimize',
    capabilities: ['Architecting & Workload Placement'],
    personas: ['Engineering', 'FinOps Practitioner'],
    signals: [
      {
        fr: 'Un service Networking ou des SKU « egress » en hausse.',
        en: 'A Networking service or “egress” SKUs rising.',
      },
      {
        fr: 'Des données servies depuis une région éloignée des utilisateurs.',
        en: 'Data served from a region far from its users.',
      },
      {
        fr: 'Des échanges entre régions ou entre clouds.',
        en: 'Traffic between regions or between clouds.',
      },
    ],
    snippets: ['network-egress'],
    actions: [
      {
        fr: 'Cartographier les flux : Internet, inter-régions, inter-clouds.',
        en: 'Map the flows: Internet, inter-region, inter-cloud.',
      },
      {
        fr: 'Rapprocher les traitements des données.',
        en: 'Move processing closer to the data.',
      },
      {
        fr: 'Mettre en cache ou utiliser un CDN pour le contenu public.',
        en: 'Cache public content or serve it through a CDN.',
      },
      {
        fr: 'Compresser et réduire les transferts inutiles.',
        en: 'Compress data and cut unnecessary transfers.',
      },
    ],
    kpis: ['unit-cost'],
    pitfall: {
      fr: 'Chercher seulement dans le service Networking : l’egress est souvent facturé sous le service de la ressource.',
      en: 'Looking only in the Networking service: egress is often billed under the resource’s own service.',
    },
  },
  {
    id: 'missed-forecast',
    title: {
      fr: 'Le budget du trimestre est dépassé à mi-parcours',
      en: 'The quarter’s budget is blown by mid-quarter',
    },
    context: {
      fr: 'La prévision annuelle a été faite une fois, sans suivi mensuel.',
      en: 'The annual forecast was built once, with no monthly tracking.',
    },
    phase: 'Operate',
    capabilities: ['Forecasting', 'Budgeting'],
    personas: ['Finance', 'Leadership', 'Product'],
    signals: [
      {
        fr: 'Un réalisé qui s’écarte de la prévision dès le premier mois.',
        en: 'Actuals diverge from the forecast from the first month.',
      },
      {
        fr: 'Pas de revue régulière avec les équipes.',
        en: 'No regular review with the teams.',
      },
      {
        fr: 'Des événements connus (migration, lancement) absents de la prévision.',
        en: 'Known events (migration, launch) missing from the forecast.',
      },
    ],
    snippets: ['forecast-month-end', 'cost-by-project'],
    actions: [
      {
        fr: 'Projeter la fin de mois chaque semaine.',
        en: 'Project the end-of-month spend every week.',
      },
      {
        fr: 'Combiner tendance et événements connus des équipes.',
        en: 'Combine the trend with the events the teams already know about.',
      },
      {
        fr: 'Mettre en place des alertes budgétaires par périmètre.',
        en: 'Set up budget alerts by scope.',
      },
      {
        fr: 'Analyser l’écart chaque mois et documenter les causes.',
        en: 'Analyze the variance every month and document the causes.',
      },
    ],
    kpis: ['forecast-variance'],
    pitfall: {
      fr: 'Prévoir en BilledCost : un achat d’engagement ponctuel crée un pic qui fausse la tendance.',
      en: 'Forecasting on BilledCost: a one-off commitment purchase creates a spike that distorts the trend.',
    },
    demo: 'overview',
  },
  {
    id: 'disputed-chargeback',
    title: {
      fr: 'Une équipe conteste sa refacturation',
      en: 'A team disputes its chargeback',
    },
    context: {
      fr: 'Le chargeback du mois est rejeté : l’équipe estime payer pour les autres.',
      en: 'The monthly chargeback is rejected: the team believes it is paying for the others.',
    },
    phase: 'Operate',
    capabilities: ['Invoicing & Chargeback', 'Allocation'],
    personas: ['Finance', 'Product', 'FinOps Practitioner'],
    signals: [
      {
        fr: 'Clé de répartition des coûts partagés non documentée.',
        en: 'Shared-cost allocation key not documented.',
      },
      {
        fr: 'Refacturation calculée en BilledCost.',
        en: 'Chargeback calculated on BilledCost.',
      },
      {
        fr: 'Écarts inexpliqués entre showback et chargeback.',
        en: 'Unexplained gaps between showback and chargeback.',
      },
    ],
    snippets: ['billed-vs-effective', 'cost-by-project', 'allocation-rate'],
    actions: [
      {
        fr: 'Documenter et faire valider la clé de répartition.',
        en: 'Document the allocation key and get it validated.',
      },
      {
        fr: 'Refacturer en EffectiveCost pour répartir les engagements là où la consommation a lieu.',
        en: 'Charge back on EffectiveCost, so commitments are spread where the consumption happens.',
      },
      {
        fr: 'Publier un showback avant le chargeback et prévoir une période de contestation.',
        en: 'Publish a showback before the chargeback, and allow a dispute period.',
      },
      {
        fr: 'Montrer le rapprochement au centime avec la facture.',
        en: 'Show the reconciliation to the cent against the invoice.',
      },
    ],
    kpis: ['allocation-rate'],
    pitfall: {
      fr: 'Refacturer en BilledCost : le projet qui achète l’engagement paie tout, les autres profitent de la remise.',
      en: 'Charging back on BilledCost: the project that buys the commitment pays for all of it, while the others benefit from the discount.',
    },
    demo: 'allocation',
  },
  {
    id: 'misleading-savings',
    title: {
      fr: 'Les économies annoncées ne se retrouvent pas sur la facture',
      en: 'The announced savings do not show up on the bill',
    },
    context: {
      fr: 'Le rapport d’économies additionne remises, crédits et optimisations.',
      en: 'The savings report adds up discounts, credits and optimizations.',
    },
    phase: 'Operate',
    capabilities: ['KPIs & Benchmarking', 'Rate Optimization'],
    personas: ['Leadership', 'Finance', 'FinOps Practitioner'],
    signals: [
      {
        fr: 'Économies d’engagement et de rightsizing additionnées.',
        en: 'Commitment and rightsizing savings added together.',
      },
      {
        fr: 'Crédits promotionnels comptés comme des optimisations.',
        en: 'Promotional credits counted as optimizations.',
      },
      {
        fr: 'Aucune distinction entre économies réalisées et évitées.',
        en: 'No distinction between realized and avoided savings.',
      },
    ],
    snippets: ['savings-breakdown', 'effective-savings-rate'],
    actions: [
      {
        fr: 'Décomposer : remises négociées, engagements, crédits.',
        en: 'Break it down: negotiated discounts, commitments, credits.',
      },
      {
        fr: 'Calculer à partir de ListCost, ContractedCost et EffectiveCost.',
        en: 'Calculate from ListCost, ContractedCost and EffectiveCost.',
      },
      {
        fr: 'Séparer économies réalisées (mesurées après action) et coûts évités.',
        en: 'Separate realized savings (measured after the action) from avoided costs.',
      },
      {
        fr: 'Présenter l’ESR plutôt qu’une somme de remises.',
        en: 'Present the ESR rather than a sum of discounts.',
      },
    ],
    kpis: ['effective-savings-rate'],
    pitfall: {
      fr: 'Additionner remise d’engagement et rightsizing sur la même ressource : réduire la capacité réduit aussi la base remisée.',
      en: 'Adding a commitment discount and rightsizing on the same resource: cutting capacity also shrinks the discounted base.',
    },
  },
];

export const PHASES = ['Inform', 'Optimize', 'Operate'];
