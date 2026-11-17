'use strict';
/*
 * API officielle INSEE Melodi — population, août 2026.
 * Pas de données simulées : chaque nombre est extrait d'une seule observation
 * agrégée et validée ou d'une somme de catégories disjointes vérifiables.
 * Les pages du site restent indépendantes de l'état de connexion de la source.
 */
const SOURCE={nom:'INSEE — Recensement de la population, API Melodi',
 url:'https://api.insee.fr/melodi',licence:'Licence Ouverte / Open Licence 2.0',
 info:'https://www.insee.fr/fr/information/8184146'};
const BASE='https://api.insee.fr/melodi/data/';
const CACHE=new Map();
const YEARS=[2012,2017,2023];
const AGE=['Y_LT15','Y15T24','Y25T39','Y40T54','Y55T64','Y65T79','Y_GE80'];
// PCS 9 est la catégorie « autres personnes sans activité professionnelle »
// dans le tableau harmonisé DS_RP_POPULATION_COMP 2023.
const PCS=['1','2','3','4','5','6','7','9'];
const VALID_GEO=/^(COM-(?:[0-9]{5}|2[AB][0-9]{3})|EPCI-[0-9]{9}|FRANCE-FM)$/i;
function safeNumber(v){if(typeof v==='number'&&Number.isFinite(v)&&v>=0)return v;
 if(typeof v==='string'&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0)return Number(v);
 return null;
}
function rowsFrom(payload,geo){
 const original=Array.isArray(payload?.observations)?payload.observations:[];
 if(payload?.paging?.next)throw Error('Pagination incomplète');
 const suffix='-'+geo.toUpperCase();
 return original.map(row=>{
  const d=row?.dimensions||{},n=safeNumber(row?.measures?.OBS_VALUE_NIVEAU?.value);
  const rawGeo=String(d.GEO||'').toUpperCase();
  if(n===null||(!rawGeo.endsWith(suffix)&&rawGeo!==geo.toUpperCase())||!(Number(d.TIME_PERIOD)>=1968&&Number(d.TIME_PERIOD)<=2026))return null;
  if(d.RP_MEASURE && d.RP_MEASURE!=='POP')return null;
  if(d.POPREF_MEASURE&&d.POPREF_MEASURE!=='PMUN'&&!(d.POPREF_MEASURE==='PSDC'&&Number(d.TIME_PERIOD)<=1999))return null;
  return {d,value:n,year:Number(d.TIME_PERIOD)};
 }).filter(Boolean);
}
function one(rows,year,dimensions){
 const filtered=rows.filter(x=>x.year===year&&
  Object.entries(dimensions).every(([key,v])=>String(x.d?.[key])===String(v)));
 return filtered.length===1?filtered[0].value:null;
}
function point(value,total,previous){
 return {
  value:value===null?null:Math.round(value),
  share:value!==null&&total!==null&&total>0?Math.round(value/total*1000)/10:null,
  change:value!==null&&previous!==null&&previous>0?
   Math.round((value/previous-1)*1000)/10:null
 };
}
function extractTable(rows,type,year=2023){
 if(!rows.length)return null;
 const ages=type==='ages',pcs=type==='csp';
 if(!ages&&!pcs)return null;
 const keys=ages?AGE:PCS;
 const filters=ages?{SEX:'_T',RP_MEASURE:'POP'}:
  {SEX:'_T',AGE:'Y_GE15',RP_MEASURE:'POP'};
 const grand=ages?one(rows,year,{...filters,AGE:'_T'}):
  one(rows,year,{...filters,PCS:'_T'});
 const prevYear=2017;
 const vals=keys.map(key=>{
  const dim=ages?'AGE':'PCS';
  return one(rows,year,{...filters,[dim]:key});
 });
 const prev=keys.map(key=>{
  const dim=ages?'AGE':'PCS';
  return one(rows,prevYear,{...filters,[dim]:key});
 });
 // Alternative prudente si un total n'est pas livré : somme seulement
 // lorsque l'intégralité des classes disjointes est présente.
 const allValid=vals.every(v=>v!==null);
 const total=grand!==null?grand:(allValid?vals.reduce((a,b)=>a+b,0):null);
 return {
  rows:vals.map((v,i)=>point(v,total,prev[i])),
  referenceYear:year,previousYear:prevYear,source:SOURCE
 };
}
function totalFromAge(rows,year){
 return one(rows,year,{SEX:'_T',AGE:'_T',RP_MEASURE:'POP'});
}
function shortHistory(princ){
 return YEARS.map(year=>({year,value:totalFromAge(princ,year)})).filter(p=>p.value!==null);
}
function historic(historical,princ){
 const map=new Map();
 for(const x of historical){
  if((x.d.POPREF_MEASURE==='PMUN'||(x.d.POPREF_MEASURE==='PSDC'&&x.year<=1999))&&x.value>=0)map.set(x.year,{year:x.year,value:Math.round(x.value)});
 }
 for(const p of shortHistory(princ))if(!map.has(p.year))map.set(p.year,{year:p.year,value:Math.round(p.value)});
 return [...map.values()].sort((a,b)=>a.year-b.year);
}
function nationality(nat,year=2023){
 // DS_RP_TD_NAT_AGESEX_PRINC ; 100 = étrangère, 250 = française.
 function extract(category){
  const fixed={SEX:'_T',NATIONALITY_TYPE:category,RP_MEASURE:'POP'};
  const all=one(nat,year,{...fixed,AGE:'_T'});
  if(all!==null)return all;
  // Seulement si les catégories « moins de 15 » et « 15 ans et plus »
  // sont toutes deux livrées sans chevauchement.
  const below=one(nat,year,{...fixed,AGE:'Y_LT15'});
  const over=one(nat,year,{...fixed,AGE:'Y_GE15'});
  return below!==null&&over!==null?below+over:null;
 }
 const fr=extract('250'),foreign=extract('100');
 return {fr,foreign,total:fr!==null&&foreign!==null?fr+foreign:null};
}
function immigrated(imm,year=2023){
 const filters={SEX:'_T',IMMI:'1',EMPSTA_ENQ:'_T',RP_MEASURE:'POP'};
 const total=one(imm,year,{...filters,AGE:'_T'});
 if(total!==null)return total;
 const under=one(imm,year,{...filters,AGE:'Y_LT15'});
 const over=one(imm,year,{...filters,AGE:'Y_GE15'});
 return under!==null&&over!==null?under+over:null;
}
function extractOrigins(nat,imm,year=2023){
 const n=nationality(nat,year),immVal=immigrated(imm,year);
 const rows=[
  point(n.fr,n.total,null),
  point(n.foreign,n.total,null),
  point(immVal,n.total,null)
 ];
 return {rows,referenceYear:year,previousYear:null,source:SOURCE};
}
async function request(dataset,geo,filters={},max=700){
 if(!VALID_GEO.test(geo))throw Error('Code géographique interdit');
 if(!/^DS_[A-Z0-9_]+$/.test(dataset))throw Error('Dataset interdit');
 const url=new URL(BASE+dataset);
 url.searchParams.set('GEO',geo);
 url.searchParams.set('maxResult',String(max));
 for(const [key,val] of Object.entries(filters))url.searchParams.set(key,String(val));
 const resp=await fetch(url.toString(),{
  signal:AbortSignal.timeout(15000),headers:{Accept:'application/json','User-Agent':'AtlasTerritoires-INSEE/2'}
 });
 if(!resp.ok)throw Error('INSEE HTTP '+resp.status+' '+dataset);
 const data=await resp.json();
 return rowsFrom(data,geo);
}
async function getGeo(kind,code){
 const geo=kind+'-'+code;
 const loaders=[
  ['ages',()=>request('DS_RP_POPULATION_PRINC',geo,{},150)],
  ['csp',()=>request('DS_RP_POPULATION_COMP',geo,{},450)],
  ['nat',()=>request('DS_RP_TD_NAT_AGESEX_PRINC',geo,{TIME_PERIOD:2023},250)],
  ['imm',()=>request('DS_RP_TD_IMMI_AGESEXEMPSTA_PRINC',geo,
   {TIME_PERIOD:2023,SEX:'_T',EMPSTA_ENQ:'_T'},200)]
 ];
 if(kind==='COM')loaders.push(['history',()=>request('DS_POPULATIONS_HISTORIQUES',geo,{},120)]);
 const result={},errors=[];
 await Promise.all(loaders.map(async([name,fn])=>{
  try{result[name]=await fn()}catch(e){result[name]=[];errors.push(name+' : '+e.message)}
 }));
 const princ=result.ages||[];
 const timeline=kind==='COM'?historic(result.history||[],princ):shortHistory(princ);
 return {
  timeline,
  ages:extractTable(princ,'ages'),
  csp:extractTable(result.csp||[],'csp'),
  origines:extractOrigins(result.nat||[],result.imm||[]),
  errors
 };
}
function blank(){return{timeline:[],ages:null,csp:null,origines:null,errors:[]}}
async function population({commune,epci}){
 if(!/^(?:\d{5}|2[AB]\d{3})$/i.test(commune||''))throw Error('Code commune invalide');
 if(epci && !/^\d{9}$/.test(epci))throw Error('Code EPCI invalide');
 const cacheKey=commune+':'+(epci||'');
 const prev=CACHE.get(cacheKey);
 if(prev&&prev.until>Date.now())return prev.payload;
 const promise=(async()=>{
  const out={source:SOURCE,code_insee:commune,code_epci:epci||null,
   years:{ages:2023,csp:2023,origines:2023},
   series:{commune:[],epci:[]},
   sections:{ages:{commune:null,epci:null,france:null},
    csp:{commune:null,epci:null,france:null},
    origines:{commune:null,epci:null,france:null}},
   errors:[],generated_at:new Date().toISOString()};
  const jobs=[
   ['commune',getGeo('COM',commune)],
   ['france',getGeo('FRANCE','FM')]
  ];
  if(epci)jobs.push(['epci',getGeo('EPCI',epci)]);
  await Promise.all(jobs.map(async([name,p])=>{
   try{
    const data=await p;
    if(name==='commune'||name==='epci')out.series[name]=data.timeline;
    for(const section of ['ages','csp','origines'])out.sections[section][name]=data[section];
    out.errors.push(...data.errors.map(e=>name+' '+e));
   }catch(e){out.errors.push(name+' '+e.message)}
  }));
  return out;
 })();
 CACHE.set(cacheKey,{payload:promise,until:Date.now()+3600000});
 try{
  const result=await promise;
  CACHE.set(cacheKey,{payload:result,until:Date.now()+21600000});
  if(CACHE.size>200)CACHE.delete(CACHE.keys().next().value);
  return result;
 }catch(e){CACHE.delete(cacheKey);throw e}
}
module.exports={population,rowsFrom,one,point,extractTable,totalFromAge,
 historic,nationality,immigrated,extractOrigins,SOURCE};
