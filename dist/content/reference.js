// Référentiel : framework FinOps (version 2026), FOCUS et KPI.
// Sources : finops.org/framework, focus.finops.org, spécification FOCUS (GitHub), documentations Google Cloud, AWS et Microsoft.
// Les textes sont bilingues { fr, en } ; les noms officiels du framework restent en anglais.

export const framework = {
  version: 'FinOps Framework 2026',
  definition: {
    fr: 'FinOps est un cadre opérationnel et une pratique culturelle qui maximisent la valeur métier de la technologie, permettent des décisions rapides fondées sur les données et créent une responsabilité financière grâce à la collaboration entre ingénierie, finance et métiers.',
    en: 'FinOps is an operating framework and a cultural practice that maximizes the business value of technology, enables fast data-driven decisions, and creates financial accountability through collaboration between engineering, finance and the business.',
  },
  principles: [
    ['Teams need to collaborate', { fr: 'Les équipes collaborent : finance, technique et métier avancent ensemble.', en: 'Teams collaborate: finance, engineering and the business move forward together.' }],
    ['Business value drives technology decisions', { fr: 'La valeur métier guide les décisions techniques, pas le coût seul.', en: 'Business value guides technology decisions, not cost alone.' }],
    ['Everyone takes ownership for their technology usage', { fr: 'Chacun est responsable de sa consommation.', en: 'Everyone is accountable for their own technology usage.' }],
    ['FinOps data should be accessible, timely, and accurate', { fr: 'Les données FinOps sont accessibles, à jour et exactes.', en: 'FinOps data is accessible, timely and accurate.' }],
    ['FinOps should be enabled centrally', { fr: 'Une équipe centrale outille et facilite la pratique.', en: 'A central team equips and enables the practice.' }],
    ['Take advantage of the variable cost model of the cloud', { fr: 'Tirer parti du modèle de coût variable.', en: 'Take advantage of the variable cost model of the cloud.' }],
  ],
  personas: {
    core: [
      ['FinOps Practitioner', { fr: 'Anime la pratique, produit les analyses et relie les équipes.', en: 'Runs the practice, produces the analyses and connects the teams.' }],
      ['Engineering', { fr: 'Conçoit et exploite : décide de l’architecture et de l’usage.', en: 'Designs and operates: decides the architecture and usage.' }],
      ['Finance', { fr: 'Budget, prévision, comptabilisation et refacturation.', en: 'Budget, forecasting, accounting and chargeback.' }],
      ['Leadership', { fr: 'Fixe les objectifs et arbitre entre coût, vitesse et qualité.', en: 'Sets the goals and arbitrates between cost, speed and quality.' }],
      ['Procurement', { fr: 'Négocie contrats et engagements avec les fournisseurs.', en: 'Negotiates contracts and commitments with suppliers.' }],
      ['Product', { fr: 'Porte la valeur métier et les indicateurs unitaires.', en: 'Owns business value and the unit metrics.' }],
    ],
    allied: [
      ['ITAM', { fr: 'Gestion des actifs et licences.', en: 'IT asset and license management.' }],
      ['ITFM', { fr: 'Gestion financière de l’IT.', en: 'IT financial management.' }],
      ['ITSM', { fr: 'Gestion des services IT.', en: 'IT service management.' }],
      ['Security', { fr: 'Sécurité et conformité.', en: 'Security and compliance.' }],
      ['Sustainability', { fr: 'Impact environnemental.', en: 'Environmental impact.' }],
    ],
  },
  phases: [
    ['Inform', { fr: 'Rendre visibles les coûts : données, allocation, rapports, prévision.', en: 'Make costs visible: data, allocation, reporting, forecasting.' }],
    ['Optimize', { fr: 'Identifier et prioriser les leviers d’usage et de tarif.', en: 'Identify and prioritize usage and rate levers.' }],
    ['Operate', { fr: 'Ancrer les pratiques : gouvernance, automatisation, amélioration continue.', en: 'Embed the practices: governance, automation, continuous improvement.' }],
  ],
  maturity: [
    ['Crawl', { fr: 'Pratiques manuelles et partielles, sur un périmètre réduit.', en: 'Manual, partial practices on a limited scope.' }],
    ['Walk', { fr: 'Pratiques documentées, régulières, étendues aux périmètres clés.', en: 'Documented, regular practices extended to the key scopes.' }],
    ['Run', { fr: 'Pratiques automatisées et intégrées aux décisions, à grande échelle.', en: 'Automated practices built into decisions, at scale.' }],
  ],
  scopes: {
    fr: 'Un scope est un segment de dépenses technologiques aligné sur une construction métier (produit, centre de coûts, environnement, IA, SaaS…). Il détermine les personas impliqués et les capacités prioritaires.',
    en: 'A scope is a segment of technology spend aligned to a business construct (product, cost center, environment, AI, SaaS…). It determines the personas involved and the priority capabilities.',
  },
  domains: [
    {
      name: 'Understand Usage & Cost',
      subtitle: { fr: 'Comprendre l’usage et les coûts', en: 'Understand usage and cost' },
      capabilities: [
        ['Data Ingestion', { fr: 'Collecter, normaliser et rendre fiables les données de coût et d’usage.', en: 'Collect, normalize and make cost and usage data reliable.' }],
        ['Allocation', { fr: 'Attribuer chaque coût à un propriétaire, y compris les coûts partagés.', en: 'Assign each cost to an owner, including shared costs.' }],
        ['Reporting & Analytics', { fr: 'Produire les vues adaptées à chaque persona.', en: 'Produce the views suited to each persona.' }],
        ['Anomaly Management', { fr: 'Détecter, qualifier et traiter les écarts inattendus.', en: 'Detect, qualify and handle unexpected variances.' }],
      ],
    },
    {
      name: 'Quantify Business Value',
      subtitle: { fr: 'Quantifier la valeur métier', en: 'Quantify the business value' },
      capabilities: [
        ['Planning & Estimating', { fr: 'Estimer le coût d’un projet ou d’une architecture avant de construire.', en: 'Estimate the cost of a project or architecture before building it.' }],
        ['Forecasting', { fr: 'Projeter les coûts futurs et suivre l’écart au réalisé.', en: 'Project future costs and track the variance against actuals.' }],
        ['Budgeting', { fr: 'Fixer et suivre des budgets par périmètre.', en: 'Set and track budgets by scope.' }],
        ['KPIs & Benchmarking', { fr: 'Mesurer la performance et la comparer.', en: 'Measure performance and compare it.' }],
        ['Unit Economics', { fr: 'Relier le coût à une unité de valeur métier.', en: 'Tie cost to a unit of business value.' }],
      ],
    },
    {
      name: 'Optimize Usage & Cost',
      subtitle: { fr: 'Optimiser l’usage et les coûts', en: 'Optimize usage and cost' },
      capabilities: [
        ['Architecting & Workload Placement', { fr: 'Choisir architecture et localisation au bon coût.', en: 'Choose the architecture and location at the right cost.' }],
        ['Usage Optimization', { fr: 'Ajuster la consommation au besoin réel : arrêt, rightsizing, cycle de vie.', en: 'Match consumption to real need: shutdown, rightsizing, lifecycle.' }],
        ['Rate Optimization', { fr: 'Payer le bon prix : engagements, remises, modèles tarifaires.', en: 'Pay the right price: commitments, discounts, pricing models.' }],
        ['Licensing & SaaS', { fr: 'Maîtriser licences et abonnements SaaS.', en: 'Control licenses and SaaS subscriptions.' }],
        ['Sustainability', { fr: 'Réduire l’empreinte environnementale de la technologie.', en: 'Reduce the environmental footprint of technology.' }],
      ],
    },
    {
      name: 'Manage the FinOps Practice',
      subtitle: { fr: 'Piloter la pratique FinOps', en: 'Run the FinOps practice' },
      capabilities: [
        ['Executive Strategy Alignment', { fr: 'Aligner la pratique sur la stratégie de la direction.', en: 'Align the practice with executive strategy.' }],
        ['FinOps Practice Operations', { fr: 'Organiser l’équipe, les rituels et la feuille de route.', en: 'Organize the team, the rituals and the roadmap.' }],
        ['Governance, Policy & Risk', { fr: 'Définir règles, garde-fous et gestion des risques.', en: 'Define rules, guardrails and risk management.' }],
        ['FinOps Education & Enablement', { fr: 'Former et outiller les équipes.', en: 'Train and equip the teams.' }],
        ['Invoicing & Chargeback', { fr: 'Rapprocher les factures, refacturer ou présenter les coûts.', en: 'Reconcile invoices, charge back or present costs.' }],
        ['FinOps Assessment', { fr: 'Évaluer la maturité et prioriser les progrès.', en: 'Assess maturity and prioritize improvements.' }],
        ['Automation, Tools & Services', { fr: 'Choisir et intégrer les outils.', en: 'Select and integrate the tools.' }],
        ['Intersecting Disciplines', { fr: 'Travailler avec ITAM, ITFM, ITSM, sécurité et durabilité.', en: 'Work with ITAM, ITFM, ITSM, security and sustainability.' }],
      ],
    },
  ],
};

