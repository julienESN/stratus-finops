// Veille : actualité du cloud souverain (AWS, Google Cloud, Microsoft, clouds de confiance) et du FinOps.
// Chaque entrée renvoie à sa source et dit ce qu'elle change pour le pilotage des coûts.
// Textes bilingues { fr, en } ; dates ISO (AAAA-MM-JJ) ; entrées triées de la plus récente à la plus ancienne.

export const VEILLE_AS_OF = '2026-11-04';

export const PROVIDERS = [
  ['aws', { fr: 'AWS', en: 'AWS' }],
  ['gcp', { fr: 'Google Cloud', en: 'Google Cloud' }],
  ['azure', { fr: 'Microsoft Azure', en: 'Microsoft Azure' }],
  ['trusted', { fr: 'Clouds de confiance', en: 'Trusted clouds' }],
  ['finops', { fr: 'FinOps et FOCUS', en: 'FinOps and FOCUS' }],
];

const SOURCES = {
  awsDrill: 'https://aws.amazon.com/blogs/security/inside-a-successful-aws-european-sovereign-cloud-exercise-to-demonstrate-independent-operation/',
  awsLaunch: 'https://press.aboutamazon.com/aws/2026/1/aws-launches-aws-european-sovereign-cloud-and-announces-expansion-across-europe',
  bleu: 'https://next.ink/260765/secnumcloud-bleu-vise-desormais-une-qualification-pour-la-fin-dannee/',
  cloudAvenue: 'https://press.orange-business.com/new-secnumcloud-qualification-orange-business-expands-its-trusted-cloud-portfolio-for-critical-applications-and-ai/?lang=eng',
  focus: 'https://focus.finops.org/focus-specification/',
  thalesGoogle: 'https://www.googlecloudpresscorner.com/2026-05-20-Thales-Announces-Strategic-Partnership-with-Google-Cloud-to-Launch-a-New-Sovereign-Cloud-in-Germany',
  s3ns: 'https://www.lemondeinformatique.fr/actualites/lire-s3ns-obtient-la-qualification-secnumcloud-pour-premi3ns-98860.html',
  orangeBleu: 'https://www.orange-business.com/sites/default/files/cp_migration_orange_business_bleu_final.pdf',
  microsoft: 'https://www.theregister.com/2025/11/07/microsoft_announces_strengthening_of_sovereignty/',
  stateOfFinops: 'https://www.usu.com/en/blog/6-takeaways-from-the-state-of-finops-report-2026',
};

// Repères chiffrés affichés en tête de la veille.
export const barometer = {
  aiShare: 98,
  aiSharePrevious: 63,
  source: { label: 'State of FinOps 2026', url: SOURCES.stateOfFinops },
  focusVersion: '1.4',
  focusDate: '2026-06-04',
};

