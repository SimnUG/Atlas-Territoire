'use strict';

/**
 * ATLAS Territoires: sources EXCLUSIVEMENT officielles autorisées :
 * INSEE (Melodi), data.gouv.fr (API découpage administratif), ADEME (DPE).
 *
 * Chaque observation renvoie la source, l'échelle et le millésime.
 * Les erreurs de réseau ne sont JAMAIS remplacées par des données simulées.
 */
const cache = new Map();
const market = require('./market-data');
const demographicDetails = require('./demographics');
function memo(key, func, lifetime=3600000) {
  const prev=cache.get(key);
  if(prev && prev.exp>Date.now())return Promise.resolve(prev.data);
  return Promise.resolve().then(func).then(data=>{cache.set(key,{data,exp:Date.now()+lifetime}); if(cache.size>350)cache.delete(cache.keys().next().value); return data});
}
async function json(url, timeout=8500) {
  const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'AtlasTerritoires/1.0 (public official data)'},signal:AbortSignal.timeout(timeout)});
  if(!r.ok)throw Error('Source HTTP '+r.status);
  return r.json();
}
const SRC={
 insee:{nom:'INSEE — API Melodi',url:'https://api.insee.fr/melodi',niveau:'commune'},
 geo:{nom:'Référentiel administratif — data.gouv.fr / INSEE',url:'https://geo.api.gouv.fr/',niveau:'commune'},
 ademe:{nom:'ADEME — DPE logements existants',url:'https://data.ademe.fr/datasets/dpe03existant',niveau:'adresse'},
 ofgl:{nom:'DGCL — OFGL, comptes des communes',url:'https://data.ofgl.fr/explore/dataset/ofgl-base-communes/',niveau:'commune'}
};
const empty=(nom,source,msg)=>({nom,statut:'indisponible',message:msg||'Donnée non disponible',source});
function indicator(nom,valeur,unite,millesime,source,niveau='commune',extra={}) {
 return {nom,valeur,unite,millesime,source,niveau,statut:'disponible',...extra};
}
function asObservations(payload){
 // Melodi : observations.dimensions est un tableau de lignes.
 // observations.measures est un dictionnaire de séries, notamment OBS_VALUE.
 const block=payload?.observations;
 if(Array.isArray(block))return block;
 if(!block||!Array.isArray(block.dimensions))return [];
 const attrs=Array.isArray(block.attributes)?block.attributes:[];
 const measures=block.measures||{};
 return block.dimensions.map((dimensions,i)=>{
  const m={};
  if(Array.isArray(measures)){
   const row=measures[i]||{};
   for(const [k,v] of Object.entries(row))m[k]=v;
  }else if(typeof measures==='object'){
   for(const [k,rows] of Object.entries(measures)){
    if(Array.isArray(rows)){const entry=rows[i];m[k]=typeof entry==='object'&&entry!==null?entry.value??entry:entry}
    else if(rows&&typeof rows==='object'&&Array.isArray(rows.values)){m[k]=rows.values[i]}
   }
  }
  return {dimensions,measures:m,attributes:attrs[i]||{}};
 });
}
function cell(o,k){const v=o?.dimensions?.[k];return typeof v==='object'?v.value??v.id??null:v??null}
function value(o){
 const m=o?.measures||{};
 for(const entry of Object.values(m)){
  const raw=typeof entry==='object'&&entry!==null?entry.value:entry;
  if(raw===null||raw===undefined||raw==='')continue;
  const n=Number(raw);if(Number.isFinite(n))return n;
 }
 return null;
}
function geoMatches(o,code){
 const g=cell(o,'GEO');
 return g===code||String(g).endsWith('-'+code);
}
function year(o){const v=cell(o,'TIME_PERIOD');return /^\d{4}$/.test(String(v))?Number(v):null}
function latest(arr){return arr.sort((a,b)=>(b.millesime||0)-(a.millesime||0))[0]}
function normalized(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'')}
async function melodi(dataset, code, extra={}) {
 const u=new URL('https://api.insee.fr/melodi/data/'+dataset);
 u.searchParams.set('GEO','COM-'+code);
 u.searchParams.set('maxResult','100');
 Object.entries(extra).forEach(([k,v])=>u.searchParams.set(k,v));
 return memo('melodi:'+u.search,()=>json(u.toString()),1800000);
}
async function population(code){
 const errors=[];
 const indicators=[];
 try{
   const r=await melodi('DS_POPULATIONS_REFERENCE',code,{POPREF_MEASURE:'PMUN'});
   const observations=asObservations(r).map(o=>({valeur:value(o),millesime:year(o),mesure:cell(o,'POPREF_MEASURE'),geo:cell(o,'GEO')}))
      .filter(x=>x.valeur!==null && x.millesime && x.mesure==='PMUN' && (x.geo===code||String(x.geo).endsWith('-'+code)));
   const row=latest(observations);
   if(row)indicators.push(indicator('Population municipale',Math.round(row.valeur),'habitants',row.millesime,SRC.insee,'commune',{dataset:'DS_POPULATIONS_REFERENCE'}));
   else errors.push('Population municipale : aucune observation officielle exploitable');
 }catch(e){errors.push('Population municipale : '+e.message)}
 try{
   const r=await melodi('DS_FILOSOFI_CC',code,{FILOSOFI_MEASURE:'MED_SL'});
   const obs=asObservations(r).map(o=>({valeur:value(o),millesime:year(o),mesure:cell(o,'FILOSOFI_MEASURE'),geo:cell(o,'GEO')}))
     .filter(x=>x.valeur!==null&&x.millesime&&x.mesure==='MED_SL'&&(x.geo===code||String(x.geo).endsWith('-'+code)));
   const row=latest(obs);
   if(row)indicators.push(indicator('Niveau de vie médian',Math.round(row.valeur),'€/an par unité de consommation',row.millesime,SRC.insee,'commune',{dataset:'DS_FILOSOFI_CC'}));
   else errors.push('Niveau de vie médian : aucune observation officielle exploitable');
 }catch(e){errors.push('Niveau de vie médian : '+e.message)}
 return {indicateurs:indicators,erreurs:errors};
}
async function administrative(code){
 const u=new URL('https://geo.api.gouv.fr/communes/'+code);
 u.searchParams.set('fields','nom,code,population,codeDepartement,codesPostaux');
 u.searchParams.set('format','json');
 try{
  const data=await memo('commune:'+code,()=>json(u.toString()),86400000);
  const indicators=[];
  if(Number.isFinite(Number(data.population))&&data.population!==null){
    indicators.push(indicator('Population de référence (API Géo)',Number(data.population),'habitants',null,SRC.geo,'commune',
      {avertissement:'Le millésime de la population n’est pas fourni par cette API ; la valeur INSEE Melodi avec année explicite est privilégiée.'}));
  }
  return {commune:data.nom||null,indicateurs:indicators,erreurs:[]};
 }catch(e){return {commune:null,indicateurs:[],erreurs:['Référentiel administratif : '+e.message]}}
}
function dpeRecord(line){
 const obj=line||{};
 const find=(...keys)=>{for(const key of keys)if(obj[key]!==undefined&&obj[key]!==null&&obj[key]!=='')return obj[key];return null};
 return {
  numero:find('numero_dpe','Numero_DPE'),date:find('date_etablissement_dpe','date_etablissement_dpe_','date_etablissement'),
  dpe:find('etiquette_dpe','classe_dpe','etiquette_dpe_actuelle'),ges:find('etiquette_ges','classe_ges'),
  surface:find('surface_habitable_logement','surface_habitable'),adresse:find('ban_label','adresse_complete_brut','adresse_brut'),
  ban_id:find('ban_id','identifiant_ban'),postcode:find('ban_postcode','code_postal_brut'),citycode:find('ban_citycode','code_insee_ban')
 };
}
async function ademeDpe(adresse,code,postcode,banId){
 const datasets=['dpe03existant'];
 const errors=[];
 const records=[];
 const qs=banId||adresse;
 for(const ds of datasets){
  const url=new URL('https://data.ademe.fr/data-fair/api/v1/datasets/'+ds+'/lines');
  url.searchParams.set('qs',qs);url.searchParams.set('size','40');
  try{
    const data=await memo('ademe:'+url.search,()=>json(url.toString(),11000),3600000);
    const matches=Array.isArray(data.results)?data.results:[];
    for(const original of matches){
      const d=dpeRecord(original);
      // La correspondance doit être probante ; jamais d'association sur la seule commune.
      const exactId=!!(banId && d.ban_id && d.ban_id===banId);
      const exactAddress=!!(d.adresse && normalized(d.adresse)===normalized(adresse));
      const sameCode=!d.citycode||d.citycode===code;
      const samePostal=!d.postcode||!postcode||String(d.postcode)===String(postcode);
      if((exactId||exactAddress)&&sameCode&&samePostal&&d.numero){
        records.push({...d,source:SRC.ademe,niveau:'adresse',statut:'disponible'});
      }
    }
  }catch(e){errors.push('ADEME : '+e.message)}
 }
 const unique=[...new Map(records.map(x=>[x.numero,x])).values()];
 return {enregistrements:unique.slice(0,20),nombre_resultats_exacts:unique.length,erreurs:errors};
}
async function emploi(code){
 const out=[],errors=[];
 const defs=[
  {dataset:'DS_RP_EMPLOI_LR_PRINC',nom:'Actifs résidents de 15 à 64 ans ayant un emploi',filters:{AGE:'Y15T64',EMPSTA_ENQ:'1',SEX:'_T'},extra:[]},
  {dataset:'DS_RP_EMPLOI_LT_PRINC',nom:'Emplois au lieu de travail',filters:{EMPFORM:'_T',SEX:'_T',EMPSTA_ENQ:'1',WKTIME:'_T'},extra:[]}
 ];
 await Promise.all(defs.map(async d=>{
  try{
   const raw=await melodi(d.dataset,code,d.filters);
   const match=asObservations(raw).filter(o=>{
     if(!geoMatches(o,code)||value(o)===null||year(o)===null)return false;
     for(const [k,v] of Object.entries(d.filters)){
       if(String(cell(o,k))!==v)return false;
     }
     return true;
   }).map(o=>({valeur:value(o),millesime:year(o)}));
   const selected=latest(match);
   if(selected)out.push(indicator(d.nom,Math.round(selected.valeur),'personnes',selected.millesime,SRC.insee,'commune',{dataset:d.dataset}));
   else errors.push(d.nom+' : aucune observation correspondant exactement aux filtres');
  }catch(e){errors.push(d.nom+' : '+e.message)}
 }));
 return {indicateurs:out,erreurs:errors};
}
async function logements(code){
 const indicators=[],errors=[];
 try{
   const result=await melodi('DS_RP_LOGEMENT_PRINC',code,{OCS:'DW_MAIN',TDW:'_T'});
   const matches=asObservations(result).map(o=>({
     valeur:value(o),millesime:year(o),oc:cell(o,'OCS'),typ:cell(o,'TDW'),geo:cell(o,'GEO')
   })).filter(x=>x.valeur!==null&&x.millesime&&x.oc==='DW_MAIN'&&x.typ==='_T'&&(x.geo===code||String(x.geo).endsWith('-'+code)));
   const chosen=latest(matches);
   if(chosen)indicators.push(indicator('Résidences principales',Math.round(chosen.valeur),'logements',chosen.millesime,SRC.insee,'commune',{dataset:'DS_RP_LOGEMENT_PRINC'}));
   else errors.push('Logements INSEE : aucune observation exploitable');
 }catch(e){errors.push('Logements INSEE : '+e.message)}
 return {indicateurs:indicators,erreurs:errors};
}

