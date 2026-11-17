'use strict';
/*
 * ATLAS — Emploi et activité / INSEE Melodi.
 *
 * DS_RP_EMPLOI_LR_PRINC : résidents, statuts EMPSTA_ENQ et âges AGE.
 * DS_RP_EMPLOI_LT_PRINC : emplois au lieu de travail (NBEMP).
 * Périmètres : commune, EPCI et référence France entière (FRANCE-F).
 * Millésimes : 2012, 2017, 2023 ; géographie millésimée 2026.
 *
 * Ne jamais cumuler les dimensions contenant des agrégats _T.
 * Un chiffre absent ou ambigu devient null ; 0 n'est jamais substitué.
 */
const SOURCE={nom:'INSEE — Recensement de la population, API Melodi',
 url:'https://api.insee.fr/melodi',licence:'Licence Ouverte 2.0',
 methode:'RP 2012 / 2017 / 2023, exploitations principales au lieu de résidence et de travail'};
const BASE='https://api.insee.fr/melodi/data/';
const DATASETS={residence:'DS_RP_EMPLOI_LR_PRINC',travail:'DS_RP_EMPLOI_LT_PRINC'};
const YEARS=[2012,2017,2023];
const GEO=/^(?:COM-(?:[0-9]{5}|2[AB][0-9]{3})|EPCI-[0-9]{9}|FRANCE-F)$/i;
const CACHE=new Map(),PENDING=new Map();
function numeric(v){
 if(typeof v==='number'&&Number.isFinite(v)&&v>=0)return v;
 if(typeof v==='string'&&v.trim()!==''&&Number.isFinite(Number(v))&&Number(v)>=0)return Number(v);
 return null;
}
function rowsFrom(payload,geo){
 if(!GEO.test(geo))throw Error('Périmètre géographique non autorisé');
 if(payload?.paging?.next)throw Error('Pagination INSEE incomplète');
 return (Array.isArray(payload?.observations)?payload.observations:[]).map(o=>{
  const d=o?.dimensions||{},original=String(d.GEO||'').toUpperCase(),code=geo.toUpperCase();
  const year=Number(d.TIME_PERIOD),value=numeric(o?.measures?.OBS_VALUE_NIVEAU?.value);
  if(!(original===code||original.endsWith('-'+code))||!YEARS.includes(year)||value===null)return null;
  const status=o?.attributes?.OBS_STATUS;
  if(status&&status!=='A')return null;
  return {year,d,value};
 }).filter(Boolean);
}
function get(rows,year,filter){
 const found=rows.filter(r=>r.year===year&&Object.entries(filter).every(([key,v])=>String(r.d[key])===String(v)));
 return found.length===1?found[0].value:null;
}
const lrBase={SEX:'_T',EDUC:'_T',RP_MEASURE:'POP'};
const ltBase={SEX:'_T',EMPFORM:'_T',WKTIME:'_T',EMPSTA_ENQ:'1',RP_MEASURE:'NBEMP'};
function readLR(rows,year,code,age='Y15T64'){
 return get(rows,year,{...lrBase,AGE:age,EMPSTA_ENQ:code});
}
function readLT(rows,year){
 return get(rows,year,{...ltBase,AGE:'Y_GE15'});
}
function entry(value,total,prev){
 return {
  value:value===null?null:Math.round(value),
  share:value!==null&&total!==null&&total>0?Math.round(value/total*1000)/10:null,
  change:value!==null&&prev!==null&&prev>0?Math.round((value/prev-1)*1000)/10:null
 };
}
function section(rows,kind){
 const year=2023,prev=2017,age='Y15T64';
 let codes,denom;
 if(kind==='activite'){
  codes=[['1',age],['2',age],['3',age]];
  denom=readLR(rows,year,'_T',age);
 }else if(kind==='chomage'){
  codes=[['2','Y15T24'],['2','Y25T54'],['2','Y55T64']];
  denom=readLR(rows,year,'2',age);
 }else if(kind==='inactifs'){
  codes=[['31',age],['33',age],['35T36',age]];
  denom=readLR(rows,year,'3',age);
 }else throw Error('Section inconnue');
 return {year,previousYear:prev,source:SOURCE,denominator:denom===null?null:Math.round(denom),
  rows:codes.map(([key,groupAge])=>entry(
   readLR(rows,year,key,groupAge),denom,readLR(rows,prev,key,groupAge)))};
}
function concentration(residence,travail){
 const out={};
 for(const year of YEARS){
  const localJobs=readLT(travail,year);
  const occupiedResidents=readLR(residence,year,'1','Y_GE15');
  const val=localJobs!==null&&occupiedResidents!==null&&occupiedResidents>0?
   Math.round(localJobs/occupiedResidents*1000)/10:null;
  out[year]={value:val,change:null,source:SOURCE};
 }
 for(let i=1;i<YEARS.length;i++){
  const current=out[YEARS[i]],old=out[YEARS[i-1]];
  current.change=current.value!==null&&old.value!==null?
   Math.round((current.value-old.value)*10)/10:null;
 }
 return out;
}
async function query(dataset,geo){
 if(!Object.values(DATASETS).includes(dataset)||!GEO.test(geo))throw Error('Jeu ou zone interdit');
 const key=dataset+':'+geo,hit=CACHE.get(key);
 if(hit&&hit.expiry>Date.now())return hit.rows;
 if(PENDING.has(key))return PENDING.get(key);
 const promise=(async()=>{
  const url=new URL(BASE+dataset);
  url.searchParams.set('GEO',geo);url.searchParams.set('maxResult','950');
  const response=await fetch(url.toString(),{
   signal:AbortSignal.timeout(18000),headers:{Accept:'application/json','User-Agent':'AtlasTerritoires-INSEE/2.0'}
  });
  if(!response.ok)throw Error('INSEE HTTP '+response.status+' — '+dataset);
  const data=await response.json();
  const rows=rowsFrom(data,geo);
  CACHE.set(key,{rows,expiry:Date.now()+12*60*60*1000});
  if(CACHE.size>500)CACHE.delete(CACHE.keys().next().value);
  return rows;
 })();
 PENDING.set(key,promise);
 try{return await promise}
 finally{PENDING.delete(key)}
}
function empty(){return{activite:{commune:null,epci:null,france:null},
 chomage:{commune:null,epci:null,france:null},
 inactifs:{commune:null,epci:null,france:null}}}
