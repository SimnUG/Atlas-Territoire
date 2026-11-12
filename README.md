# ATLAS Territoires

Site public : https://atlas-territoires-simnug.onrender.com

## Périmètre autorisé

**Seules les sources expressément autorisées par l'utilisateur** peuvent fournir les données :
INSEE, DVF (République française / DGFiP), ministère de la Transition écologique et de la Cohésion des territoires, ministère de l'Intérieur, Urssaf, Sitadel (SDES), ANCT, Observatoire des territoires, BDNB, CSTP (identité à préciser), ADEME, DPE–Audit, data.gouv.fr et DGCL–OFGL.

**Important :** data.gouv.fr héberge des jeux produits par de nombreux acteurs. La recherche de jeux de données filtre sur une liste de producteurs officiels reconnus ; un jeu référencé n'est pas automatiquement un indicateur intégré ou géolocalisé.

## Points d'accès (API)

- `GET /` — page d'accueil (design conservé)
- `GET /dashboard.html?adresse=...` — tableau de bord
- `GET /api/recherche?adresse=...` — recherche par adresse
- `GET /api/analyse?adresse=...` — identification de la commune et localisation
- `GET /api/indicateurs?code_insee=44109&adresse=...&code_postal=44000` — appel des connecteurs actifs
- `GET /api/catalogue` — registre des 14 sources autorisées et jeux documentés
- `GET /api/catalogue?categorie=population` — filtrage du registre
- `GET /api/jeux-de-donnees?q=logement` — découverte de jeux sur data.gouv.fr, limitée aux producteurs reconnus
- `GET /api/health` — disponibilité du service

## Ce qui est réellement intégré

| Ensemble | État |
|---|---|
| Adresse et commune | Connecteur actif (géocodage Géoplateforme, référencé sur data.gouv.fr) |
| Population INSEE | Connecteur actif mais retour réel à valider pour chaque demande |
| Revenus INSEE | Connecteur actif mais schéma/millésime à valider |
| Logements INSEE | Connecteur actif mais résultat communal à valider |
| ADEME DPE | Connecteur actif, rapprochement strict d'adresse |
| DGCL / OFGL | Connecteur actif, contrôles de schéma et d'exercice |
| DVF+ | Connecteur expérimental, disponibilité/pagination à valider |
| Sitadel / DiDo | Connecteur expérimental, colonnes/ventilations à valider |
| Autres sources | Catalogue, pas de données chiffrées importées |

Les connecteurs ne transforment jamais un échec, un code de réponse inattendu ou une observation ambiguë en valeur inventée.

## Stratégie de collecte

Les données sont récupérées à la demande et mises temporairement en cache dans la mémoire du processus Render. Cette mémoire ne persiste pas après un redémarrage. Ce projet **ne contient pas de réplication nationale** des bases DVF, BDNB, RPLS, Sitadel ou INSEE. Le téléchargement national intégral nécessiterait une infrastructure adaptée (stockage persistant, chargements planifiés, normalisation, dédoublonnage, traitements RGPD).

Les statistiques d'une commune ne doivent jamais être présentées comme les données d'un bien immobilier individuel.

## Déploiement

Le site est un service Node.js qui démarre avec `npm start`, déployé automatiquement depuis la branche `main` sur Render. Aucune clé ni donnée privée n'est incluse dans le dépôt.