async function finances(code){
 const out=[],errors=[];
 const url=new URL('https://data.ofgl.fr/api/explore/v2.1/catalog/datasets/ofgl-base-communes/records');
 url.searchParams.set('where','com_code="'+code+'" and year(exer)=2025 and type_de_budget="Budget principal"');
 url.searchParams.set('limit','100');
 try{
  const resp=await memo('ofgl:'+code,()=>json(url.toString(),11000),3600000);
  const records=Array.isArray(resp.results)?resp.results:[];
  const allowed=new Map([
   ['RECETTES DE FONCTIONNEMENT','Recettes de fonctionnement'],
   ['DEPENSES DE FONCTIONNEMENT','Dépenses de fonctionnement'],
   ['EPARGNE BRUTE','Épargne brute'],
   ['DEPENSES D EQUIPEMENT',"Dépenses d'équipement"]
  ]);
  for(const line of records){
   if(String(line.com_code)!==code||line.type_de_budget!=='Budget principal')continue;
   const raw=normalized(line.agregat).replace(/([A-Z])([A-Z])/g,'$1$2');
   const found=[...allowed].find(([key])=>normalized(key)===raw);
   const montant=Number(line.montant);
   if(found&&Number.isFinite(montant)){
      out.push(indicator(found[1],Math.round(montant),'€',2025,SRC.ofgl,'commune',{dataset:'ofgl-base-communes'}));
   }
  }
  if(out.length===0)errors.push('OFGL : pas de comptes 2025 répondant aux critères stricts');
 }catch(e){errors.push('OFGL : '+e.message)}
 return {indicateurs:out,erreurs:errors};
}

