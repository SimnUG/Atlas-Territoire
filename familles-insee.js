'use strict';
/* Données officielles INSEE Melodi pour l'onglet "Familles et ménages".
 *
 * Sources :
 *  - DS_RP_MENAGES_COMP : ménages selon leur composition (RP, exploitation complémentaire)
 *  - DS_RP_FAMILLE_COMP : structure des familles et nombre d'enfants de moins de 25 ans
 *
 * Les mêmes jeux servent aux observations communales, EPCI et France.
 * Éléments de structure / graphiques : exclusivement côté navigateur, ailleurs.
 * Aucune valeur manquante n'est transformée en zéro.
 */
const BASE='https://api.insee.fr/melodi/data/';
const SOURCE={nom:'INSEE — Recensement de la population, API Melodi',
 url:'https://api.insee.fr/melodi',licence:'Licence Ouverte 2.0',
 method:'RP 2023 et RP 2017 — exploitations complémentaires, géographie au 01/01/2026'};
const DATASETS=Object.freeze({
 menages:'DS_RP_MENAGES_COMP',
 familles:'DS_RP_FAMILLE_COMP'
});
const LABELS=Object.freeze({
 menages:['2','11','12'],
 familles:['21','22','1'],
 enfants:['CH0_Y_LT25','CH1_Y_LT25','CH2_Y_LT25','CH3_Y_LT25','CH_GE4_Y_LT25']
});
const CACHE=new Map();
const PENDING=new Map();
const YEARS=new Set([2012,2017,2023]);
const validGeo=/^(?:COM-(?:[0-9]{5}|2[AB][0-9]{3})|EPCI-[0-9]{9}|FRANCE-1)$/i;
function number(v){
 if(typeof v==='number'&&Number.isFinite(v)&&v>=0)return v;
 if(typeof v==='string'&&v.trim()!==''&&Number.isFinite(Number(v))&&Number(v)>=0)return Number(v);
 return null;
}
function rowsFrom(payload,geo){
 if(!validGeo.test(geo))throw Error('Géographie INSEE incorrecte');
 if(payload?.paging?.next)throw Error('Pagination INSEE incomplète');
 const source=Array.isArray(payload?.observations)?payload.observations:[];
 return source.map(item=>{
  const d=item?.dimensions||{};
  const observation=number(item?.measures?.OBS_VALUE_NIVEAU?.value);
  const actual=String(d.GEO||'').toUpperCase(),code=geo.toUpperCase();
  if(!(actual===code||actual.endsWith('-'+code)))return null;
  const year=Number(d.TIME_PERIOD);
  if(!YEARS.has(year)||observation===null)return null;
  if(item?.attributes?.OBS_STATUS&&item.attributes.OBS_STATUS!=='A')return null;
  return {year,d,value:observation};
 }).filter(Boolean);
}
function one(rows,year,filter){
 const matches=rows.filter(r=>r.year===year&&Object.entries(filter).every(([k,v])=>String(r.d[k])===String(v)));
 return matches.length===1?matches[0].value:null;
}
function point(value,total,previous){
 if(value===null||value===undefined)return{value:null,share:null,change:null};
 return{
  value:Math.round(value),
  share:total!==null&&total>0?Math.round((value/total)*1000)/10:null,
  change:previous!==null&&previous>0?Math.round((value/previous-1)*1000)/10:null
 };
}
function getSection(rows,kind){
 const year=2023,prev=2017;
 const families=kind==='familles'||kind==='enfants';
 const numeratorField=kind==='enfants'?'NCH':families?'TFN':'TPH';
 const base=families?
  {RP_MEASURE:'NBFAM',TFN:'_T',NCH:'_T'}:
  {RP_MEASURE:'DWELLINGS',OCS:'DW_MAIN',PCS:'_T',TPH:'_T'};
 const total=one(rows,year,base);
 const rowResults=LABELS[kind].map(key=>{
  const query={...base,[numeratorField]:key};
  return point(one(rows,year,query),total,one(rows,prev,query));
 });
 return{
  rows:rowResults,year,previousYear:prev,source:SOURCE,
  dataset:families?DATASETS.familles:DATASETS.menages,
  denominator:total===null?null:Math.round(total)
 };
}
async function request(dataset,geo){
 if(!Object.values(DATASETS).includes(dataset)||!validGeo.test(geo))throw Error('Jeu ou géographie non autorisé');
 const key=dataset+':'+geo;
 const cached=CACHE.get(key);
 if(cached&&cached.until>Date.now())return cached.data;
 if(PENDING.has(key))return PENDING.get(key);
 const work=(async()=>{
  const url=new URL(BASE+dataset);
  url.searchParams.set('GEO',geo);
  url.searchParams.set('maxResult','350');
  const response=await fetch(url.toString(),{signal:AbortSignal.timeout(16000),
   headers:{Accept:'application/json','User-Agent':'AtlasTerritoires-INSEE/2.0'}});
  if(!response.ok)throw Error('Melodi HTTP '+response.status);
  const json=await response.json();
  const rows=rowsFrom(json,geo);
  CACHE.set(key,{data:rows,until:Date.now()+12*3600000});
  if(CACHE.size>600)CACHE.delete(CACHE.keys().next().value);
  return rows;
 })();
 PENDING.set(key,work);
 try{return await work}
 finally{PENDING.delete(key)}
}
function emptySections(){
 return{
  menages:{commune:null,epci:null,france:null},
  familles:{commune:null,epci:null,france:null},
  enfants:{commune:null,epci:null,france:null}
 };
}
async function families({commune,epci}){
 if(!/^(?:[0-9]{5}|2[AB][0-9]{3})$/i.test(commune||''))throw Error('Code commune invalide');
 if(epci && !/^[0-9]{9}$/.test(epci))throw Error('Code EPCI invalide');
 const output={source:SOURCE,code_insee:commune,code_epci:epci||null,
  sections:emptySections(),errors:[],generated_at:new Date().toISOString()};
 const geos=[['commune','COM-'+commune],['france','FRANCE-1']];
 if(epci)geos.push(['epci','EPCI-'+epci]);
 await Promise.all(geos.flatMap(([level,geo])=>Object.values(DATASETS).map(async dataset=>{
  try{
   const rows=await request(dataset,geo);
   if(dataset===DATASETS.menages)output.sections.menages[level]=getSection(rows,'menages');
   else {
    output.sections.familles[level]=getSection(rows,'familles');
    output.sections.enfants[level]=getSection(rows,'enfants');
   }
  }catch(error){output.errors.push(level+' '+dataset+' : '+error.message)}
 })));
 return output;
}
module.exports={families,rowsFrom,one,point,getSection,emptySections,SOURCE,DATASETS,LABELS};