export const focus = {
  definition: {
    fr: 'FOCUS (FinOps Open Cost and Usage Specification) définit un format commun pour les données de facturation, quel que soit le fournisseur : cloud, SaaS ou data center.',
    en: 'FOCUS (FinOps Open Cost and Usage Specification) defines a common format for billing data, whatever the provider: cloud, SaaS or data center.',
  },
  versions: [
    ['1.0', { fr: '2024', en: '2024' }, { fr: 'Première version stable : colonnes de coût, de charge, de service et d’engagement.', en: 'First stable version: cost, charge, service and commitment columns.' }],
    ['1.1', { fr: 'Fin 2024', en: 'End of 2024' }, { fr: 'Ajoute ServiceSubcategory, CapacityReservationId et Status, CommitmentDiscountQuantity et Unit, SkuMeter, SkuPriceDetails.', en: 'Adds ServiceSubcategory, CapacityReservationId and Status, CommitmentDiscountQuantity and Unit, SkuMeter, SkuPriceDetails.' }],
    ['1.2', { fr: '2025', en: '2025' }, { fr: 'Ajoute InvoiceId, BillingAccountType, SubAccountType et les colonnes de devise de tarification (PricingCurrency*). C’est la version produite par les exports actuels.', en: 'Adds InvoiceId, BillingAccountType, SubAccountType and the pricing currency columns (PricingCurrency*). This is the version produced by current exports.' }],
    ['1.3', { fr: 'Décembre 2025', en: 'December 2025' }, { fr: 'Ajoute ServiceProviderName et HostProviderName, les colonnes d’allocation (AllocatedMethodId, AllocatedMethodDetails, AllocatedResourceId, AllocatedResourceName, AllocatedTags), ContractApplied et le dataset Contract Commitment.', en: 'Adds ServiceProviderName and HostProviderName, the allocation columns (AllocatedMethodId, AllocatedMethodDetails, AllocatedResourceId, AllocatedResourceName, AllocatedTags), ContractApplied and the Contract Commitment dataset.' }],
    ['1.4', { fr: 'Juin 2026', en: 'June 2026' }, { fr: 'Ajoute les datasets Invoice Detail et Billing Period, InvoiceDetailId et CommitmentProgramEligibilityDetails, et retire ProviderName et PublisherName.', en: 'Adds the Invoice Detail and Billing Period datasets, InvoiceDetailId and CommitmentProgramEligibilityDetails, and removes ProviderName and PublisherName.' }],
  ],
  costs: [
    ['ListCost', { fr: 'Prix public × quantité tarifée, sans aucune remise.', en: 'List price × priced quantity, with no discount at all.' }, { fr: 'Mesurer toutes les économies obtenues.', en: 'Measure all the savings obtained.' }],
    ['ContractedCost', { fr: 'Prix contractuel × quantité : remises négociées incluses, engagements exclus.', en: 'Contracted price × quantity: negotiated discounts included, commitments excluded.' }, { fr: 'Mesurer les remises négociées et servir d’équivalent à la demande.', en: 'Measure negotiated discounts and serve as the on-demand equivalent.' }],
    ['BilledCost', { fr: 'Base de la facture : toutes remises incluses, sans amortissement des achats.', en: 'Basis of the invoice: all discounts included, no amortization of purchases.' }, { fr: 'Rapprocher la facture, comptabilité de caisse.', en: 'Reconcile the invoice, cash-basis accounting.' }],
    ['EffectiveCost', { fr: 'Coût amorti : les achats d’engagement sont répartis sur la consommation couverte.', en: 'Effective cost: commitment purchases are spread over the consumption they cover.' }, { fr: 'Allocation, showback, prévision et optimisation.', en: 'Allocation, showback, forecasting and optimization.' }],
  ],
  rules: [
    {
      fr: 'ChargeCategory vaut Usage, Purchase, Tax, Credit ou Adjustment ; ChargeClass vaut Correction pour une correction d’une période déjà facturée.',
      en: 'ChargeCategory is Usage, Purchase, Tax, Credit or Adjustment; ChargeClass is Correction for a correction to an already billed period.',
    },
    {
      fr: 'Un achat qui couvre de futures charges a un EffectiveCost égal à 0.',
      en: 'A purchase that covers future charges has an EffectiveCost of 0.',
    },
    {
      fr: 'Pour un engagement donné, la somme des EffectiveCost Usage égale la somme des BilledCost Purchase, et vaut Used + Unused.',
      en: 'For a given commitment, the sum of Usage EffectiveCost equals the sum of Purchase BilledCost, and equals Used + Unused.',
    },
    {
      fr: 'Un crédit indépendant a ses quatre coûts égaux.',
      en: 'A standalone credit has all four costs equal.',
    },
    {
      fr: 'ChargePeriodStart est inclusif, ChargePeriodEnd exclusif.',
      en: 'ChargePeriodStart is inclusive, ChargePeriodEnd is exclusive.',
    },
    {
      fr: 'CommitmentDiscountStatus vaut Used ou Unused et n’est jamais nul sur une ligne Usage liée à un engagement.',
      en: 'CommitmentDiscountStatus is Used or Unused and is never null on a Usage row tied to a commitment.',
    },
    {
      fr: 'PricingCategory vaut Standard, Dynamic, Committed ou Other.',
      en: 'PricingCategory is Standard, Dynamic, Committed or Other.',
    },
    {
      fr: 'Tags est un objet clé-valeur JSON ; les colonnes propres à un fournisseur sont préfixées par x_.',
      en: 'Tags is a JSON key-value object; provider-specific columns are prefixed with x_.',
    },
  ],
  columnGroups: [
    [{ fr: 'Facturation', en: 'Billing' }, [
      ['BillingAccountId', { fr: 'Compte auquel la facture est adressée.', en: 'Account the invoice is addressed to.' }],
      ['BillingPeriodStart', { fr: 'Début de la période de facturation (inclusif).', en: 'Start of the billing period (inclusive).' }],
      ['BillingCurrency', { fr: 'Devise de tous les coûts.', en: 'Currency of all costs.' }],
      ['InvoiceIssuerName', { fr: 'Entité qui émet la facture (fournisseur ou revendeur).', en: 'Entity issuing the invoice (provider or reseller).' }],
      ['InvoiceId', { fr: 'Identifiant de facture (1.2).', en: 'Invoice identifier (1.2).' }],
    ]],
    [{ fr: 'Charge', en: 'Charge' }, [
      ['ChargePeriodStart', { fr: 'Début de la période de la charge (inclusif).', en: 'Start of the charge period (inclusive).' }],
      ['ChargeCategory', { fr: 'Usage, Purchase, Tax, Credit, Adjustment.', en: 'Usage, Purchase, Tax, Credit, Adjustment.' }],
      ['ChargeClass', { fr: 'Correction, ou vide.', en: 'Correction, or empty.' }],
      ['ChargeFrequency', { fr: 'One-Time, Recurring, Usage-Based.', en: 'One-Time, Recurring, Usage-Based.' }],
      ['ChargeDescription', { fr: 'Libellé lisible de la charge.', en: 'Human-readable label of the charge.' }],
    ]],
    [{ fr: 'Service et ressource', en: 'Service and resource' }, [
      ['ServiceName', { fr: 'Service du fournisseur (BigQuery, EC2…).', en: 'Provider service (BigQuery, EC2…).' }],
      ['ServiceCategory', { fr: 'Catégorie normalisée : Compute, Storage, Databases, Networking…', en: 'Normalized category: Compute, Storage, Databases, Networking…' }],
      ['ServiceSubcategory', { fr: 'Sous-catégorie normalisée : Containers, Object Storage… (1.1).', en: 'Normalized subcategory: Containers, Object Storage… (1.1).' }],
      ['SubAccountId', { fr: 'Projet GCP, compte AWS, abonnement Azure.', en: 'GCP project, AWS account, Azure subscription.' }],
      ['ResourceId', { fr: 'Identifiant de la ressource.', en: 'Resource identifier.' }],
      ['RegionId', { fr: 'Région technique.', en: 'Technical region.' }],
      ['Tags', { fr: 'Tags et labels finalisés, en clé-valeur.', en: 'Final tags and labels, as key-value pairs.' }],
    ]],
    [{ fr: 'Tarification et quantités', en: 'Pricing and quantities' }, [
      ['PricingCategory', { fr: 'Standard, Dynamic, Committed, Other.', en: 'Standard, Dynamic, Committed, Other.' }],
      ['PricingQuantity', { fr: 'Quantité tarifée, dans PricingUnit.', en: 'Priced quantity, in PricingUnit.' }],
      ['ConsumedQuantity', { fr: 'Quantité consommée, dans ConsumedUnit.', en: 'Consumed quantity, in ConsumedUnit.' }],
      ['ListUnitPrice', { fr: 'Prix unitaire public.', en: 'Unit list price.' }],
      ['ContractedUnitPrice', { fr: 'Prix unitaire contractuel.', en: 'Unit contracted price.' }],
      ['SkuPriceId', { fr: 'Identifiant du point de prix du SKU.', en: 'Identifier of the SKU price point.' }],
    ]],
    [{ fr: 'Engagements', en: 'Commitments' }, [
      ['CommitmentDiscountId', { fr: 'Engagement appliqué ou acheté.', en: 'Commitment applied or purchased.' }],
      ['CommitmentDiscountCategory', { fr: 'Spend (montant) ou Usage (quantité).', en: 'Spend (amount) or Usage (quantity).' }],
      ['CommitmentDiscountStatus', { fr: 'Used ou Unused.', en: 'Used or Unused.' }],
      ['CommitmentDiscountType', { fr: 'Libellé du fournisseur (Savings Plan, Reservation, CUD…).', en: 'Provider label (Savings Plan, Reservation, CUD…).' }],
      ['CapacityReservationStatus', { fr: 'Used ou Unused pour une réservation de capacité (1.1).', en: 'Used or Unused for a capacity reservation (1.1).' }],
    ]],
  ],
  providers: [
    {
      name: 'Google Cloud',
      export: {
        fr: 'Export FOCUS vers BigQuery, en preview. Dataset gcp_billing_immutable_<compte>_<localisation>, table gcp_billing_export_focus_<compte>. Rétention de 2 ans.',
        en: 'FOCUS export to BigQuery, in preview. Dataset gcp_billing_immutable_<account>_<location>, table gcp_billing_export_focus_<account>. Retention of 2 years.',
      },
      subAccount: {
        fr: 'SubAccountId et SubAccountName = identifiant et nom du projet.',
        en: 'SubAccountId and SubAccountName = project ID and name.',
      },
      tags: {
        fr: 'Pas de colonne Tags : labels dans x_Labels et x_ProjectLabels, tags dans x_Tags (tableaux Key et Value).',
        en: 'No Tags column: labels in x_Labels and x_ProjectLabels, tags in x_Tags (Key and Value arrays).',
      },
      commitments: {
        fr: 'Pas de colonnes CommitmentDiscount* : les remises CUD sont dans x_Credits (types COMMITTED_USAGE_DISCOUNT et COMMITTED_USAGE_DISCOUNT_DOLLAR_BASE).',
        en: 'No CommitmentDiscount* columns: CUD discounts are in x_Credits (types COMMITTED_USAGE_DISCOUNT and COMMITTED_USAGE_DISCOUNT_DOLLAR_BASE).',
      },
      gaps: {
        fr: 'Non fournis : Tags, ServiceCategory, ServiceSubcategory, ChargeFrequency, CommitmentDiscount*, InvoiceIssuerName, InvoiceId, ResourceType, CapacityReservation*, SubAccountType. Valeur Purchase de ChargeCategory non fournie.',
        en: 'Not provided: Tags, ServiceCategory, ServiceSubcategory, ChargeFrequency, CommitmentDiscount*, InvoiceIssuerName, InvoiceId, ResourceType, CapacityReservation*, SubAccountType. The Purchase value of ChargeCategory is not provided.',
      },
    },
    {
      name: 'AWS',
      export: {
        fr: 'Data Exports FOCUS 1.2, disponible en GA depuis novembre 2025. Table FOCUS_1_2_AWS livrée dans S3, granularité horaire, journalière ou mensuelle.',
        en: 'FOCUS 1.2 Data Exports, generally available since November 2025. FOCUS_1_2_AWS table delivered to S3, hourly, daily or monthly granularity.',
      },
      subAccount: {
        fr: 'SubAccountId = compte AWS membre ; le compte de gestion voit toute l’organisation.',
        en: 'SubAccountId = member AWS account; the management account sees the whole organization.',
      },
      tags: {
        fr: 'Colonne Tags standard.',
        en: 'Standard Tags column.',
      },
      commitments: {
        fr: 'Savings Plans et Reserved Instances décrits dans les colonnes CommitmentDiscount*.',
        en: 'Savings Plans and Reserved Instances described in the CommitmentDiscount* columns.',
      },
      gaps: {
        fr: 'Colonnes propres : x_Discounts, x_Operation, x_ServiceCode.',
        en: 'Provider-specific columns: x_Discounts, x_Operation, x_ServiceCode.',
      },
    },
    {
      name: 'Microsoft Azure',
      export: {
        fr: 'Exports Cost Management au format FOCUS, qui réunissent coûts réels et amortis dans un seul jeu de données. Vérifier la version proposée dans l’assistant d’export.',
        en: 'Cost Management exports in FOCUS format, combining actual and amortized costs in a single dataset. Check the version offered in the export wizard.',
      },
      subAccount: {
        fr: 'SubAccountId = abonnement ; BillingAccountId = profil de facturation pour un contrat MCA.',
        en: 'SubAccountId = subscription; BillingAccountId = billing profile for an MCA contract.',
      },
      tags: {
        fr: 'Colonne Tags au format JSON.',
        en: 'Tags column in JSON format.',
      },
      commitments: {
        fr: 'Réservations et Savings Plans décrits dans les colonnes CommitmentDiscount*.',
        en: 'Reservations and Savings Plans described in the CommitmentDiscount* columns.',
      },
      gaps: {
        fr: 'ServiceName repose sur un mapping Microsoft encore incomplet ; InvoiceId disponible pour MCA, pas pour EA.',
        en: 'ServiceName relies on a Microsoft mapping that is still incomplete; InvoiceId is available for MCA, not for EA.',
      },
    },
  ],
  sovereignNote: {
    fr: 'S3NS et les clouds de confiance : vérifier sur place la disponibilité et le format de l’export de facturation avant de réutiliser les requêtes BigQuery.',
    en: 'S3NS and trusted clouds: check on site the availability and format of the billing export before reusing the BigQuery queries.',
  },
};

