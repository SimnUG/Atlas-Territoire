'use strict';
/**
 * Atlas Territoires — logement RP 2023 toutes communes (44/85 et France).
 *
 * INSEE Melodi, données publiées selon le COG du 01-01-2026 :
 * - DS_RP_SERIE_HISTORIQUE : séries 1968, ..., 2023, logements par catégorie
 * - DS_RP_LOGEMENT_PRINC : LOG (2017, 2023), pièces, tenure, emménagement
 * Chaque valeur est obtenue d'une observation portant exactement les dimensions
 * demandées. Aucune extrapolation de chiffres d'une autre commune.
 */
const DATA_ORIGIN='https://api.insee.fr/melodi/data/';
const DATASET_SERIES='DS_RP_SERIE_HISTORIQUE';
const DATASET_HOUSING='DS_RP_LOGEMENT_PRINC';
const HISTORY_YEARS=[1968,1975,1982,1990,1999,2007,2012,2017,2023];
const VALID_COMMUNE=/^(?:[0-9]{5}|2[AB][0-9]{3})$/i;
const VALID_EPCI=/^(?:[0-9]{9}|DEP-(?:44|85))$/;
const FULL_DIM=['NOR','TDW','TSH','L_STAY','BUILD_END','CARS','NRG_SRC','CARPARK','LIFT','NOC'];
const DATA_CACHE=new Map();
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
let REGIONAL_INDEX;
let regionalLoadAttempted=false;
function getIndexed(commune,epci){
 if(!/^(44|85)[0-9]{3}$/.test(commune))return null;
 if(!regionalLoadAttempted){
  regionalLoadAttempted=true;
  try{
   const filename=path.join(__dirname,'public','data','logements-44-85-2023.json.gz');
   const data=JSON.parse(zlib.gunzipSync(fs.readFileSync(filename)).toString('utf8'));
   if(data.schema==='ATLAS-RP-LOGEMENT-2023-44-85-v1'&&data.communes){
    REGIONAL_INDEX=data.communes;
   }
  }catch(_){REGIONAL_INDEX=null}
 }
 const value=REGIONAL_INDEX?.[commune];
 return value?.statut==='disponible'&&(!epci||value.epci?.code===epci)?value:null;
}

