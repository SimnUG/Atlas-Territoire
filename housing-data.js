'use strict';
const SOURCE={nom:'INSEE — Recensement de la population, logements',url:'https://www.insee.fr/fr/statistiques/8997194',niveau:'commune / EPCI',dataset:'DS_RP_SERIE_HISTORIQUE / DS_RP_LOGEMENT_PRINC'};
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
 if(dim(o,'MEASURE')!==undefined && dim(o,'MEASURE')!=='DWELLINGS')return false;
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
 const outcomes={geo,annee:null,distribution:[],pieces:[],erreurs:errs};
 const geos=[geo.year+'-'+geo.type+'-'+geo.code,geo.code];
 // Série historique officielle : 4 modalités par millésime, lecture fiable
 // des résidences principales, secondaires/occasionnelles et vacantes.
 let series=[];
 for(const target of geos){
  try{
   const u=new URL('https://api.insee.fr/melodi/data/DS_RP_SERIE_HISTORIQUE');
   u.searchParams.set('GEO',target);u.searchParams.set('RP_MEASURE','DWELLINGS');u.searchParams.set('maxResult','1000');
   const raw=await memo('logement-historique:'+u.search,()=>request(u.toString(),13000),3600000);
   series=objects(raw).filter(o=>eligible(o,geo));
   if(series.length)break;
  }catch(e){errs.push('Série historique : '+e.message)}
 }
 const grouped=series.filter(o=>['DW_MAIN','DW_SEC_DW_OCC','DW_VAC'].includes(String(dim(o,'OCS'))));
 const years=[...new Set(grouped.map(o=>Number(dim(o,'TIME_PERIOD'))))].sort((a,b)=>b-a);
 for(const year of years){
  const rows=[];
  for(const spec of values){
   const matches=grouped.filter(o=>Number(dim(o,'TIME_PERIOD'))===year&&spec.codes.includes(dim(o,'OCS')));
   if(matches.length===1)rows.push({key:spec.key,label:spec.label,valeur:Math.round(val(matches[0])),millesime:year});
  }
  if(rows.length===3){
   const total=rows.reduce((sum,r)=>sum+r.valeur,0);
   if(total>0){
    rows.forEach(r=>r.part=Math.round(1000*r.valeur/total)/10);
    outcomes.distribution=rows;outcomes.annee=year;break;
   }
  }
 }
 if(!outcomes.distribution.length)errs.push('Répartition du parc non disponible dans la série historique INSEE');
 // Détail du nombre de pièces via le recensement principal, avec chaque
 // autre ventilation fixée au total ; jamais de somme de lignes imbriquées.
 let principal=[];
 for(const target of geos){
  try{
   const u=new URL('https://api.insee.fr/melodi/data/DS_RP_LOGEMENT_PRINC');
   u.searchParams.set('GEO',target);u.searchParams.set('RP_MEASURE','DWELLINGS');
   u.searchParams.set('TIME_PERIOD',String(outcomes.annee||2023));
   u.searchParams.set('OCS','DW_MAIN');u.searchParams.set('TDW','_T');u.searchParams.set('maxResult','2500');
   const raw=await memo('logement-pieces:'+u.search,()=>request(u.toString(),15500),3600000);
   principal=objects(raw).filter(o=>eligible(o,geo));
   if(principal.length)break;
  }catch(e){errs.push('Détail nombre de pièces : '+e.message)}
 }
 for(const room of roomTypes){
  const rows=principal.filter(o=>
    dim(o,'OCS')==='DW_MAIN'&&dim(o,'TDW')==='_T'&&
    Number(dim(o,'TIME_PERIOD'))===(outcomes.annee||2023)&&
    room.codes.includes(String(dim(o,'NOR'))) &&
    otherDims.filter(k=>k!=='NOR').every(k=>dim(o,k)===undefined||dim(o,k)===null||String(dim(o,k))==='_T')
  );
  if(rows.length===1)outcomes.pieces.push({piece:room.label,valeur:Math.round(val(rows[0])),millesime:Number(dim(rows[0],'TIME_PERIOD'))});
 }
 if(!outcomes.pieces.length)errs.push('Ventilation par pièces indisponible ou incomplète');
 return outcomes;
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
