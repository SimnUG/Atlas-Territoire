'use strict';
/* Classement et repères annuels du parc locatif privé par EPCI.
 * Carte des loyers ANIL/DGALN (data.gouv.fr), découpage administratif officiel.
 * L'identifiant EPCI vient de l'API Géo (référentiel public).
 */
const rental=require('./rental-data');
const administrative=require('./administrative-profile');
const SOURCE='https://www.data.gouv.fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025';
const groups=['appartements','petits','grands','maisons'];
const cache=new Map();
function median(values){
 const s=values.filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>0).sort((a,b)=>a-b);
 if(!s.length)return null;
 const n=s.length,mid=Math.floor(n/2);
 return n%2?s[mid]:(s[mid-1]+s[mid])/2;
}
async function epciMembers(epci){
 const u=new URL('https://geo.api.gouv.fr/epcis/'+encodeURIComponent(epci)+'/communes');
 u.searchParams.set('fields','nom,code,population');
 u.searchParams.set('format','json');
 const r=await fetch(u,{signal:AbortSignal.timeout(15000),headers:{Accept:'application/json'}});
 if(!r.ok)throw Error('Liste des communes EPCI indisponible');
 const list=await r.json();
 if(!Array.isArray(list)||!list.length||list.length>180)throw Error('Réponse des communes de l’EPCI invalide');
 const unique=new Map();
 for(const row of list){
  const code=String(row.code||'').toUpperCase();
  if(!/^(?:[0-9]{5}|2[AB][0-9]{3})$/.test(code)||!row.nom)continue;
  unique.set(code,{code,nom:String(row.nom),population:Number(row.population)||null});
 }
 if(!unique.size)throw Error('Aucune commune identifiée pour cet EPCI');
 return [...unique.values()];
}
async function pool(items,fn,workers=4){
 let cursor=0;const out=new Array(items.length);
 await Promise.all(Array.from({length:Math.min(workers,items.length)},async()=>{
  for(;;){const i=cursor++;if(i>=items.length)return;try{out[i]=await fn(items[i],i)}catch(e){out[i]={error:e.message}}}
 }));
 return out;
}
function extractYear(rent,annee){
 const result={};
 for(const group of groups){
  const kind=rent?.types?.find(x=>x.id===group);
  const value=kind?.serie?.find(x=>x.annee===annee);
  result[group]=typeof value?.loyer==='number'&&value.loyer>0?{
   valeur:value.loyer,observations:value.observations??null,
   bas:value.borne_basse??null,haut:value.borne_haute??null,
   niveau:value.niveau_prediction||null,r2:value.r2??null
  }:null;
 }
 return result;
}
async function build(code,historique){
 const profile=await administrative.profile(code),epci=profile?.epci;
 if(!epci?.code||!/^\d{9}$/.test(epci.code))
  return {statut:'indisponible',code_insee:code,raison:'EPCI non identifié dans le référentiel administratif',communes:[]};
 const members=await epciMembers(epci.code);
 if(!members.some(x=>x.code===code))throw Error('Le code INSEE n’appartient pas à l’EPCI retourné');
 const dates=historique?[2022,2023,2024,2025]:[2025];
 const rows=await pool(members,async member=>{
  const a=await rental.rent({code:member.code,historique});
  const byYear=Object.fromEntries(dates.map(y=>[y,extractYear(a,y)]));
  return {...member,annees:byYear};
 });
 const successful=rows.filter(x=>x.annees);
 if(!successful.length)
  return {statut:'indisponible',code_insee:code,epci:{code:epci.code,nom:epci.nom},communes:[],
   raison:'Aucune valeur de la carte des loyers disponible pour les communes de cet EPCI'};
 const references={};
 for(const y of dates){
  references[y]={};
  for(const type of groups){
   const vals=successful.map(x=>x.annees[y]?.[type]?.valeur).filter(Number.isFinite);
   references[y][type]={mediane:median(vals),nombre_communes:vals.length};
  }
 }
 return {statut:'disponible',code_insee:code,epci:{code:epci.code,nom:epci.nom},
  annees:dates,communes:successful,communes_total:members.length,communes_avec_donnees:successful.length,
  references, source:{nom:'Carte des loyers — ANIL/DGALN + découpage administratif API Géo',
    url:SOURCE,reference:'Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin'},
  methodologie:'Médiane non pondérée des indicateurs communaux disponibles. Les valeurs sur maille intercommunale ne sont pas des observations indépendantes et les changements de maillage limitent la comparaison des années.'};
}
async function compare(code,historique=false){
 if(!/^(44|85)\d{3}$/.test(String(code||'')))throw Error('Recherche réservée aux départements 44 et 85');
 const key=code+':'+historique,old=cache.get(key);
 if(old&&old.until>Date.now())return old.promise;
 const promise=build(code,historique);
 cache.set(key,{promise,until:Date.now()+3600000});
 try{const value=await promise;cache.set(key,{promise:Promise.resolve(value),until:Date.now()+3600000});return value}
 catch(e){cache.delete(key);throw e}
}
module.exports={compare,median,epciMembers,extractYear};
