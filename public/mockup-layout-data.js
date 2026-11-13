/* Architecture des 27 pages extraite de la maquette approuvée.
 * On conserve uniquement la structure et les intitulés ; aucun chiffre fictif.
 */
window.AtlasMockupLayout = {
  "programmation": {
    "desc": "Une programmation théorique fondée sur la structure des ménages et le parc existant, puis rapprochée de la concurrence et de la solvabilité.",
    "kpis": [
      "Ménages",
      "Logements existants",
      "Logements autorisés",
      "Revenu médian"
    ],
    "bar1": {
      "title": "Programmation par typologie (besoin résidentiel)",
      "labels": [
        "T1",
        "T2",
        "T3",
        "T4",
        "T5+"
      ]
    },
    "bar2": {
      "title": "Offre existante par typologie",
      "labels": [
        "T1",
        "T2",
        "T3",
        "T4",
        "T5+"
      ]
    },
    "series": null,
    "table": {
      "title": "Mise en perspective du marché",
      "headers": [
        "Typologie",
        "Besoin estimé",
        "Offre actuelle",
        "Lecture"
      ],
      "labels": [
        "T1",
        "T2",
        "T3",
        "T4",
        "T5+"
      ]
    },
    "map": false,
    "insight": true
  },
  "commercialisation": {
    "desc": "Évaluer le positionnement d’une opération neuve, son prix de sortie et la profondeur du marché.",
    "kpis": [
      "Prix médian ancien",
      "Prix moyen neuf",
      "Transactions / an",
      "Offre neuve en cours"
    ],
    "bar1": {
      "title": "Répartition des ventes par typologie",
      "labels": [
        "T1",
        "T2",
        "T3",
        "T4",
        "T5+"
      ]
    },
    "bar2": null,
    "series": {
      "title": "Évolution des prix immobiliers (€/m²)",
      "count": 5
    },
    "table": {
      "title": "Programmes concurrents — exemple",
      "headers": [
        "Programme",
        "Promoteur",
        "Prix T3",
        "Avancement"
      ],
      "labels": [
        "Les Terrasses",
        "Le Jardin Bleu",
        "L’Écrin"
      ]
    },
    "map": false,
    "insight": true
  },
  "population": {
    "desc": "Comprendre la croissance du territoire, ses classes d’âge et son potentiel de demande résidentielle.",
    "kpis": [
      "Population",
      "Évolution sur 5 ans",
      "Âge médian",
      "Densité"
    ],
    "bar1": {
      "title": "Répartition par âge",
      "labels": [
        "0–14 ans",
        "15–29 ans",
        "30–44 ans",
        "45–59 ans",
        "60–74 ans",
        "75 ans et +"
      ]
    },
    "bar2": null,
    "series": {
      "title": "Évolution de la population",
      "count": 5
    },
    "table": null,
    "map": false,
    "insight": true
  },
  "familles": {
    "desc": "Identifier les ménages qui structurent la demande de logements et les typologies susceptibles de leur correspondre.",
    "kpis": [
      "Ménages",
      "Taille moyenne",
      "Personnes seules",
      "Familles avec enfants"
    ],
    "bar1": {
      "title": "Structure des ménages",
      "labels": [
        "Personnes seules",
        "Couples sans enfant",
        "Couples avec enfants",
        "Monoparentales",
        "Autres ménages"
      ]
    },
    "bar2": {
      "title": "Taille des ménages",
      "labels": [
        "1 personne",
        "2 personnes",
        "3 personnes",
        "4 personnes",
        "5 et +"
      ]
    },
    "series": null,
    "table": null,
    "map": false,
    "insight": true
  },
  "emploi": {
    "desc": "Évaluer les pôles d’emplois, les actifs résidents et les moteurs de l’attractivité.",
    "kpis": [
      "Emplois locaux",
      "Actifs occupés",
      "Taux d’activité",
      "Taux de chômage"
    ],
    "bar1": {
      "title": "Emplois par secteur",
      "labels": [
        "Commerce / services",
        "Administration",
        "Industrie",
        "Construction",
        "Agriculture"
      ]
    },
    "bar2": null,
    "series": {
      "title": "Évolution de l’emploi local",
      "count": 5
    },
    "table": null,
    "map": false,
    "insight": true
  },
  "salaires": {
    "desc": "Observer les rémunérations pour mettre les prix de marché en perspective.",
    "kpis": [
      "Salaire net médian",
      "Salaire moyen",
      "Évolution",
      "CSP la plus représentée"
    ],
    "bar1": {
      "title": "Salaire net moyen par catégorie (base relative)",
      "labels": [
        "Cadres",
        "Prof. intermédiaires",
        "Employés",
        "Ouvriers"
      ]
    },
    "bar2": null,
    "series": null,
    "table": {
      "title": "Échelle des salaires — fictive",
      "headers": [
        "Catégorie",
        "Salaire mensuel net"
      ],
      "labels": [
        "Cadres",
        "Professions intermédiaires",
        "Employés",
        "Ouvriers"
      ]
    },
    "map": false,
    "insight": true
  },
  "revenus": {
    "desc": "Approcher la solvabilité des ménages et tester l’accessibilité des logements.",
    "kpis": [
      "Niveau de vie médian",
      "Taux de pauvreté",
      "D1",
      "D9"
    ],
    "bar1": {
      "title": "Répartition illustrative par déciles",
      "labels": [
        "D1",
        "D3",
        "D5",
        "D7",
        "D9"
      ]
    },
    "bar2": null,
    "series": null,
    "table": {
      "title": "Budget d’acquisition — simulation illustrative",
      "headers": [
        "Mensualité",
        "Taux retenu",
        "Durée",
        "Budget indicatif"
      ],
      "labels": [
        "950 €",
        "1 250 €",
        "1 550 €"
      ]
    },
    "map": false,
    "insight": true
  },
  "migrations": {
    "desc": "Comprendre l’origine géographique des nouveaux habitants et les flux avec les territoires voisins.",
    "kpis": [
      "Nouveaux résidents",
      "Sortants",
      "Solde apparent",
      "Part des 25–39 ans"
    ],
    "bar1": {
      "title": "Origine des nouveaux résidents",
      "labels": [
        "Métropole voisine",
        "Autre commune de l’EPCI",
        "Même département",
        "Autre département"
      ]
    },
    "bar2": null,
    "series": null,
    "table": null,
    "map": true,
    "insight": true
  },
  "elections": {
    "desc": "Lire les résultats officiels en séparant les scrutins des orientations municipales en urbanisme.",
    "kpis": [
      "Participation municipale",
      "Liste majoritaire",
      "Sièges au conseil",
      "Mandat"
    ],
    "bar1": {
      "title": "Participation par scrutin",
      "labels": [
        "Municipales",
        "Législatives",
        "Présidentielle"
      ]
    },
    "bar2": null,
    "series": null,
    "table": {
      "title": "Vie institutionnelle — présentation",
      "headers": [
        "Fonction",
        "Information"
      ],
      "labels": [
        "Maire",
        "Adjoint à l’urbanisme",
        "Programme habitat"
      ]
    },
    "map": false,
    "insight": true
  },
  "equipements": {
    "desc": "Qualifier l’adresse par ses services de proximité et la qualité de son environnement résidentiel.",
    "kpis": [
      "Écoles",
      "Professionnels de santé",
      "Commerces",
      "Gare"
    ],
    "bar1": {
      "title": "Équipements par catégorie",
      "labels": [
        "Commerce",
        "Santé",
        "Enseignement",
        "Sport",
        "Transports"
      ]
    },
    "bar2": null,
    "series": null,
    "table": null,
    "map": true,
    "insight": true
  },
  "logements": {
    "desc": "Décrire le parc résidentiel, sa composition et les statuts d’occupation, en comparaison avec l’EPCI.",
    "kpis": [
      "Logements",
      "Résidences principales",
      "Maisons",
      "Logements vacants"
    ],
    "bar1": {
      "title": "Catégories de logements",
      "labels": [
        "Principales",
        "Secondaires",
        "Vacants"
      ]
    },
    "bar2": {
      "title": "Statut d’occupation",
      "labels": [
        "Propriétaires",
        "Locataires du privé",
        "Locataires HLM",
        "Gratuits"
      ]
    },
    "series": null,
    "table": {
      "title": "Résidences principales par nombre de pièces",
      "headers": [
        "Nombre de pièces",
        "Commune",
        "EPCI"
      ],
      "labels": [
        "1 pièce",
        "2 pièces",
        "3 pièces",
        "4 pièces",
        "5 pièces et +"
      ]
    },
    "map": false,
    "insight": true
  },
  "social": {
    "desc": "Mesurer le parc locatif social et sa distribution par catégories de logements.",
    "kpis": [
      "Logements sociaux",
      "Part du parc",
      "Vacance du parc social",
      "Logements récents"
    ],
    "bar1": {
      "title": "Parc social par typologie",
      "labels": [
        "T1",
        "T2",
        "T3",
        "T4",
        "T5+"
      ]
    },
    "bar2": null,
    "series": {
      "title": "Évolution du parc social",
      "count": 5
    },
    "table": null,
    "map": false,
    "insight": true
  },
  "sru": {
    "desc": "Visualiser l’objectif réglementaire de logements sociaux et la trajectoire de la commune.",
    "kpis": [
      "Taux SRU",
      "Objectif applicable",
      "Écart",
      "Période triennale"
    ],
    "bar1": {
      "title": "Objectif vs situation fictive",
      "labels": [
        "Taux constaté",
        "Objectif"
      ]
    },
    "bar2": null,
    "series": null,
    "table": {
      "title": "Suivi indicatif des objectifs",
      "headers": [
        "Indicateur",
        "Valeur illustrative"
      ],
      "labels": [
        "Logements sociaux SRU",
        "Résidences principales SRU",
        "Manque théorique"
      ]
    },
    "map": false,
    "insight": true
  },
  "zonage": {
    "desc": "Comprendre le classement ABC et ses implications pour les dispositifs de financement.",
    "kpis": [
      "Zonage ABC",
      "Référence",
      "BRS",
      "PTZ"
    ],
    "bar1": {
      "title": "Tension de marché — échelle illustrative",
      "labels": [
        "Zone A / Abis",
        "B1",
        "B2",
        "C"
      ]
    },
    "bar2": null,
    "series": null,
    "table": {
      "title": "Dispositifs à contrôler",
      "headers": [
        "Dispositif",
        "Conséquence à vérifier"
      ],
      "labels": [
        "BRS",
        "PTZ",
        "PLS",
        "LLI"
      ]
    },
    "map": false,
    "insight": true
  },
  "permis": {
    "desc": "Comparer les logements autorisés et commencés sur plusieurs années.",
    "kpis": [
      "Autorisés",
      "Commencés",
      "Collectifs",
      "Variation annuelle"
    ],
    "bar1": {
      "title": "Répartition des autorisations",
      "labels": [
        "Collectif",
        "Individuel pur",
        "Individuel groupé",
        "Résidences"
      ]
    },
    "bar2": null,
    "series": {
      "title": "Logements autorisés par année",
      "count": 5
    },
    "table": {
      "title": "Opérations identifiées — exemple",
      "headers": [
        "Nature",
        "Nombre de logements",
        "Statut"
      ],
      "labels": [
        "Collectif",
        "Individuel groupé",
        "Résidence"
      ]
    },
    "map": false,
    "insight": true
  },
  "prix": {
    "desc": "Analyser les prix immobiliers réellement enregistrés et les références pertinentes autour du foncier.",
    "kpis": [
      "Appartement médian",
      "Maison médiane",
      "Ventes / an",
      "Prix terrain"
    ],
    "bar1": {
      "title": "Transactions par typologie",
      "labels": [
        "Appartements",
        "Maisons",
        "Terrains"
      ]
    },
    "bar2": null,
    "series": {
      "title": "Évolution du prix médian des appartements",
      "count": 5
    },
    "table": {
      "title": "Références de transactions fictives",
      "headers": [
        "Date",
        "Type",
        "Surface",
        "Prix"
      ],
      "labels": [
        "2026-06",
        "2026-04",
        "2025-11"
      ]
    },
    "map": false,
    "insight": true
  },
  "loyers": {
    "desc": "Comparer les loyers d’annonce estimés et les typologies du parc privé.",
    "kpis": [
      "Appartements",
      "T1 / T2",
      "T3 et plus",
      "Maisons"
    ],
    "bar1": {
      "title": "Loyers estimés par typologie (échelle relative)",
      "labels": [
        "Tous appartements",
        "T1 / T2",
        "T3 et +",
        "Maisons"
      ]
    },
    "bar2": null,
    "series": null,
    "table": {
      "title": "Rendement brut — simple illustration",
      "headers": [
        "Type",
        "Loyer annuel simulé",
        "Prix d’achat simulé",
        "Rendement"
      ],
      "labels": [
        "T2",
        "T3",
        "Maison"
      ]
    },
    "map": false,
    "insight": true
  },
  "batiments": {
    "desc": "Croiser les informations sur le bâti existant et les performances énergétiques observées.",
    "kpis": [
      "Bâtiments",
      "DPE renseignés",
      "Classes F / G",
      "Parc avant 1975"
    ],
    "bar1": {
      "title": "Étiquettes DPE",
      "labels": [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G"
      ]
    },
    "bar2": {
      "title": "Périodes de construction",
      "labels": [
        "Avant 1949",
        "1949–1974",
        "1975–1999",
        "2000–2012",
        "Depuis 2013"
      ]
    },
    "series": null,
    "table": null,
    "map": false,
    "insight": true
  },
  "urbanisme": {
    "desc": "Visualiser les règles d’urbanisme qui conditionnent une première faisabilité.",
    "kpis": [
      "Zone PLU",
      "Hauteur maximale",
      "Emprise possible",
      "Pleine terre"
    ],
    "bar1": {
      "title": "Enjeux réglementaires — exemple qualitatif",
      "labels": [
        "Constructibilité",
        "Stationnement",
        "Pleine terre",
        "Retraits"
      ]
    },
    "bar2": null,
    "series": null,
    "table": {
      "title": "Règles foncières illustratives",
      "headers": [
        "Règle",
        "Prescription fictive",
        "Contrôle requis"
      ],
      "labels": [
        "Hauteur",
        "Retrait",
        "Stationnement",
        "Espaces verts"
      ]
    },
    "map": true,
    "insight": true
  },
  "finances": {
    "desc": "Mesurer la situation financière du territoire et les investissements locaux.",
    "kpis": [
      "Recettes de fonctionnement",
      "Dépenses",
      "Épargne brute",
      "Dette / hab."
    ],
    "bar1": {
      "title": "Répartition illustrative des dépenses",
      "labels": [
        "Personnel",
        "Achats et charges",
        "Transferts",
        "Autres"
      ]
    },
    "bar2": null,
    "series": {
      "title": "Investissements annuels en M€",
      "count": 5
    },
    "table": null,
    "map": false,
    "insight": true
  },
  "sources": {
    "desc": "Retrouver les producteurs, le niveau de précision, la qualité et la date des informations utilisées.",
    "kpis": [
      "Sources de départ",
      "Sources supplémentaires",
      "Périmètres",
      "Mise à jour"
    ],
    "bar1": {
      "title": "Couverture indicative des thèmes",
      "labels": [
        "Démographie",
        "Immobilier",
        "Environnement",
        "Urbanisme"
      ]
    },
    "bar2": null,
    "series": null,
    "table": {
      "title": "Sources à valider — présentation",
      "headers": [
        "Producteur",
        "Type",
        "Domaine"
      ],
      "labels": [
        "INSEE",
        "DVF / DGFiP",
        "Sitadel / SDES",
        "ADEME",
        "IGN / GPU",
        "BRGM / Géorisques",
        "SISPEA / Eaufrance"
      ]
    },
    "map": false,
    "insight": true
  }
};