// KPI : formule lisible, expression en colonnes FOCUS et requête associée.
export const kpis = [
  {
    id: 'allocation-rate',
    name: { fr: 'Taux de coûts alloués', en: 'Allocated cost rate' },
    capability: 'Allocation',
    formula: { fr: 'Coût effectif avec propriétaire ÷ coût effectif total', en: 'Effective cost with an owner ÷ total effective cost' },
    focus: { fr: 'SUM(EffectiveCost) si Tags.team renseigné ÷ SUM(EffectiveCost)', en: 'SUM(EffectiveCost) where Tags.team is set ÷ SUM(EffectiveCost)' },
    snippet: 'allocation-rate',
    reading: { fr: 'Suivre la tendance mensuelle. Les coûts partagés ont un propriétaire mais attendent une clé de répartition.', en: 'Track the monthly trend. Shared costs have an owner but are waiting for an allocation key.' },
  },
  {
    id: 'unit-cost',
    name: { fr: 'Coût unitaire', en: 'Unit cost' },
    capability: 'Unit Economics',
    formula: { fr: 'Coût effectif ÷ volume de l’unité choisie', en: 'Effective cost ÷ volume of the chosen unit' },
    focus: { fr: 'SUM(EffectiveCost) ÷ SUM(ConsumedQuantity) pour un coût technique, ou ÷ un volume métier externe (commandes, utilisateurs)', en: 'SUM(EffectiveCost) ÷ SUM(ConsumedQuantity) for a technical cost, or ÷ an external business volume (orders, users)' },
    snippet: 'bigquery-scans',
    reading: { fr: 'Un coût total en hausse avec un coût unitaire stable traduit de la croissance, pas une dérive.', en: 'A rising total cost with a stable unit cost reflects growth, not drift.' },
  },
  {
    id: 'forecast-variance',
    name: { fr: 'Écart de prévision', en: 'Forecast variance' },
    capability: 'Forecasting',
    formula: { fr: '(Réalisé − Prévu) ÷ Prévu', en: '(Actual − Forecast) ÷ Forecast' },
    focus: { fr: 'Réalisé = SUM(EffectiveCost) de la période ; la prévision vient du modèle ou du budget', en: 'Actual = SUM(EffectiveCost) for the period; the forecast comes from the model or the budget' },
    snippet: 'forecast-month-end',
    reading: { fr: 'Le framework ne fixe pas de seuil : chaque organisation définit l’écart acceptable. Au niveau Run, la prévision se suit en coût amorti.', en: 'The framework sets no threshold: each organization defines the acceptable variance. At the Run level, the forecast is tracked on effective cost.' },
  },
  {
    id: 'budget-consumption',
    name: { fr: 'Consommation du budget', en: 'Budget consumption' },
    capability: 'Budgeting',
    formula: { fr: 'Réalisé cumulé ÷ budget de la période', en: 'Cumulative actual ÷ budget for the period' },
    focus: { fr: 'SUM(EffectiveCost) depuis le début de la période ÷ budget', en: 'SUM(EffectiveCost) since the start of the period ÷ budget' },
    snippet: 'forecast-month-end',
    reading: { fr: 'À comparer à la part de la période écoulée : 60 % du budget consommé à mi-mois annonce un dépassement.', en: 'Compare with the share of the period elapsed: 60% of the budget consumed by mid-month signals an overrun.' },
  },
  {
    id: 'commitment-utilization',
    name: { fr: 'Utilisation des engagements', en: 'Commitment utilization' },
    capability: 'Rate Optimization',
    formula: { fr: 'Engagement utilisé ÷ engagement total', en: 'Commitment used ÷ total commitment' },
    focus: { fr: 'SUM(EffectiveCost) Used ÷ SUM(EffectiveCost) Used + Unused, par CommitmentDiscountId', en: 'SUM(EffectiveCost) Used ÷ SUM(EffectiveCost) Used + Unused, per CommitmentDiscountId' },
    snippet: 'commitment-utilization',
    reading: { fr: 'Viser un niveau proche de 100 %. Suivre au jour : une moyenne mensuelle masque les creux du week-end.', en: 'Aim for a level close to 100%. Track it daily: a monthly average hides weekend dips.' },
  },
  {
    id: 'commitment-waste',
    name: { fr: 'Part d’engagement inutilisée', en: 'Unused commitment share' },
    capability: 'Rate Optimization',
    formula: { fr: 'Engagement inutilisé ÷ engagement total', en: 'Unused commitment ÷ total commitment' },
    focus: { fr: 'SUM(EffectiveCost) Unused ÷ SUM(EffectiveCost) des lignes Usage de l’engagement', en: 'SUM(EffectiveCost) Unused ÷ SUM(EffectiveCost) of the commitment’s Usage rows' },
    snippet: 'commitment-utilization',
    reading: { fr: 'Complément de l’utilisation. La FinOps Foundation recommande de la mesurer avec une résolution quotidienne.', en: 'Complements utilization. The FinOps Foundation recommends measuring it at daily resolution.' },
  },
  {
    id: 'commitment-coverage',
    name: { fr: 'Couverture des engagements', en: 'Commitment coverage' },
    capability: 'Rate Optimization',
    formula: { fr: 'Consommation éligible couverte ÷ consommation éligible totale', en: 'Covered eligible usage ÷ total eligible usage' },
    focus: { fr: 'SUM(ContractedCost) Used ÷ SUM(ContractedCost) des lignes Usage éligibles, hors Unused', en: 'SUM(ContractedCost) Used ÷ SUM(ContractedCost) of eligible Usage rows, excluding Unused' },
    snippet: 'commitment-coverage',
    reading: { fr: 'À lire avec l’utilisation : une couverture haute et une utilisation basse signalent un engagement surdimensionné.', en: 'Read it alongside utilization: high coverage with low utilization signals an oversized commitment.' },
  },
  {
    id: 'effective-savings-rate',
    name: { fr: 'Taux d’économie effectif (ESR)', en: 'Effective savings rate (ESR)' },
    capability: 'Rate Optimization',
    formula: { fr: '1 − coût effectif ÷ équivalent à la demande', en: '1 − effective cost ÷ on-demand equivalent' },
    focus: { fr: '1 − SUM(EffectiveCost) ÷ SUM(ContractedCost), sur l’usage éligible, lignes Unused incluses', en: '1 − SUM(EffectiveCost) ÷ SUM(ContractedCost), on eligible usage, Unused rows included' },
    snippet: 'effective-savings-rate',
    reading: { fr: 'Rendement réel du portefeuille d’engagements, part inutilisée déduite. Il combine utilisation, couverture et remise.', en: 'Real return of the commitment portfolio, with the unused share deducted. It combines utilization, coverage and discount.' },
  },
  {
    id: 'savings-by-lever',
    name: { fr: 'Économies par levier', en: 'Savings by lever' },
    capability: 'KPIs & Benchmarking',
    formula: { fr: 'Remises négociées + économies d’engagement + crédits', en: 'Negotiated discounts + commitment savings + credits' },
    focus: { fr: 'SUM(ListCost − ContractedCost), SUM(ContractedCost − EffectiveCost) sur Usage, −SUM(EffectiveCost) des Credit', en: 'SUM(ListCost − ContractedCost), SUM(ContractedCost − EffectiveCost) on Usage, −SUM(EffectiveCost) of Credit' },
    snippet: 'savings-breakdown',
    reading: { fr: 'Présenter chaque levier séparément et distinguer économies réalisées et coûts évités.', en: 'Present each lever separately and distinguish realized savings from avoided costs.' },
  },
  {
    id: 'anomaly-detection-time',
    name: { fr: 'Délai de détection d’une anomalie', en: 'Anomaly detection time' },
    capability: 'Anomaly Management',
    formula: { fr: 'Date de détection − date de début de l’anomalie', en: 'Detection date − anomaly start date' },
    focus: { fr: 'Date de début = premier jour signalé par la détection quotidienne sur ChargePeriodStart', en: 'Start date = first day flagged by daily detection on ChargePeriodStart' },
    snippet: 'daily-anomalies',
    reading: { fr: 'Avec des données quotidiennes, l’objectif est de détecter en un à deux jours, en tenant compte du délai de propagation de l’export.', en: 'With daily data, the goal is to detect within one to two days, allowing for the export’s propagation delay.' },
  },
];

// Toutes les capacités, avec leur domaine, pour les liens et filtres.
export const capabilityDomain = Object.fromEntries(framework.domains.flatMap((d) => d.capabilities.map(([name]) => [name, d.name])));