async function employment({commune,epci}){
 if(!/^(?:[0-9]{5}|2[AB][0-9]{3})$/i.test(commune||''))throw Error('Code commune incorrect');
 if(epci&&!/^[0-9]{9}$/.test(epci))throw Error('Code EPCI incorrect');
 const result={code_insee:commune,code_epci:epci||null,source:SOURCE,
  sections:empty(),concentration:{commune:null,epci:null},errors:[],
  generated_at:new Date().toISOString()};
 const geos=[['commune','COM-'+commune],['france','FRANCE-F']];
 if(epci)geos.push(['epci','EPCI-'+epci]);
 await Promise.all(geos.map(async([area,geo])=>{
  const [resident,working]=await Promise.allSettled([
   query(DATASETS.residence,geo),area==='france'?Promise.resolve([]):query(DATASETS.travail,geo)]);
  const pop=resident.status==='fulfilled'?resident.value:null;
  const jobs=working.status==='fulfilled'?working.value:null;
  if(pop){
   for(const name of ['activite','chomage','inactifs'])result.sections[name][area]=section(pop,name);
  }else result.errors.push(area+' : emploi des résidents indisponible');
  if(area!=='france'){
   if(pop&&jobs)result.concentration[area]=concentration(pop,jobs);
   else result.errors.push(area+' : indice de concentration non disponible');
  }
 }));
 return result;
}
module.exports={employment,rowsFrom,get,entry,section,concentration,readLR,readLT,SOURCE};
