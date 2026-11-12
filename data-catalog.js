'use strict';
/* Registre de métadonnées : la présence d'un jeu dans le catalogue ne signifie
   PAS qu'il soit téléchargé ou automatiquement exploitable à toute échelle. */
const sources=[
  {
    "id": "insee",
    "nom": "INSEE",
    "type": "API + fichiers",
    "state": "connecteur",
    "url": "https://www.insee.fr/",
    "scope": [
      "commune",
      "IRIS",
      "département"
    ],
    "categories": [
      "population",
      "familles",
      "emploi",
      "salaires",
      "revenus",
      "migrations",
      "logements",
      "equipements"
    ],
    "notes": "API Melodi : limites de requêtes ; millésime obligatoire"
  },
  {
    "id": "dvf",
    "nom": "République française — Demandes de valeurs foncières (DVF)",
    "type": "fichiers + API DVF+",
    "state": "connecteur_a_valider",
    "url": "https://www.data.gouv.fr/datasets/demandes-de-valeurs-foncieres",
    "scope": [
      "mutation",
      "parcelle",
      "commune"
    ],
    "categories": [
      "prix",
      "commercialisation",
      "programmation"
    ],
    "notes": "Publication semestrielle ; couverture et conditions de réutilisation à respecter"
  },
  {
    "id": "transition",
    "nom": "Ministère de la Transition écologique et de la Cohésion des territoires",
    "type": "API + fichiers",
    "state": "catalogue",
    "url": "https://www.statistiques.developpement-durable.gouv.fr/",
    "scope": [
      "commune",
      "département",
      "bâtiment"
    ],
    "categories": [
      "permis",
      "social",
      "sru",
      "zonage",
      "environnement"
    ],
    "notes": "Vérifier la définition statistique et réglementaire de chaque indicateur"
  },
  {
    "id": "interieur",
    "nom": "Ministère de l'Intérieur",
    "type": "fichiers officiels",
    "state": "catalogue",
    "url": "https://www.data.gouv.fr/elections",
    "scope": [
      "commune",
      "bureau de vote"
    ],
    "categories": [
      "elections"
    ],
    "notes": "Résultats officiels et participation"
  },
  {
    "id": "urssaf",
    "nom": "Urssaf",
    "type": "API + fichiers",
    "state": "catalogue",
    "url": "https://open.urssaf.fr/",
    "scope": [
      "commune",
      "EPCI",
      "département"
    ],
    "categories": [
      "emploi",
      "salaires"
    ],
    "notes": "Données déclaratives et séries d'effectifs"
  },
  {
    "id": "sitadel",
    "nom": "Sitadel — SDES",
    "type": "API DiDo + fichiers",
    "state": "connecteur_a_valider",
    "url": "https://www.data.gouv.fr/datasets/logements-autorises-et-commences-series-mensuelles-communales-en-date-de-prise-en-compte",
    "scope": [
      "commune",
      "département"
    ],
    "categories": [
      "permis",
      "programmation"
    ],
    "notes": "Distinguer autorisés/commencés et date de prise en compte"
  },
  {
    "id": "anct",
    "nom": "ANCT",
    "type": "fichiers + outils",
    "state": "catalogue",
    "url": "https://www.anct.gouv.fr/",
    "scope": [
      "commune",
      "quartier"
    ],
    "categories": [
      "equipements",
      "population"
    ],
    "notes": "Indicateurs et zonages de politique territoriale"
  },
  {
    "id": "observatoire",
    "nom": "Observatoire des territoires",
    "type": "cartes + fichiers",
    "state": "catalogue",
    "url": "https://www.observatoire-des-territoires.gouv.fr/",
    "scope": [
      "commune",
      "EPCI",
      "département"
    ],
    "categories": [
      "population",
      "emploi",
      "environnement"
    ],
    "notes": "Comparer des indicateurs harmonisés"
  },
  {
    "id": "bdnb",
    "nom": "BDNB",
    "type": "API + fichiers massifs",
    "state": "catalogue",
    "url": "https://www.data.gouv.fr/datasets/base-de-donnees-nationale-des-batiments",
    "scope": [
      "bâtiment"
    ],
    "categories": [
      "batiments",
      "dpe"
    ],
    "notes": "Base nationale très volumineuse, requêtes ciblées recommandées"
  },
  {
    "id": "cstp",
    "nom": "CSTP (intitulé à préciser)",
    "type": "non déterminé",
    "state": "identification_necessaire",
    "url": null,
    "scope": [],
    "categories": [
      "batiments"
    ],
    "notes": "La référence CSTP ne suffit pas à identifier avec certitude un producteur et son jeu de données"
  },
  {
    "id": "ademe",
    "nom": "ADEME",
    "type": "API",
    "state": "connecteur",
    "url": "https://data.ademe.fr/",
    "scope": [
      "adresse",
      "bâtiment",
      "commune"
    ],
    "categories": [
      "dpe",
      "environnement"
    ],
    "notes": "Appariement strict nécessaire pour associer un DPE à une adresse"
  },
  {
    "id": "dpe_audit",
    "nom": "DPE — Audit",
    "type": "données publiques ADEME",
    "state": "catalogue",
    "url": "https://data.ademe.fr/",
    "scope": [
      "adresse",
      "bâtiment"
    ],
    "categories": [
      "dpe",
      "batiments"
    ],
    "notes": "Données et audits selon disponibilité légale"
  },
  {
    "id": "datagouv",
    "nom": "data.gouv.fr",
    "type": "API catalogue + téléchargements",
    "state": "catalogue_connecte",
    "url": "https://www.data.gouv.fr/",
    "scope": [
      "France",
      "commune",
      "adresse"
    ],
    "categories": [
      "toutes"
    ],
    "notes": "Portail de diffusion : vérifier l'identité du producteur de chaque jeu de données"
  },
  {
    "id": "dgcl_ofgl",
    "nom": "DGCL — OFGL",
    "type": "API Opendatasoft",
    "state": "connecteur",
    "url": "https://data.ofgl.fr/",
    "scope": [
      "commune",
      "EPCI",
      "département"
    ],
    "categories": [
      "finances"
    ],
    "notes": "Comptes et budgets ; exercice et nature budgétaire obligatoires"
  }
];
const jeux=[
  {
    "id": "insee_pop",
    "title": "Populations de référence",
    "producer": "INSEE",
    "source_id": "insee",
    "category": "population",
    "granularity": "commune",
    "access": "api",
    "status": "connecteur",
    "url": "https://api.insee.fr/melodi/data/DS_POPULATIONS_REFERENCE"
  },
  {
    "id": "insee_revenus",
    "title": "Niveaux de vie — Filosofi",
    "producer": "INSEE",
    "source_id": "insee",
    "category": "revenus",
    "granularity": "commune",
    "access": "api",
    "status": "connecteur_a_valider",
    "url": "https://api.insee.fr/melodi"
  },
  {
    "id": "insee_logements",
    "title": "Logements — recensement de la population",
    "producer": "INSEE",
    "source_id": "insee",
    "category": "logements",
    "granularity": "commune",
    "access": "api",
    "status": "connecteur_a_valider",
    "url": "https://api.insee.fr/melodi"
  },
  {
    "id": "insee_bpe",
    "title": "Base permanente des équipements",
    "producer": "INSEE",
    "source_id": "insee",
    "category": "equipements",
    "granularity": "commune, IRIS",
    "access": "fichiers",
    "status": "catalogue",
    "url": "https://www.data.gouv.fr/datasets/ensemble-des-jeux-de-donnees-sur-le-denombrement-des-equipements-commerce-sport-service-sante-enseignement-etc"
  },
  {
    "id": "dvf_raw",
    "title": "Demandes de valeurs foncières — mutations",
    "producer": "DGFiP",
    "source_id": "dvf",
    "category": "prix",
    "granularity": "mutation",
    "access": "fichiers",
    "status": "catalogue",
    "url": "https://www.data.gouv.fr/datasets/demandes-de-valeurs-foncieres"
  },
  {
    "id": "dvf_plus",
    "title": "DVF+ open data",
    "producer": "DGFiP / Cerema",
    "source_id": "dvf",
    "category": "prix",
    "granularity": "mutation, commune",
    "access": "api",
    "status": "connecteur_a_valider",
    "url": "https://www.data.gouv.fr/dataservices/api-donnees-foncieres"
  },
  {
    "id": "dvf_stats",
    "title": "Statistiques DVF",
    "producer": "data.gouv.fr (données DGFiP)",
    "source_id": "datagouv",
    "category": "prix",
    "granularity": "commune, section cadastrale",
    "access": "fichiers",
    "status": "catalogue",
    "url": "https://www.data.gouv.fr/datasets/statistiques-dvf"
  },
  {
    "id": "sitadel_logements",
    "title": "Logements autorisés et commencés — séries communales",
    "producer": "SDES",
    "source_id": "sitadel",
    "category": "permis",
    "granularity": "commune",
    "access": "api / csv",
    "status": "connecteur_a_valider",
    "url": "https://www.data.gouv.fr/datasets/logements-autorises-et-commences-series-mensuelles-communales-en-date-de-prise-en-compte"
  },
  {
    "id": "rpls",
    "title": "Répertoire du parc locatif social — RPLS",
    "producer": "SDES",
    "source_id": "transition",
    "category": "social",
    "granularity": "logement / commune",
    "access": "fichiers",
    "status": "catalogue",
    "url": "https://www.data.gouv.fr/datasets/donnees-detaillees-au-logement-du-repertoire-des-logements-locatifs-des-bailleurs-sociaux-rpls"
  },
  {
    "id": "bdnb",
    "title": "Base de données nationale des bâtiments",
    "producer": "BDNB",
    "source_id": "bdnb",
    "category": "batiments",
    "granularity": "bâtiment",
    "access": "api / fichiers",
    "status": "catalogue",
    "url": "https://www.data.gouv.fr/datasets/base-de-donnees-nationale-des-batiments"
  },
  {
    "id": "ademe_dpe",
    "title": "DPE logements existants",
    "producer": "ADEME",
    "source_id": "ademe",
    "category": "dpe",
    "granularity": "logement / adresse",
    "access": "api",
    "status": "connecteur",
    "url": "https://data.ademe.fr/datasets/dpe03existant"
  },
  {
    "id": "ofgl",
    "title": "Comptes individuels des communes",
    "producer": "DGCL — OFGL",
    "source_id": "dgcl_ofgl",
    "category": "finances",
    "granularity": "commune",
    "access": "api",
    "status": "connecteur",
    "url": "https://data.ofgl.fr/explore/dataset/ofgl-base-communes/"
  },
  {
    "id": "enaf",
    "title": "Consommation d'espaces naturels, agricoles et forestiers",
    "producer": "Ministère de la Transition écologique / Cerema",
    "source_id": "transition",
    "category": "environnement",
    "granularity": "commune",
    "access": "fichiers",
    "status": "catalogue",
    "url": "https://www.data.gouv.fr/datasets/consommation-despaces-naturels-agricoles-et-forestiers"
  },
  {
    "id": "elections",
    "title": "Élections municipales et données électorales officielles",
    "producer": "Ministère de l'Intérieur",
    "source_id": "interieur",
    "category": "elections",
    "granularity": "bureau de vote / commune",
    "access": "fichiers",
    "status": "catalogue",
    "url": "https://www.data.gouv.fr/pages/jeux-de-donnees-liees-aux-elections-municipales"
  }
];
const ttlCache=new Map();
function catalogue(categorie){
 const wanted=String(categorie||'').trim().toLowerCase();
 return {version:'1.0',sources:sources.filter(s=>!wanted||s.categories.includes(wanted)||s.id===wanted),
 jeux:jeux.filter(j=>!wanted||j.category===wanted||j.source_id===wanted),
 informations:{
  sources_autorisees:14,
  mode:'interrogation à la demande et mise en cache temporaire en mémoire',
  donnees_locales:'aucune réplication nationale des bases ; pas de persistance après redémarrage Render',
  garantie:'une donnée de catalogue ne constitue pas un indicateur géolocalisé',
  actualisation:'suivant chaque organisme, jamais assimilée à du temps réel',
  anonymisation:'pas de données nominatives, ni d’indexation des mutations DVF'
 }};
}
function allowedOrg(org){
 const n=String(org?.name||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 return /insee|institut national de la statistique|finances publiques|ministere de l|ministeres economiques|service des donnees et etudes statistiques|agence nationale de la cohesion|ademe|cerema|urssaf|observatoire des finances|direction generale des collectivites|republique francaise|base de donnees nationale des batiments/.test(n);
}
async function discover(q,page=1){
 if(!q||q.length<3||q.length>120)throw Error('Mot-clé de 3 à 120 caractères requis');
 const pageNum=Math.max(1,Math.min(10,Number(page)||1));
 const key=q.toLowerCase()+':'+pageNum;
 const hit=ttlCache.get(key);
 if(hit&&hit.expires>Date.now())return hit.body;
 const u=new URL('https://www.data.gouv.fr/api/1/datasets/');
 u.searchParams.set('q',q);u.searchParams.set('page_size','30');u.searchParams.set('page',String(pageNum));
 const response=await fetch(u.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(11000)});
 if(!response.ok)throw Error('Catalogue officiel indisponible (HTTP '+response.status+')');
 const body=await response.json();
 const filtered=(body.data||[]).filter(x=>allowedOrg(x.organization||x.owner)).map(x=>({
  id:x.id,titre:x.title,url:x.page||null,producteur:(x.organization||x.owner)?.name||'Producteur non identifié',
  actualisation:x.last_update||null,licence:x.license||null,
  ressources:(x.resources||[]).filter(r=>/csv|json|parquet|xls|zip|geojson/i.test(r.format||'')).map(r=>({titre:r.title,format:r.format,date:r.last_modified,url:r.url})).slice(0,8),
  statut:'catalogue uniquement',niveau:'à vérifier dans le schéma du jeu',
 }));
 const result={mot_cle:q,page:pageNum,total_brut:body.total||null,jeux_officiels:filtered,
  note:'Seuls les producteurs administratifs reconnus sont retenus. Les résultats ne sont pas automatiquement intégrés aux indicateurs de la commune.'};
 ttlCache.set(key,{body:result,expires:Date.now()+3600000});
 if(ttlCache.size>60)ttlCache.delete(ttlCache.keys().next().value);
 return result;
}
module.exports={catalogue,discover};
