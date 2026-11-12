'use strict';
/* Sources publiques supplémentaires soumises à signalement à l'utilisateur :
  IGN — API Carto / Géoportail de l'urbanisme (zonage au point)
  BRGM — API publique Géorisques (risques communaux)
  Les données servies concernent uniquement le lieu et la commune cherchés.
  Le service ne fournit ni faisabilité réglementaire ni diagnostic ERP. */
const sources={
 urbanisme:{nom:'IGN — Géoportail de l’urbanisme (API GPU)',url:'https://www.geoportail-urbanisme.gouv.fr/',echelle:'point'},
 risques:{nom:'BRGM — Géorisques (API officielle)',url:'https://www.georisques.gouv.fr/',echelle:'commune'}
};
const cache=new Map();
async function withCache(key,fn,ttl=1800000){
 const hit=cache.get(key);
 if(hit && hit.until>Date.now())return hit.value;
 const task=Promise.resolve().then(fn);
 cache.set(key,{until:Date.now()+ttl,value:task});
 try{const v=await task;cache.set(key,{until:Date.now()+ttl,value:v});if(cache.size>250)cache.delete(cache.keys().next().value);return v}
 catch(err){cache.delete(key);throw err}
}
async function fetchOfficial(url){
 const r=await fetch(url,{signal:AbortSignal.timeout(10500),headers:{Accept:'application/json'}});
 if(!r.ok)throw Error('Service officiel non disponible');
 const json=await r.json();
 return json;
}
function value(x){return typeof x==='string'&&x.trim()?x.trim().slice(0,180):null}
function label(properties){
 const p=properties||{};
 for(const key of ['libelle','libelle_zone','zone','nom','name','typezone','zone_urba','code_zone','libelle_risque','libelleRisque','libelleRisquePrincipal','nom_risque']){
  const v=value(p[key]);if(v)return v;
 }
 return null;
}
function objectArray(raw){
 if(Array.isArray(raw))return raw;
 for(const k of ['features','data','results','risques','items'])if(Array.isArray(raw?.[k]))return raw[k];
 return [];
}
async function urbanism({longitude,latitude}){
 const lon=Number(longitude),lat=Number(latitude);
 if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90)return null;
 try{
  const url=new URL('https://www.geoportail-urbanisme.gouv.fr/api/feature-info/du');
  url.searchParams.set('lon',lon.toFixed(6));
  url.searchParams.set('lat',lat.toFixed(6));
  url.searchParams.set('typeName','zone_urba');
  const raw=await withCache('urban:'+lon.toFixed(5)+':'+lat.toFixed(5),()=>fetchOfficial(url.toString()),86400000);
  const features=objectArray(raw);
  const zones=[];
  for(const f of features){
   const p=f.properties||f;
   const z=label(p);
   if(!z)continue;
   if(!zones.some(x=>x.libelle===z))zones.push({libelle:z,details:{
    document:value(p.document_name||p.name_document||p.doc_id||null),
    type:value(p.typezone||p.type_zone||null)
   }});
  }
  if(!zones.length)return null;
  return {source:sources.urbanisme,zones:zones.slice(0,8),
   avertissement:'Zonage géographique interrogé au point de l’adresse. Une interprétation du règlement et des servitudes reste nécessaire pour la faisabilité.'};
 }catch(_){return null}
}
async function risks({code_insee}){
 if(!/^(?:[0-9]{5}|2[AB][0-9]{3})$/i.test(code_insee||''))return null;
 try{
  const url=new URL('https://georisques.gouv.fr/api/v1/gaspar/risques');
  url.searchParams.set('code_insee',code_insee);
  url.searchParams.set('page_size','100');
  const raw=await withCache('risques:'+code_insee,()=>fetchOfficial(url.toString()),86400000);
  const rows=objectArray(raw);
  const risques=[];
  for(const row of rows){
   const p=row.properties||row;
   const text=label(p)||value(p?.libelle_risque_long||p?.nomRisque||null);
   if(text&&!risques.includes(text))risques.push(text);
  }
  if(!risques.length)return null;
  return {source:sources.risques,risques:risques.slice(0,35),niveau:'commune',code_insee,
   avertissement:'Risques recensés dans la commune : leur présence ne prouve pas que la parcelle est exposée. Consulter les PPR et cartographies à l’adresse exacte.'};
 }catch(_){return null}
}
async function analyze({longitude,latitude,code_insee}){
 const [u,r]=await Promise.all([urbanism({longitude,latitude}),risks({code_insee})]);
 return {urbanisme:u,risques:r,sources_supplementaires:[
  ...(u?[sources.urbanisme]:[]),...(r?[sources.risques]:[])
 ]};
}
module.exports={analyze,urbanism,risks};
