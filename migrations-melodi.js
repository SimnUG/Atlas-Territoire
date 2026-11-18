'use strict';
// INSEE Melodi : tableau officiel RP2023 MIG1, tous territoires.
// Exclusivement population (1 an et plus), même logement / mobilité communale.
const META={nom:'INSEE — API Melodi, MIG1, recensement 2023, exploitation principale',url:'https://api.insee.fr/melodi/data/DS_RP_TD_MIGRES_PRINC',millesime:2023};
const CACHE=new Map();
const CODES=['11','12','20','25T32'];
function sumByArea(rows,geo){
 const valid=rows.filter(x=>x&&x.dimensions?.GEO?.endsWith('-COM-'+geo)&&x.dimensions.TIME_PERIOD==='2023'
  &&x.dimensions.RP_MEASURE==='POP'&&typeof x.measures?.OBS_VALUE_NIVEAU?.value==='number'
  &&Number.isFinite(x.measures.OBS_VALUE_NIVEAU.value));
 const ages=new Set(valid.map(x=>x.dimensions.AGE));
 const sexes=new Set(valid.map(x=>x.dimensions.SEX));
 const nationalities=new Set(valid.map(x=>x.dimensions.NATIONALITY_TYPE));
 const accept=(dim,set)=>!set.has('_T')||dim==='_T';
 const found=valid.filter(x=>accept(x.dimensions.AGE,ages)
  &&accept(x.dimensions.SEX,sexes)&&accept(x.dimensions.NATIONALITY_TYPE,nationalities));
 const out={};
 for(const code of CODES){
   const group=found.filter(x=>x.dimensions.PREV_RES_AREA===code);
   out[code]=group.length?group.reduce((a,b)=>a+b.measures.OBS_VALUE_NIVEAU.value,0):null;
 }
 const grand=found.filter(x=>x.dimensions.PREV_RES_AREA==='_T');
 out._T=grand.length?grand.reduce((a,b)=>a+b.measures.OBS_VALUE_NIVEAU.value,0):null;
 if(!CODES.every(c=>out[c]!==null))throw Error('Catégories essentielles MIG1 absentes');
 const total=CODES.reduce((a,b)=>a+out[b],0);
 if(out._T!==null&&Math.abs(out._T-total)>Math.max(3,total*.015))throw Error('Somme MIG1 incohérente avec le total');
 return {source:META,statut:'disponible',code_insee:geo,total:out._T??total,
   memeLogement:out['11'],intra:out['12'],entrants:out['20']+out['25T32'],
   mobiles:out['12']+out['20']+out['25T32'],horsOrdinaire:null,
   avertissement:'Exploitation principale (MIG1) : ne pas fusionner ses effectifs avec les flux d’exploitation complémentaire.'};
}
async function migrations(code){
 if(!/^(?:\d{5}|2[AB]\d{3})$/i.test(code))throw Error('Code commune INSEE invalide');
 const hit=CACHE.get(code);if(hit&&hit.until>Date.now())return hit.payload;
 const promise=(async()=>{
  const u=new URL(META.url);u.searchParams.set('GEO','COM-'+code);
  u.searchParams.set('TIME_PERIOD','2023');u.searchParams.set('maxResult','2000');
  const r=await fetch(u,{signal:AbortSignal.timeout(15000),headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('INSEE Melodi HTTP '+r.status);
  const body=await r.json();
  if(body?.paging?.next)throw Error('Pagination du jeu MIG1 incomplète');
  return sumByArea(body.observations||[],code);
 })();
 CACHE.set(code,{payload:promise,until:Date.now()+100000});
 try{const data=await promise;CACHE.set(code,{payload:data,until:Date.now()+7200000});return data}catch(e){CACHE.delete(code);throw e}
}
module.exports={migrations,sumByArea,META};
