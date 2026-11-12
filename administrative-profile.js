'use strict';
/* Référentiel administratif diffusé sur geo.api.gouv.fr, jeu de données public
   rattaché au portail data.gouv.fr. Aucun indicateur de millésime inventé. */
const source={nom:'Référentiel administratif national — API Géo (data.gouv.fr)',
 url:'https://geo.api.gouv.fr/decoupage-administratif/communes',niveau:'commune, EPCI, département, région'};
const cache=new Map();
async function get(url){
 const parsed=new URL(url);
 if(parsed.hostname!=='geo.api.gouv.fr'||parsed.protocol!=='https:')throw Error('Invalid domain');
 const r=await fetch(parsed.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(11500)});
 if(!r.ok)throw Error('No data');
 return r.json();
}
async function memo(key,fn){
 const previous=cache.get(key);
 if(previous&&previous.until>Date.now())return previous.value;
 const v=await fn();cache.set(key,{value:v,until:Date.now()+86400000});
 if(cache.size>300)cache.delete(cache.keys().next().value);
 return v;
}
function normalize(raw,kind){
 if(!raw||typeof raw!=='object'||!raw.code||!raw.nom)return null;
 const population=typeof raw.population==='number'&&raw.population>0?raw.population:null;
 return {nom:raw.nom,code:raw.code,type:kind,population,
  code_epci:raw.codeEpci||null,code_departement:raw.codeDepartement||null,
  code_region:raw.codeRegion||null};
}
async function object(kind,code){
 if(!code||!/^[0-9A-Z]{2,10}$/.test(code))return null;
 const url=new URL('https://geo.api.gouv.fr/'+kind+'/'+encodeURIComponent(code));
 url.searchParams.set('fields','nom,code,population,codeEpci,codeDepartement,codeRegion');
 url.searchParams.set('format','json');
 try{return normalize(await memo(kind+':'+code,()=>get(url.toString())),
   {communes:'commune',epcis:'epci',departements:'département',regions:'région'}[kind])}
 catch(_){return null}
}
async function profile(code){
 if(!/^(?:[0-9]{5}|2[AB][0-9]{3})$/i.test(code||''))throw Error('Code INSEE invalide');
 const commune=await object('communes',code);
 if(!commune)return {source,commune:null,epci:null,departement:null,region:null,comparaisons:[]};
 const [epci,departement,region]=await Promise.all([
   object('epcis',commune.code_epci),object('departements',commune.code_departement),
   object('regions',commune.code_region)
 ]);
 const comparaisons=[commune,epci,departement,region].filter(x=>x&&typeof x.population==='number');
 return {source,commune,epci,departement,region,comparaisons,
  population_millesime:null,
  avertissement:'L’API Géo ne précise pas systématiquement le millésime de population. Ne pas mélanger ces chiffres avec des séries INSEE datées.'};
}
module.exports={profile,normalize};
