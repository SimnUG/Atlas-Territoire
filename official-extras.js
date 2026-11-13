'use strict';
// Sources : Ministère chargé du Logement (zonage ABC 2026, déjà autorisé),
// Ministère de l'Éducation nationale (nouvelle source),
// Hub'Eau OFB / DGS (nouvelle source). Toutes réponses contrôlées par code INSEE.
const memo=new Map();
const SRC={
 abc:{nom:'Ministère chargé du Logement — Zonage ABC au 26 juin 2026',url:'https://www.data.gouv.fr/datasets/liste-des-communes-selon-le-zonage-abc'},
 schools:{nom:'Ministère de l’Éducation nationale — Annuaire de l’éducation',url:'https://www.data.gouv.fr/datasets/annuaire-de-leducation'},
 water:{nom:'Hub’Eau — OFB, BRGM et Direction générale de la santé',url:'https://www.data.gouv.fr/dataservices/hubeau-qualite-de-leau-potable'}
};
const prefix='https://tabular-api.data.gouv.fr/api/resources/13f7282b-8a25-43ab-9713-8bb4e476df55/';
async function fetchJson(url,timeout=14000){
 const parsed=new URL(url);
 if(!['tabular-api.data.gouv.fr','data.education.gouv.fr','hubeau.eaufrance.fr'].includes(parsed.hostname))
  throw Error('Domaine inattendu');
 const res=await fetch(url,{signal:AbortSignal.timeout(timeout),headers:{Accept:'application/json'}});
 if(!res.ok)throw Error('Réponse officielle HTTP '+res.status);
 const data=await res.json();
 return data;
}
async function cached(key,fn,ttl=86400000){
 const hit=memo.get(key);
 if(hit&&hit.until>Date.now())return hit.value;
 const value=Promise.resolve().then(fn);
 memo.set(key,{value,until:Date.now()+ttl});
 try{const result=await value;memo.set(key,{value:result,until:Date.now()+ttl});
 if(memo.size>300)memo.delete(memo.keys().next().value);return result}
 catch(err){memo.delete(key);throw err}
}
function norm(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function findKey(keys,patterns){
 return keys.find(k=>patterns.some(rx=>rx.test(norm(k))))||null;
}
function validatedCode(s){return /^(?:[0-9]{5}|2[AB][0-9]{3})$/i.test(s||'')}
async function abc(code){
 if(!validatedCode(code))return null;
 try{
  const profile=await cached('abcprofile',()=>fetchJson(prefix+'profile/'),86400000);
  const keys=profile?.profile?.header||[];
  const codeKey=findKey(keys,[/^codeinsee/, /^codecommune/, /^codgeo/, /^inseecode/, /^inseecommune/, /^comcode$/, /^insee$/]);
  const zoneKey=findKey(keys,[/^zonage$/, /^zoneabc/, /^zone2026/, /^zonageabc/, /^zonedetension/, /^zone$/, /^classement/]);
  if(!codeKey||!zoneKey)return null;
  const url=new URL(prefix+'data/');
  url.searchParams.set(codeKey+'__exact',code.toUpperCase());
  url.searchParams.set('page_size','20');
  const result=await cached('abc:'+code,()=>fetchJson(url.toString()));
  const rows=(Array.isArray(result?.data)?result.data:[]).filter(r=>String(r[codeKey]).trim().toUpperCase()===code.toUpperCase());
  const found=rows.map(r=>({...r,__zone:String(r[zoneKey]??'').trim().replace(/[\\s-]/g,'')}))
   .filter(r=>/^(Abis|A|B1|B2|C)$/i.test(r.__zone));
  if(found.length!==1)return null;
  return {zone:String(found[0].__zone),millésime:2026,code_insee:code,source:SRC.abc,
   details:rows[0],colonne_zone:zoneKey};
 }catch(_){return null}
}
function schoolCategory(text){
 const label=norm(text);
 if(label.includes('maternelle'))return 'Maternelle';
 if(label.includes('elementaire')||label.includes('primaire'))return 'Élémentaire / primaire';
 if(label.includes('college'))return 'Collège';
 if(label.includes('lycee'))return 'Lycée';
 return 'Autre établissement';
}
async function schools(code){
 if(!validatedCode(code))return null;
 try{
  const url=new URL('https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records');
  url.searchParams.set('where','code_commune="'+code.toUpperCase()+'"');
  url.searchParams.set('limit','100');
  const result=await cached('schools:'+code,()=>fetchJson(url.toString(),18000),43200000);
  const rows=(Array.isArray(result?.results)?result.results:[])
    .filter(r=>String(r.code_commune||'').trim().toUpperCase()===code.toUpperCase());
  if(!rows.length)return null;
  const dedup=new Map();
  for(const r of rows){
   const name=String(r.nom_etablissement||'').trim();
   if(!name)continue;
   const id=String(r.identifiant_de_l_etablissement||name);
   if(!dedup.has(id)){
    const lat=Number(r.latitude),lon=Number(r.longitude);
    dedup.set(id,{nom:name,type:String(r.type_etablissement||'').slice(0,100),
      categorie:schoolCategory(r.type_etablissement),
      public_prive:String(r.statut_public_prive||'').slice(0,60),
      latitude:Number.isFinite(lat)&&lat>40&&lat<52?lat:null,
      longitude:Number.isFinite(lon)&&lon>-6&&lon<11?lon:null
    });
   }
  }
  const data=[...dedup.values()];
  if(!data.length)return null;
  const types={};
  data.forEach(r=>types[r.categorie]=(types[r.categorie]||0)+1);
  return {total:data.length,établissements:data.slice(0,90),types,source:SRC.schools,code_insee:code,
   exhaustif:typeof result.total_count==='number'?result.total_count<=100:null};
 }catch(_){return null}
}
async function water(code){
 if(!validatedCode(code))return null;
 try{
  const url=new URL('https://hubeau.eaufrance.fr/api/v1/qualite_eau_potable/communes_udi');
  url.searchParams.set('code_commune',code.toUpperCase());
  url.searchParams.set('size','100');
  const result=await cached('water:'+code,()=>fetchJson(url.toString()),43200000);
  const rows=Array.isArray(result?.data)?result.data:[];
  const filtered=rows.filter(r=>{
    const c=r.code_commune||r.code_insee||r.insee_com||r.code_commune_udi;
    return String(c||'').trim().toUpperCase()===code.toUpperCase();
  });
  if(!filtered.length)return null;
  const records=[];
  for(const row of filtered){
   const name=String(row.nom_udi||row.nom_unite_distribution||row.libelle_udi||'').trim();
   const number=String(row.code_udi||row.code_reseau||'').trim();
   if((name||number)&&!records.some(x=>x.nom===name&&x.code===number)){
    records.push({nom:name||'Réseau sans libellé',code:number||null});
   }
  }
  if(!records.length)return null;
  return {reseaux:records,source:SRC.water,code_insee:code,
    note:'Unités de distribution recensées, et non tarifs de PFAC, capacité des réseaux ou analyse détaillée de l’eau.'};
 }catch(_){return null}
}
async function all(code){
 if(!validatedCode(code))return {zonage:null,ecoles:null,eau:null};
 const [zonage,ecoles,eau]=await Promise.all([abc(code),schools(code),water(code)]);
 return {zonage,ecoles,eau,code_insee:code};
}
module.exports={all,abc,schools,water,findKey,schoolCategory};