const MELODI_CACHE=new Map();
let nationalPromise=null;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const round=(n,dp=1)=>finite(n)?Number(n.toFixed(dp)):null;
const sum=(...n)=>n.every(finite)?n.reduce((a,b)=>a+b,0):null;
const rounded=n=>finite(n)?Math.round(n):null;
const pct=(n,denom)=>finite(n)&&finite(denom)&&denom>0?round(n/denom*100):null;
const variation=(last,old)=>finite(last)&&finite(old)&&old>0?round((last/old-1)*100):null;
function observations(payload,dataset){
 const values=payload?.observations;
 if(!Array.isArray(values))throw Error('Réponse INSEE invalide : '+dataset);
 if(payload?.paging?.next)throw Error('Pagination INSEE incomplète : '+dataset);
 return values;
}
async function melodi(dataset,geo,period=null){
 const key=dataset+'|'+geo+'|'+(period||'all');
 const prev=MELODI_CACHE.get(key);
 if(prev)return prev;
 const query=(async()=>{
  const url=new URL(DATA_ORIGIN+dataset);
  url.searchParams.set('GEO',geo);
  url.searchParams.set('maxResult','5000');
  if(period!==null)url.searchParams.set('TIME_PERIOD',String(period));
  const res=await fetch(url,{signal:AbortSignal.timeout(26000),
   headers:{'Accept':'application/json','User-Agent':'Atlas-Territoires/1.0 (INSEE open data)'}});
  if(!res.ok)throw Error('INSEE '+dataset+' HTTP '+res.status);
  return observations(await res.json(),dataset);
 })();
 MELODI_CACHE.set(key,query);
 if(MELODI_CACHE.size>1800)MELODI_CACHE.delete(MELODI_CACHE.keys().next().value);
 try{return await query}catch(e){MELODI_CACHE.delete(key);throw e}
}
function obsValue(row){
 const v=row?.measures?.OBS_VALUE_NIVEAU?.value;
 return finite(v)?v:null;
}
function one(rows,period,oc,filter=null,measure='DWELLINGS'){
 const matching=rows.filter(row=>{
  const d=row.dimensions||{};
  if(d.TIME_PERIOD!==String(period)||d.RP_MEASURE!==measure||d.OCS!==oc)return false;
  for(const key of FULL_DIM){
   const expected=filter?.[key]??'_T';
   if(d[key]!==undefined&&d[key]!==expected)return false;
  }
  return true;
 });
 return matching.length===1?obsValue(matching[0]):null;
}
function byYear(rows,oc){
 return HISTORY_YEARS.map(annee=>({
  annee,
  valeur:rounded(one(rows,annee,oc))
 }));
}
function field(rows,year,key,value,oc='DW_MAIN'){
 return one(rows,year,oc,{[key]:value});
}
function metrics(rows,year){
 return {
  total:one(rows,year,'_T'),
  principales:one(rows,year,'DW_MAIN'),
  secondaires:one(rows,year,'DW_SEC_DW_OCC'),
  vacants:one(rows,year,'DW_VAC'),
  maisons:field(rows,year,'TDW','1','_T'),
  appartements:field(rows,year,'TDW','2','_T'),
  autres:field(rows,year,'TDW','3T6','_T'),
  proprietaires:field(rows,year,'TSH','100'),
  locataires:field(rows,year,'TSH','200'),
  hlm:field(rows,year,'TSH','221'),
  gratuits:field(rows,year,'TSH','300'),
  piece1:field(rows,year,'NOR','R1'),
  piece2:field(rows,year,'NOR','R2'),
  piece3:field(rows,year,'NOR','R3'),
  piece4:field(rows,year,'NOR','R4'),
  piece5:field(rows,year,'NOR','R_GE5'),
  emmoins2:field(rows,year,'L_STAY','Y_LT2'),
  em2a4:field(rows,year,'L_STAY','Y2T4'),
  em5a9:field(rows,year,'L_STAY','Y5T9'),
  em10plus:sum(
   field(rows,year,'L_STAY','Y10T19'),
   field(rows,year,'L_STAY','Y20T29'),
   field(rows,year,'L_STAY','Y_GE30'))
 };
}
function ext(m){
 return {...m,
  horsHlm:sum(m.locataires,m.hlm===null?null:-m.hlm)};
}
function source(code,epci){
 return {
  organisme:'INSEE',
  libelle:'Recensement de la population 2023, géographie au 01/01/2026',
  annee:2023,
  url_commune:'https://www.insee.fr/fr/statistiques/9001791?geo=COM-'+code,
  url_epci:epci?'https://www.insee.fr/fr/statistiques/9001791?geo='+(epci.startsWith('DEP-')?epci:'EPCI-'+epci):null,
  url_france:'https://www.insee.fr/fr/statistiques/9001791?geo=FRANCE-F',
  url_millesime_2017:'https://www.insee.fr/fr/statistiques/8997194',
  jeux:[
   DATA_ORIGIN+DATASET_SERIES,
   DATA_ORIGIN+DATASET_HOUSING
  ]
 };
}
const TABLE_SCHEMA=[
 {id:'type',titre:'Logements par type de biens',denominateur:'total',
   lignes:[['Maisons','maisons'],['Appartements','appartements'],['Autres logements','autres']]},
 {id:'categorie',titre:'Logements par type de résidences',denominateur:'total',
   lignes:[['Résidences principales','principales'],['Résidences secondaires et logements occasionnels','secondaires'],['Logements vacants','vacants']]},
 {id:'occupation',titre:"Résidences principales par statut d'occupation",denominateur:'principales',
   lignes:[['Propriétaires','proprietaires'],['Locataires','locataires'],['dont locataires HLM','hlm'],['dont locataires hors HLM','horsHlm'],['Logés gratuitement','gratuits']]},
 {id:'pieces',titre:'Résidences principales par nombre de pièces',denominateur:'principales',
   lignes:[['1 pièce','piece1'],['2 pièces','piece2'],['3 pièces','piece3'],['4 pièces','piece4'],['5 pièces ou plus','piece5']]},
 {id:'anciennete',titre:"Résidences principales par ancienneté d'emménagement",denominateur:'principales',
   lignes:[['Moins de 2 ans','emmoins2'],['2 à 4 ans','em2a4'],['5 à 9 ans','em5a9'],['10 ans ou plus','em10plus']]}
];
function createArea(code,nom,series,housing){
 if(!Array.isArray(series)||!Array.isArray(housing))throw Error('Observations manquantes');
 const m23=ext(metrics(housing,2023)),m17=ext(metrics(housing,2017));
 if(!finite(m23.total)||!finite(m23.principales))throw Error('Aucune statistique LOG2023 pour '+code);
 const historique={
  total:{titre:'Logements totaux',donnees:byYear(series,'_T')},
  principales:{titre:'Résidences principales',donnees:byYear(series,'DW_MAIN')},
  secondaires:{titre:'Résidences secondaires & logements occasionnels',donnees:byYear(series,'DW_SEC_DW_OCC')},
  vacants:{titre:'Logements vacants',donnees:byYear(series,'DW_VAC')}
 };
 return {code,nom:nom||code,total:rounded(m23.total),totalBrut:m23.total,principalesBrut:m23.principales,
  m23,m17,historique};
}
function tableRows(area,table){
 const denominator=area.m23[table.denominateur];
 return table.lignes.map(([label,key])=>{
  const now=area.m23[key],before=area.m17[key];
  return {label,key,values:{
   2023:rounded(now),2017:rounded(before),
   part:pct(now,denominator),
   variation:variation(now,before)
  },brut:now};
 });
}
function assemble(commune,epci,france){
 const hist={};
 for(const key of ['total','principales','secondaires','vacants']){
  hist[key]={
   titre:commune.historique[key].titre,
   commune:commune.historique[key].donnees,
   epci:epci.historique[key].donnees
  };
 }
 const tableaux=TABLE_SCHEMA.map(t=>{
  const c=tableRows(commune,t),e=tableRows(epci,t),f=tableRows(france,t);
  return {id:t.id,titre:t.titre,denominateur:t.denominateur,lignes:
   c.map((r,i)=>({label:r.label,commune:r.values,epci:e[i].values,
    reference_france:pct(f[i].brut,france.m23[t.denominateur])}))};
 });
 return {
  statut:'disponible',
  commune:{nom:commune.nom,code:commune.code,total:commune.total},
  epci:{nom:epci.nom,code:epci.code,total:epci.total},
  source:source(commune.code,epci.code),
  historique:hist,tableaux,
  date_source:'2026-10-13',
  notes:"Données RP 2023 INSEE en géographie 2026. Évolutions calculées sur les effectifs non arrondis.",
  controles:{
   series:HISTORY_YEARS.length,
   sections:tableaux.length,
   lignes:tableaux.reduce((n,t)=>n+t.lignes.length,0),
   valeursManquantes:tableaux.reduce((n,t)=>n+t.lignes.reduce((k,r)=>k+['commune','epci'].reduce((s,l)=>s+(['2023','2017','part','variation'].filter(x=>r[l][x]===null).length),0),0),0)
  }
 };
}
async function getFrance(){
 if(!nationalPromise){
  nationalPromise=melodi(DATASET_HOUSING,'FRANCE-F','2023')
   .then(rows=>createArea('FRANCE-F','France',[],rows))
   .catch(e=>{nationalPromise=null;throw e});
 }
 return nationalPromise;
}
async function loadRemote({commune,epci,nomCommune,nomEpci}){
 const inputs=await Promise.all([
  melodi(DATASET_SERIES,'COM-'+commune),
  melodi(DATASET_HOUSING,'COM-'+commune),
  melodi(DATASET_SERIES,epci.startsWith('DEP-')?epci:'EPCI-'+epci),
  melodi(DATASET_HOUSING,epci.startsWith('DEP-')?epci:'EPCI-'+epci),
  getFrance()
 ]);
 const c=createArea(commune,nomCommune,inputs[0],inputs[1]);
 const e=createArea(epci,nomEpci,inputs[2],inputs[3]);
 const obj=assemble(c,e,inputs[4]);
 if(!obj.historique.total.commune.some(x=>x.valeur!==null))throw Error('Historique INSEE communal absent');
 return obj;
}
async function logement(args){
 const code=String(args?.commune||''),epci=String(args?.epci||'');
 if(!VALID_COMMUNE.test(code)||(epci&&!VALID_EPCI.test(epci)))throw Object.assign(new Error('Codes INSEE commune / EPCI invalides'),{status:400});
 // Dans les départements 44 et 85, l'index officiel est identifié PAR COMMUNE.
 // Ne jamais écarter les données si le profil administratif renvoie un autre EPCI
 // (retard de synchronisation, fusion communale ou indisponibilité du service).
 const indexed=getIndexed(code);
 if(indexed)return indexed;
 if(!epci)throw Object.assign(new Error('Commune non disponible dans la base locale INSEE. Code EPCI requis pour le repli en ligne.'),{status:404});
 const id=code+'/'+epci;
 const cached=DATA_CACHE.get(id);
 if(cached&&cached.expire>Date.now())return cached.promise;
 const promise=loadRemote(args);
 DATA_CACHE.set(id,{promise,expire:Date.now()+12*3600_000});
 if(DATA_CACHE.size>80)DATA_CACHE.delete(DATA_CACHE.keys().next().value);
 try{return await promise}
 catch(e){DATA_CACHE.delete(id);throw e}
}
module.exports={logement,melodi,one,metrics,ext,createArea,assemble,TABLE_SCHEMA,HISTORY_YEARS,observations,getIndexed};
