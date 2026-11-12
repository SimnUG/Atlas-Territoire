'use strict';
// Sources autorisées : DVF+ (DGFiP / data.gouv.fr, API publique Cerema)
// et Sitadel (SDES du ministère de la Transition écologique, diffusion DiDo).
// Aucun agrégat n'est estimé à partir d'un échantillon non exhaustif.
const CACHE=new Map();
function cache(key, fn, ttl=1800000){
 const old=CACHE.get(key);if(old&&old.exp>Date.now())return Promise.resolve(old.data);
 return Promise.resolve().then(fn).then(data=>{
  CACHE.set(key,{data,exp:Date.now()+ttl});
  if(CACHE.size>250)CACHE.delete(CACHE.keys().next().value);
  return data;
 });
}
async function fetchJSON(url,timeout=11000){
 const res=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(timeout)});
 if(!res.ok)throw Error('HTTP '+res.status+' : '+new URL(url).hostname);
 return res.json();
}
const DVF_SOURCE={nom:'DVF+ open-data — DGFiP / Cerema',url:'https://www.data.gouv.fr/datasets/dvfplus-open-data',niveau:'commune'};
const SIT_SOURCE={nom:'Sitadel — SDES / ministère de la Transition écologique',url:'https://www.data.gouv.fr/datasets/liste-des-permis-de-construire-et-autres-autorisations-durbanisme',niveau:'commune'};
function validInsee(code){return /^(?:[0-9]{5}|2[AB][0-9]{3})$/i.test(code||'')}
function safeNumber(v){if(v===null||v===undefined||v==='')return null;const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null}
function median(a){if(!a.length)return null;const b=[...a].sort((x,y)=>x-y);return b.length%2?b[(b.length-1)/2]:(b[b.length/2-1]+b[b.length/2])/2}
function field(obj,...keys){for(const key of keys){if(obj?.[key]!==undefined&&obj[key]!==null)return obj[key]}return null}
function emptyResult(source,message){return {source,statut:'indisponible',indicateurs:[],erreurs:[message],transactions:[],permis:[],exhaustif:false}}
async function dvf(code){
 if(!validInsee(code))return emptyResult(DVF_SOURCE,'Code INSEE invalide');
 return cache('dvf:'+code,async()=>{
  try{
   const data=[];
   let next='https://apidf-preprod.cerema.fr/dvf_opendata/mutations/?code_insee='+encodeURIComponent(code)+'&anneemut_min=2022&page_size=300&page=1';
   let total=null;
   const visited=new Set();
   const maxPages=12;
   for(let page=0;page<maxPages&&next;page++){
    if(visited.has(next))break;visited.add(next);
    const raw=await fetchJSON(next,13500);
    const list=Array.isArray(raw)?raw:field(raw,'results','data','items');
    if(!Array.isArray(list))throw Error('Format de réponse DVF non reconnu');
    data.push(...list);
    if(Number.isFinite(Number(raw?.count)))total=Number(raw.count);
    const candidate=raw?.next;
    next=(typeof candidate==='string'&&candidate)?candidate:null;
    if(next&&!next.startsWith('https://apidf-preprod.cerema.fr/'))throw Error('Pagination DVF non autorisée');
   }
   const complete=!next && (total===null||data.length>=total);
   const known=new Map();
   for(const raw of data){
    const id=field(raw,'idmutation','idmut','idopendata','idnatmut');
    if(!id)continue;
    const value=safeNumber(field(raw,'valeurfonc','valeur_fonciere'));
    const surface=safeNumber(field(raw,'sbati','surface_reelle_bati'));
    const date=field(raw,'datemut','date_mutation');
    const type=field(raw,'codtypbien','type_local','libtypbien');
    const geo=field(raw,'codcomm','code_insee','commune');
    if(geo!==null && String(geo)!==code)continue;
    if(!known.has(String(id)))known.set(String(id),{
      id:String(id),valeur:value,surface:surface>0?surface:null,date:date||null,
      type:type===null?null:String(type),prix_m2:value>0&&surface>0?Math.round(value/surface):null
    });
   }
   const tx=[...known.values()];
   const prices=tx.filter(x=>x.prix_m2>0&&x.prix_m2<30000).map(x=>x.prix_m2);
   const indicators=[];
   // Les totaux statistiques sont publiés SEULEMENT si toutes les pages ont été chargées.
   if(complete){
    indicators.push({nom:'Mutations immobilières recensées (depuis 2022)',valeur:tx.length,unite:'mutations',millesime:null,niveau:'commune',source:DVF_SOURCE,statut:'disponible'});
    if(prices.length>=5)indicators.push({nom:'Médiane €/m² — mutations avec surface bâtie renseignée',valeur:Math.round(median(prices)),unite:'€/m²',millesime:null,niveau:'commune',source:DVF_SOURCE,statut:'disponible',avertissement:'Indicateur exploratoire, non ventilé par typologie ; exclut les mutations sans surface bâtie et les prix aberrants.'});
   }
   return {source:DVF_SOURCE,statut:complete?'disponible':'partiel',indicateurs:indicators,
      transactions:tx.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,30),
      nombre_observations_lues:data.length,exhaustif:complete,
      erreurs:complete?[]:['Pagination limitée : statistiques non calculées, seules des mutations individuelles sont montrées.']};
  }catch(e){return emptyResult(DVF_SOURCE,'Service DVF+ : '+e.message)}
 },1800000);
}
const DIDO_BASE='https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1';
function rowsOf(raw){if(Array.isArray(raw))return raw;for(const key of ['results','data','rows','items'])if(Array.isArray(raw?.[key]))return raw[key];return []}
function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()}
function columnsOf(meta){return meta?.columns||meta?.millesime?.columns||meta?.schema?.columns||[]}
function colName(c){return String(c?.name||c?.code||c?.id||'')}
function arrayFromCatalog(raw){return rowsOf(raw)}
async function sitadel(code){
 if(!validInsee(code))return emptyResult(SIT_SOURCE,'Code INSEE invalide');
 return cache('sitadel:'+code,async()=>{
  try{
   // Découverte dynamique : les identifiants de fichiers et leurs millésimes
   // peuvent changer à la mise à jour du catalogue DiDo.
   const files=await cache('dido-files',async()=>{
     const u=DIDO_BASE+'/datafiles?text='+encodeURIComponent('logements autorisés')+'&pageSize=100';
     return arrayFromCatalog(await fetchJSON(u,13000));
   },86400000);
   const candidates=files.filter(x=>{
      const name=normalize([x.title,x.name,x.description].join(' '));
      return name.includes('COMMUN')&&(name.includes('LOGEMENT')||name.includes('AUTORIS'));
   });
   if(!candidates.length)return emptyResult(SIT_SOURCE,'Catalogue DiDo : fichier de logements communaux non identifié automatiquement');
   const errors=[];
   for(const candidate of candidates.slice(0,5)){
     const id=field(candidate,'rid','id','_id');
     if(!id||! /^[0-9a-z-]{8,64}$/i.test(String(id)))continue;
     let meta;
     try{meta=await fetchJSON(DIDO_BASE+'/datafiles/'+encodeURIComponent(id),10000)}
     catch(e){errors.push('Métadonnées '+id+' : '+e.message);continue}
     const columns=columnsOf(meta);
     const names=columns.map(colName);
     const geo=names.find(n=>/^(COMMUNE_CODE|CODE_COMMUNE|CODGEO|COD_COM|COM_CODE)$/.test(n));
     const annee=names.find(n=>/^(ANNEE|ANNEE_PC|YEAR)$/.test(n));
     const log=names.find(n=>/^(LOG_COM|NB_LOG_AUT|NOMBRE_LOGEMENTS_AUTORISES|LOG_AUT|NB_LOG)$/.test(n));
     if(!geo||!log){errors.push('Schéma Sitadel non reconnu pour '+id);continue}
     const u=new URL(DIDO_BASE+'/datafiles/'+encodeURIComponent(id)+'/json');
     u.searchParams.set(geo,'eq:'+code);
     u.searchParams.set('pageSize','200');
     let data;
     try{data=await fetchJSON(u.toString(),13000)}
     catch(e){errors.push('Données Sitadel '+id+' : '+e.message);continue}
     const rows=rowsOf(data).filter(r=>String(r[geo]||'')===code);
     const observations=rows.map(r=>({annee:annee?safeNumber(r[annee]):null,valeur:safeNumber(r[log])}))
      .filter(r=>r.valeur!==null&&r.annee!==null&&r.annee>=2000&&r.annee<=2026);
     if(!observations.length){errors.push('Pas de lignes annuelles authentifiées pour '+id);continue}
     const lastYear=Math.max(...observations.map(r=>r.annee));
     const ofYear=observations.filter(r=>r.annee===lastYear);
     // Pas de somme en cas de présence de dimensions multiples non filtrées.
     if(ofYear.length!==1){errors.push('Plusieurs lignes Sitadel pour une année : ventilation non déterminée');continue}
     return {source:SIT_SOURCE,statut:'disponible',erreurs:errors,exhaustif:true,
       indicateurs:[{nom:'Logements autorisés — dernière année disponible',valeur:ofYear[0].valeur,
         unite:'logements',millesime:lastYear,niveau:'commune',source:SIT_SOURCE,statut:'disponible',
         dataset:String(id)}],permis:[]};
   }
   return emptyResult(SIT_SOURCE,'DiDo : impossible de vérifier un fichier communal, ses colonnes et sa granularité. '+errors.slice(0,2).join('; '));
  }catch(e){return emptyResult(SIT_SOURCE,'Service officiel DiDo : '+e.message)}
 },1800000);
}
module.exports={dvf,sitadel};