// Offres souveraines en Europe. `tone` : good (disponible ou qualifiée), pending (en cours).
export const offers = [
  {
    id: 'aws-esc',
    provider: 'aws',
    name: { fr: 'AWS European Sovereign Cloud', en: 'AWS European Sovereign Cloud' },
    operator: { fr: 'Entité européenne d’AWS, personnel résident dans l’UE', en: 'AWS European entity, EU-resident staff' },
    location: { fr: 'Brandebourg (Allemagne)', en: 'Brandenburg (Germany)' },
    status: { fr: 'Disponible depuis janvier 2026, autonomie testée le 24 octobre', en: 'Available since January 2026, independent operation tested on October 24' },
    tone: 'good',
    source: SOURCES.awsLaunch,
  },
  {
    id: 's3ns',
    provider: 'gcp',
    name: { fr: 'S3NS PREMI3NS', en: 'S3NS PREMI3NS' },
    operator: { fr: 'S3NS, coentreprise de Thales et Google', en: 'S3NS, a Thales and Google joint venture' },
    location: { fr: 'France', en: 'France' },
    status: { fr: 'Qualifiée SecNumCloud 3.2 en décembre 2025', en: 'SecNumCloud 3.2 qualified in December 2025' },
    tone: 'good',
    source: SOURCES.s3ns,
  },
  {
    id: 'thales-germany',
    provider: 'gcp',
    name: { fr: 'Cloud souverain Thales sur Google Cloud', en: 'Thales sovereign cloud on Google Cloud' },
    operator: { fr: 'Entité allemande détenue et contrôlée par Thales', en: 'German entity owned and controlled by Thales' },
    location: { fr: 'Allemagne', en: 'Germany' },
    status: { fr: 'En preview, disponibilité générale visée fin 2026', en: 'In preview, general availability targeted for end of 2026' },
    tone: 'pending',
    source: SOURCES.thalesGoogle,
  },
  {
    id: 'bleu',
    provider: 'azure',
    name: { fr: 'Bleu', en: 'Bleu' },
    operator: { fr: 'Bleu, coentreprise d’Orange et Capgemini', en: 'Bleu, an Orange and Capgemini joint venture' },
    location: { fr: 'France', en: 'France' },
    status: { fr: 'Jalon J1 validé, qualification SecNumCloud visée fin 2026', en: 'J1 milestone passed, SecNumCloud qualification targeted for end of 2026' },
    tone: 'pending',
    source: SOURCES.bleu,
  },
  {
    id: 'cloud-avenue',
    provider: 'trusted',
    name: { fr: 'Cloud Avenue SecNum', en: 'Cloud Avenue SecNum' },
    operator: { fr: 'Orange Business', en: 'Orange Business' },
    location: { fr: 'France', en: 'France' },
    status: { fr: 'Qualifiée SecNumCloud, offre Dynamic avec GPU qualifiée en octobre 2026', en: 'SecNumCloud qualified, Dynamic offer with GPUs qualified in October 2026' },
    tone: 'good',
    source: SOURCES.cloudAvenue,
  },
];