function deadline(task,ms,fallback){
 return Promise.race([
  Promise.resolve().then(task).catch(e=>({...fallback,erreurs:[...fallback.erreurs,'Service : '+e.message]})),
  new Promise(resolve=>setTimeout(()=>resolve(fallback),ms))
 ]);
}

async function analyze({code_insee,adresse,code_postal,ban_id}){
 if(!/^([0-9]{5}|2[AB][0-9]{3})$/i.test(code_insee||''))throw Error('Code INSEE invalide');
 const [insee,geo,dpe,ofgl,rpLogements,dvf,sitadel,ages,employment]=await Promise.all([
   population(code_insee), administrative(code_insee),
   adresse?ademeDpe(adresse,code_insee,code_postal,ban_id):Promise.resolve({enregistrements:[],nombre_resultats_exacts:0,erreurs:[]}), finances(code_insee), logements(code_insee), deadline(()=>market.dvf(code_insee),26000,{source:{nom:'DVF+ — DGFiP / Cerema',niveau:'commune'},statut:'indisponible',indicateurs:[],transactions:[],erreurs:['Délai maximum de réponse DVF+ dépassé'],exhaustif:false}),
   deadline(()=>market.sitadel(code_insee),26000,{source:{nom:'Sitadel — SDES',niveau:'commune'},statut:'indisponible',indicateurs:[],permis:[],erreurs:['Délai maximum de réponse Sitadel dépassé'],exhaustif:false}),
   demographicDetails.demographics({melodi,asObservations,code:code_insee}), emploi(code_insee)
 ]);
 const byName=new Map();
 for(const v of [...geo.indicateurs,...insee.indicateurs,...ofgl.indicateurs,...rpLogements.indicateurs,...dvf.indicateurs,...sitadel.indicateurs,...employment.indicateurs])byName.set(v.nom,v);
 const all=[...byName.values()];
 // Référence Melodi prioritaire ; la population API Géo conserve un statut informatif sans millésime.
 const stats={population:all.filter(x=>x.nom.startsWith('Population')),revenus:all.filter(x=>x.nom.startsWith('Niveau')),finances:ofgl.indicateurs,logements:rpLogements.indicateurs,prix:dvf.indicateurs,permis:sitadel.indicateurs,emploi:employment.indicateurs};
 return {code_insee,adresse:adresse||null,commune:geo.commune||null,
   categories:{population:stats.population,revenus:stats.revenus,finances:stats.finances,logements:stats.logements,prix:stats.prix,permis:stats.permis,population_age:ages.tranches_age,emploi:stats.emploi,dpe:dpe.enregistrements},
   indicateurs:all,dpe:{nombre_resultats_exacts:dpe.nombre_resultats_exacts,enregistrements:dpe.enregistrements},
   dvf,sitadel,
   sources:[SRC.insee,SRC.geo,SRC.ademe,SRC.ofgl,dvf.source,sitadel.source],
   erreurs:[...insee.erreurs,...geo.erreurs,...dpe.erreurs,...ofgl.erreurs,...rpLogements.erreurs,...dvf.erreurs,...sitadel.erreurs,...ages.erreurs,...employment.erreurs],
   indisponibles:['Autres catégories : connecteurs non encore validés'],
   genere_le:new Date().toISOString(),
   avertissement:'Les indicateurs agrégés portent sur la commune, pas sur le seul immeuble. Un DPE ne correspond à l’adresse que lorsque son identifiant BAN ou son adresse normalisée coïncide exactement.'
 };
}
module.exports={analyze,asObservations,dpeRecord,normalized};
