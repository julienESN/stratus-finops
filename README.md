# Stratus — GCP FinOps

Application de démonstration de Julien Esnault. Toutes les données sont synthétiques. Aucune donnée d’entreprise, clé cloud ou connexion GCP n’est embarquée.

## Démonstration en cinq minutes

1. **Vue d’ensemble** : 87 657,42 € du 1 au 15 septembre, une projection au-dessus du budget et une dérive BigQuery. Comparer les périodes et filtrer par équipe.
2. **Optimisations** : examiner la dérive, expliquer la partition, les contrôles de résultats et la mesure après action. Valider avec un commentaire. Les 8 100 €/mois sont un potentiel illustratif, jamais un gain réalisé.
3. **Allocation** : montrer le coût sans responsable. Attribuer Sandbox R&D, comparer les clés de partage et exporter le showback ou le brouillon de chargeback. Le total est rapproché au centime.
4. **Simulateur CUD** : comparer usage stable et usage à 40 %. Une dépense engagée reste due même si elle n’est pas consommée. Ce modèle pédagogique n’est pas un calculateur de prix contractuel.
5. **Méthode & données** : expliquer la source simulée, les limites, les formules et les étapes d’intégration d’un véritable export Cloud Billing.

Les décisions et affectations restent dans sessionStorage, pour l’onglet courant. Le bouton Réinitialiser la démo restaure les valeurs initiales. Les modifications ne sont pas partagées entre appareils.

## Exécuter localement

Aucune dépendance à installer. Servir le dossier `dist` avec un serveur HTTP statique, par exemple :

```sh
python3 -m http.server 4173 --directory dist
```

Ouvrir http://localhost:4173. Le chargement direct de index.html via file:// n’est pas pris en charge car le code utilise des modules JavaScript.

Les polices utilisent Google Fonts et possèdent une police de secours locale. Aucun appel externe n’est nécessaire aux calculs.

## Vérifications

```sh
node --test tests/finance.test.js
```

Les tests vérifient la reproductibilité des données, le rapprochement des coûts et crédits, les deux clés d’allocation avec et sans propriétaire, le traitement du socle sans base de répartition et les scénarios de sous-utilisation des engagements.

## Structure

- `dist/data.js` : données reproductibles, coûts en centimes, allocation au plus fort reste, modèle CUD.
- `dist/app.js` : vues interactives, journal de décisions, exports CSV et JSON.
- `dist/styles.css` : interface responsive et états accessibles.
- `tests/finance.test.js` : invariants financiers.
- `.openai/hosting.json` : identité du site et répertoire statique.

## Limites assumées

Le CSV propose un extrait de champs alignés sur FOCUS. Il ne constitue pas un export FOCUS complet, validé ou certifié. Le prototype ne possède pas de backend de facturation, d’intégration comptable, de contrôles de conformité ou de connecteur cloud actif. Le modèle CUD exclut notamment les variations horaires, les conditions SKU, l’amortissement et les remises existantes. Les recommandations sont des scénarios explicitement documentés, pas des détections automatiques. L’arrêt de préproduction illustre la sobriété des usages ; aucun gain carbone non mesuré n’est annoncé.