export const news = [
  {
    id: 'aws-esc-drill',
    date: '2026-10-24',
    providers: ['aws'],
    title: {
      fr: 'AWS fait tourner sa European Sovereign Cloud sans son réseau mondial',
      en: 'AWS runs its European Sovereign Cloud cut off from its global network',
    },
    summary: {
      fr: 'AWS a déconnecté la région du Brandebourg de son réseau mondial pendant plusieurs heures. Les charges ont continué de tourner et les clients ont gardé l’accès à leurs données.',
      en: 'AWS disconnected the Brandenburg region from its global network for several hours. Workloads kept running and customers kept access to their data.',
    },
    impact: {
      fr: 'La souveraineté devient un critère vérifiable. Pour un projet sensible, elle entre dans l’arbitrage entre coût, risque et conformité, au même titre que le prix.',
      en: 'Sovereignty becomes a criterion you can verify. For a sensitive project, it joins the trade-off between cost, risk and compliance, alongside price.',
    },
    source: { label: 'AWS Security Blog', url: SOURCES.awsDrill },
  },
  {
    id: 'bleu-target',
    date: '2026-10-09',
    providers: ['azure', 'trusted'],
    title: {
      fr: 'Bleu vise la qualification SecNumCloud d’ici fin 2026',
      en: 'Bleu targets SecNumCloud qualification by the end of 2026',
    },
    summary: {
      fr: 'Le cloud de confiance d’Orange et Capgemini, bâti sur les technologies Microsoft, a validé le jalon J1. La qualification, d’abord attendue au premier semestre 2026, est désormais visée pour la fin de l’année.',
      en: 'The Orange and Capgemini trusted cloud, built on Microsoft technology, has passed the J1 milestone. Qualification, first expected in the first half of 2026, is now targeted for the end of the year.',
    },
    impact: {
      fr: 'Les projets Azure sensibles ont une échéance. Leur trajectoire de migration, et le coût d’une double exploitation pendant la bascule, sont à intégrer dans la prévision 2027.',
      en: 'Sensitive Azure projects now have a date. Their migration path, and the cost of running two platforms during the switch, belong in the 2027 forecast.',
    },
    source: { label: 'Next', url: SOURCES.bleu },
  },
  {
    id: 'cloud-avenue-dynamic',
    date: '2026-10-07',
    providers: ['trusted'],
    title: {
      fr: 'Orange Business qualifie une offre SecNumCloud avec GPU',
      en: 'Orange Business qualifies a SecNumCloud offer with GPUs',
    },
    summary: {
      fr: 'Cloud Avenue SecNum Dynamic obtient la qualification SecNumCloud : ressources dédiées à chaque client, deux centres de données à Val-de-Reuil et Chartres, et des serveurs GPU pour l’entraînement et l’inférence.',
      en: 'Cloud Avenue SecNum Dynamic receives SecNumCloud qualification: resources dedicated to each customer, two data centers in Val-de-Reuil and Chartres, and GPU servers for training and inference.',
    },
    impact: {
      fr: 'L’IA sur données sensibles peut rester en cloud de confiance. Ses coûts GPU doivent alors entrer dans le même reporting que le cloud public, avec les mêmes unités.',
      en: 'AI on sensitive data can stay in a trusted cloud. Its GPU costs must then join the same reporting as public cloud, with the same units.',
    },
    source: { label: 'Orange Business', url: SOURCES.cloudAvenue },
  },
  {
    id: 'secnumcloud-order',
    date: '2026-08-12',
    providers: ['trusted'],
    title: {
      fr: 'Un arrêté approuve le référentiel SecNumCloud 3.2',
      en: 'A ministerial order approves the SecNumCloud 3.2 framework',
    },
    summary: {
      fr: 'L’arrêté précise les exigences applicables à certains services cloud qui traitent des informations particulièrement sensibles de l’État, des opérateurs publics et des organismes d’intérêt public.',
      en: 'The order clarifies the requirements for certain cloud services that process particularly sensitive information for the French State, public operators and public-interest bodies.',
    },
    impact: {
      fr: 'La sensibilité de la donnée décide du cloud possible, donc du coût unitaire. Elle mérite d’être une dimension d’allocation à part entière.',
      en: 'Data sensitivity decides which cloud is possible, and therefore the unit cost. It deserves to be an allocation dimension in its own right.',
    },
    source: { label: 'Orange Business', url: SOURCES.cloudAvenue },
  },
  {
    id: 'focus-1-4',
    date: '2026-06-04',
    providers: ['finops'],
    title: {
      fr: 'FOCUS 1.4 est ratifié',
      en: 'FOCUS 1.4 is ratified',
    },
    summary: {
      fr: 'La nouvelle version ajoute deux jeux de données, Invoice Detail et Billing Period, pour rapprocher les coûts des factures, et enrichit le suivi des engagements contractuels.',
      en: 'The new version adds two datasets, Invoice Detail and Billing Period, to reconcile costs with invoices, and expands the tracking of contract commitments.',
    },
    impact: {
      fr: 'Le rapprochement avec la facture devient natif dans l’export : moins de retraitements entre l’équipe FinOps et le contrôle de gestion. Les exports des fournisseurs suivront à leur rythme.',
      en: 'Reconciliation with the invoice becomes native to the export: less rework between the FinOps team and financial control. Provider exports will follow at their own pace.',
    },
    source: { label: 'FinOps Foundation', url: SOURCES.focus },
  },
  {
    id: 'thales-google-germany',
    date: '2026-05-20',
    providers: ['gcp', 'trusted'],
    title: {
      fr: 'Thales et Google Cloud lancent un cloud souverain en Allemagne',
      en: 'Thales and Google Cloud launch a sovereign cloud in Germany',
    },
    summary: {
      fr: 'Il est opéré sur une infrastructure dédiée par une entité allemande que Thales détient et contrôle. En preview, il vise une disponibilité générale fin 2026 et permet une reprise après sinistre croisée avec S3NS en France.',
      en: 'It runs on dedicated infrastructure, operated by a German entity that Thales fully owns and controls. In preview, it targets general availability at the end of 2026 and enables cross-border disaster recovery with S3NS in France.',
    },
    impact: {
      fr: 'Une reprise après sinistre entre deux pays de confiance a un coût : capacité réservée, réplication et transferts, à chiffrer dès la conception.',
      en: 'Disaster recovery across two trusted countries has a cost: reserved capacity, replication and transfers, to be estimated at design time.',
    },
    source: { label: 'Google Cloud Press Corner', url: SOURCES.thalesGoogle },
  },
  {
    id: 'aws-esc-launch',
    date: '2026-01-15',
    providers: ['aws'],
    title: {
      fr: 'AWS ouvre sa European Sovereign Cloud',
      en: 'AWS opens its European Sovereign Cloud',
    },
    summary: {
      fr: 'Une première région dans le Brandebourg, séparée physiquement et logiquement des autres régions AWS et opérée uniquement par des résidents de l’UE. AWS y investit plus de 7,8 milliards d’euros et prévoit des Local Zones souveraines en Belgique, aux Pays-Bas et au Portugal.',
      en: 'A first region in Brandenburg, physically and logically separate from other AWS Regions and operated only by EU residents. AWS is investing over €7.8 billion and plans sovereign Local Zones in Belgium, the Netherlands and Portugal.',
    },
    impact: {
      fr: 'C’est une région à part entière : vérifier ses tarifs, les services disponibles et le format de son export de facturation avant d’y placer un projet.',
      en: 'It is a region in its own right: check its prices, available services and billing export format before placing a project there.',
    },
    source: { label: 'Amazon', url: SOURCES.awsLaunch },
  },
  {
    id: 's3ns-secnumcloud',
    date: '2025-12-19',
    providers: ['gcp', 'trusted'],
    title: {
      fr: 'S3NS obtient la qualification SecNumCloud 3.2',
      en: 'S3NS receives SecNumCloud 3.2 qualification',
    },
    summary: {
      fr: 'PREMI3NS, l’offre de cloud public de S3NS, coentreprise de Thales et Google, est qualifiée par l’ANSSI.',
      en: 'PREMI3NS, the public cloud offer of S3NS, a Thales and Google joint venture, is qualified by ANSSI.',
    },
    impact: {
      fr: 'Des services Google Cloud deviennent possibles pour les données sensibles. Leur coût se compare désormais à celui des clouds de confiance natifs, à périmètre égal.',
      en: 'Google Cloud services become an option for sensitive data. Their cost can now be compared with native trusted clouds, on the same scope.',
    },
    source: { label: 'Le Monde Informatique', url: SOURCES.s3ns },
  },
  {
    id: 'orange-business-bleu',
    date: '2025-11-25',
    providers: ['trusted', 'azure'],
    title: {
      fr: 'Orange Business migre 70 % de son infrastructure IT vers Bleu',
      en: 'Orange Business migrates 70% of its IT infrastructure to Bleu',
    },
    summary: {
      fr: 'Après l’analyse de plus de 400 applications, les charges les plus sensibles restent sur Cloud Avenue, son cloud privé, et les autres basculent vers Bleu.',
      en: 'After analyzing more than 400 applications, the most sensitive workloads stay on Cloud Avenue, its private cloud, and the others move to Bleu.',
    },
    impact: {
      fr: 'Une migration de cette taille se pilote par jalons : coûts de double exploitation, décommissionnement et gains réels à suivre mois après mois.',
      en: 'A migration this size is steered by milestones: dual-running costs, decommissioning and actual savings to track month after month.',
    },
    source: { label: 'Orange Business', url: SOURCES.orangeBleu },
  },
  {
    id: 'microsoft-sovereign',
    date: '2025-11-07',
    providers: ['azure'],
    title: {
      fr: 'Microsoft étend son offre souveraine en Europe',
      en: 'Microsoft extends its sovereign offering in Europe',
    },
    summary: {
      fr: 'Traitement des données d’IA de bout en bout dans l’EU Data Boundary, traitement local des interactions Microsoft 365 Copilot dans 15 pays, dont l’Allemagne en 2026, et Azure Local étendu à des centaines de serveurs.',
      en: 'End-to-end AI data processing within the EU Data Boundary, in-country processing of Microsoft 365 Copilot interactions in 15 countries, including Germany in 2026, and Azure Local extended to hundreds of servers.',
    },
    impact: {
      fr: 'Les options souveraines d’Azure se multiplient, chacune avec son modèle de coût : public, privé ou opéré par un partenaire. Le choix se fait projet par projet.',
      en: 'Azure’s sovereign options multiply, each with its own cost model: public, private or partner-operated. The choice is made project by project.',
    },
    source: { label: 'The Register', url: SOURCES.microsoft },
  },
];
