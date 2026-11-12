'use strict';
const SOURCE={nom:'INSEE — Recensement de la population, logements',url:'https://www.insee.fr/fr/statistiques/8997194',niveau:'commune / EPCI',dataset:'DS_RP_LOGEMENT_PRINC'};
const cache=new Map();
async function request(url,timeout=12500){
 const r=await fetch(url,{signal:AbortSignal.timeout(timeout),headers:{Accept:'application/json'}});
 if(!r.ok)throw Error('INSEE HTTP '+r.status);
 return r.json();
}
async function memo(key,task,ttl=3600000){
 const hit=cache.get(key);if(hit&&hit.exp>Date.now())return hit.value;
 const pending=Promise.resolve().then(task);
 cache.set(key,{value:pending,exp:Date.now()+ttl});
 try{const v=await pending;cache.set(key,{value:v,exp:Date.now()+ttl});if(cache.size>120)cache.delete(cache.keys().next().value);return v}catch(e){cache.delete(key);throw e}
}
function objects(data){
 const o=data?.observations;
 if(Array.isArray(o))return o;
 if(!o||!Array.isArray(o.dimensions))return [];
 return o.dimensions.map((dimensions,i)=>{
  const measures={};
  for(const [k,v] of Object.entries(o.measures||{})){
   measures[k]=Array.isArray(v)?(typeof v[i]==='object'&&v[i]!==null?v[i].value:v[i]):v?.values?.[i];
  }
  return {dimensions,measures};
 });
}
function dim(o,k){const v=o?.dimensions?.[k];return typeof v==='object'&&v!==null?(v.value??v.id):v}
function val(o){
 for(const [k,v] of Object.entries(o.measures||{})){
  if(!/^(OBS_VALUE|OBS_VALUE_NIVEAU|VALUE)$/i.test(k))continue;
  const raw=typeof v==='object'&&v!==null?v.value:v;
  if(raw===null||raw===undefined||raw==='')continue;
  const n=Number(raw);if(Number.isFinite(n)&&n>=0)return n;
 }return null;
}
function normal(x){return String(x||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
const otherDims=['NOR','TSH','CARS','L_STAY','CARPARK','NRG_SRC','BUILD_END','NOC','LIFT','CH_TYPE','HEATING'];
function totals(o){
 return otherDims.every(k=>dim(o,k)===undefined||dim(o,k)===null||String(dim(o,k))==='_T');
}
function eligible(o,geo){
 const g=String(dim(o,'GEO')||'');
 if(![geo.code,geo.year+'-'+geo.type+'-'+geo.code,geo.type+'-'+geo.code].includes(g))return false;
 if(dim(o,'RP_MEASURE')!==undefined && dim(o,'RP_MEASURE')!=='DWELLINGS')return false;
 const date=Number(dim(o,'TIME_PERIOD'));
 return date>=2012&&date<=2026&&val(o)!==null;
}
const values=[
 {key:'principales',codes:['DW_MAIN'],label:'Résidences principales'},
 {key:'secondaires',codes:['DW_SEC_DW_OCC','DW_SEC','DW_SECONDARY'],label:'Résidences secondaires et logements occasionnels'},
 {key:'vacants',codes:['DW_VACANT','DW_VAC','DW_UNOCC'],label:'Logements vacants'}
];
const roomTypes=[
 {label:'1 pièce',codes:['R1','1']},{label:'2 pièces',codes:['R2','2']},
 {label:'3 pièces',codes:['R3','3']},{label:'4 pièces',codes:['R4','4']},
 {label:'5 pièces',codes:['R5','5']},{label:'6 pièces ou plus',codes:['R6','6','R6P','R6_GE']}
];
async function call(geo,dataset,filter={}){
 const url=new URL('https://api.insee.fr/melodi/data/'+dataset);
 url.searchParams.set('GEO',geo.year+'-'+geo.type+'-'+geo.code);
 url.searchParams.set('maxResult','2000');
 for(const [k,v] of Object.entries(filter))url.searchParams.set(k,v);
 return memo(dataset+':'+url.search,()=>request(url.toString(),16000),1800000);
}
async function fetchGeo(code){
 try{
  const u=new URL('https://geo.api.gouv.fr/communes/'+code);
  u.searchParams.set('fields','nom,code,codeEpci');
  const r=await request(u.toString(),7500);
  return {nom:r.nom||null,code_epci:r.codeEpci||null};
 }catch(e){return {nom:null,code_epci:null,error:e.message}}
}
async function studyOne(geo){
 const errs=[];
 let result=[];
 // La requête ciblée sur une géographie et un indicateur ne suppose
 // aucune jointure/ventilation cachée.
 for(const target of [geo.year+'-'+geo.type+'-'+geo.code,geo.code]){
  try{
   const u=new URL('https://api.insee.fr/melodi/data/DS_RP_LOGEMENT_PRINC');
   u.searchParams.set('GEO',target);
   u.searchParams.set('RP_MEASURE','DWELLINGS');
   u.searchParams.set('maxResult','2500');
   const d=await memo('housingschema:'+u.search,()=>request(u.toString(),15500),3600000);
   const rows=objects(d).filter(o=>eligible(o,geo));
   if(rows.length){result=rows;break}
  }catch(e){errs.push(e.message)}
 }
 if(!result.length)return {geo,annee:null,distribution:[],pieces:[],erreurs:['Aucune observation INSEE cohérente dans le jeu logement principal',...errs]};
 const years=[...new Set(result.map(o=>Number(dim(o,'TIME_PERIOD'))))].sort((a,b)=>b-a);
 const distributions=[],rooms=[];
 let selectedYear=null;
 for(const year of years){
  const distribution=[];
  for(const v of values){
   const match=result.filter(o=>Number(dim(o,'TIME_PERIOD'))===year&&v.codes.includes(dim(o,'OCS'))&&dim(o,'TDW')==='_T'&&totals(o));
   if(match.length===1)distribution.push({key:v.key,label:v.label,valeur:Math.round(val(match[0])),millesime:year});
  }
  if(distribution.length>=2){
   selectedYear=year;distributions.push(...distribution);
   break;
  }
 }
 const roomYear=selectedYear||years[0];
 for(const room of roomTypes){
  const rows=result.filter(o=>Number(dim(o,'TIME_PERIOD'))===roomYear&&
   dim(o,'OCS')==='DW_MAIN' && dim(o,'TDW')==='_T'&&room.codes.includes(dim(o,'NOR'))&&
   otherDims.filter(k=>k!=='NOR').every(k=>dim(o,k)===undefined||dim(o,k)===null||String(dim(o,k))==='_T'));
  if(rows.length===1)rooms.push({piece:room.label,valeur:Math.round(val(rows[0])),millesime:roomYear});
 }
 const sum=distributions.reduce((acc,x)=>acc+x.valeur,0);
 if(distributions.length===3&&sum>0)distributions.forEach(r=>r.part=Math.round(1000*r.valeur/sum)/10);
 if(!distributions.length)errs.push('Répartition principales / secondaires / vacants non disponible avec des dimensions de total strictes');
 if(!rooms.length)errs.push('Nombre de pièces non disponible : filtres INSEE complets à confirmer');
 return {geo,annee:selectedYear,distribution:distributions,pieces:rooms,erreurs:errs,identifiants_disponibles:[...new Set(result.map(o=>dim(o,'OCS')))].filter(Boolean)};
}
async function housing(code){
 if(!/^(?:[0-9]{5}|2[AB][0-9]{3})$/i.test(code||''))throw Error('Code INSEE invalide');
 const place=await fetchGeo(code);
 const geography={type:'COM',code,year:2026};
 const epci=place.code_epci?{type:'EPCI',code:place.code_epci,year:2026}:null;
 const studies=await Promise.all([studyOne(geography),epci?studyOne(epci):Promise.resolve(null)]);
 return {source:SOURCE,commune:{nom:place.nom,code,...studies[0]},epci:studies[1],
  occupation:[{libelle:'Propriétaires',commune:null,epci:null},{libelle:'Locataires',commune:null,epci:null},
  {libelle:'Dont locataires HLM',commune:null,epci:null},{libelle:'Dont parc privé',commune:null,epci:null},
  {libelle:'Logés gratuitement',commune:null,epci:null}],
  avertissement:'La répartition par statut d’occupation requiert le jeu détaillé INSEE et des dimensions vérifiées. Les pourcentages de la capture ne sont jamais réutilisés.',
  date_recherche:new Date().toISOString()};
}
module.exports={housing,objects,studyOne};
