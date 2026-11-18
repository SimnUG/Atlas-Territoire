'use strict';
// RPLS 2025, SDES: 16,000+ official municipal rows, no invented values.
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const BASE=path.join(__dirname,'public','data');
const SOURCE={
 organisme:'SDES — Répertoire du parc locatif social (RPLS)',
 millesime:2025,date:'2025-01-01',
 url:'https://www.statistiques.developpement-durable.gouv.fr/54-millions-de-logements-locatifs-sociaux-en-france-au-1er-janvier-2025',
 licence:'Licence Ouverte 2.0'
};
let cache;
function load(){
 if(cache)return cache;
 const p=path.join(BASE,'rpls-2025-communes.json.gz');
 const d=JSON.parse(zlib.gunzipSync(fs.readFileSync(p)).toString('utf8'));
 if(d.schema!=='SDES-RPLS-2025-v1'||!Array.isArray(d.fields)||!d.communes)throw Error('Index SDES RPLS incompatible');
 cache={fields:new Map(d.fields.map((x,i)=>[x,i])),communes:d.communes};
 return cache;
}
const round=(v,dp=1)=>typeof v==='number'&&Number.isFinite(v)?+v.toFixed(dp):null;
function social(code){
 if(!/^(?:[0-9]{5}|2[AB][0-9]{3})$/i.test(code||''))throw Error('Code INSEE invalide');
 const {fields,communes}=load();
 const raw=communes[code];
 if(!raw)return {statut:'absent',code_insee:code,source:SOURCE,
  avertissement:'Aucun enregistrement communal RPLS 2025 pour ce code INSEE dans le fichier national.'};
 const get=i=>{
  const k=fields.get(i);const v=k===undefined?null:raw[k];
  return typeof v==='number'&&Number.isFinite(v)?v:null;
 };
 const total=get(9);
 const item=(label,i,denom=total)=>{
  const val=get(i);return {label,nombre:val,part:val!==null&&denom>0?round(100*val/denom):null}
 };
 const years=Array.from({length:13},(_,i)=>2013+i);
 const history=(type,idx)=>years.map(year=>({annee:year,valeur:get(type==='parc'?(year===2025?9:idx+2024-year):idx+2025-year)}));
 const historyPark=history('parc',27);
 const vacancy=history('rate',104);
 const mobility=history('rate',130);
 const rentals=history('rate',143);
 const occupiedCounter=(get(3)??0)+(get(7)??0)+(get(8)??0);
 const vacant=(get(4)??0)+(get(5)??0);
 const formatRows=[
  item('Biens proposés à la location loués',3),
  item('Biens occupés avec ou sans contrepartie financière',7),
  item('Biens vides',5),
  item('Biens proposés à la location vacants',4),
  item("Biens occupés pour de l'hébergement temporaire",8)
 ];
 const age=[
  item('Moins de 5 ans',76),item('Entre 5 et 10 ans',77),
  item('Entre 10 et 20 ans',78),item('Entre 20 et 40 ans',79),
  item('Entre 40 et 60 ans',80),item('Plus de 60 ans',81)
 ];
 const funding=[
  {...item('PLUS avant 1977',24),loyer:get(172)},
  {...item('PLUS après 1977',23),loyer:get(173)},
  {...item('PLAI',22),loyer:get(171)},
  {...item('PLS',25),loyer:get(174)},
  {...item('PLI',26),loyer:get(175)}
 ];
 const housing= {
  statut:'disponible',annee:2025,code_insee:code,total,source:SOURCE,
  occupation:{rows:formatRows,
   occupied:occupiedCounter,vacants:vacant,occupied_pct:total>0?round(occupiedCounter*100/total):null},
  typologie:{
   nature:[item('Biens collectifs',16),item('Biens individuels',15)],
   pieces:[item('T1',17),item('T2',18),item('T3',19),item('T4',20),item('T5 et plus',21)]
  },
  anciennete:{rows:age,age_moyen:get(75),
   forty_plus:[get(80),get(81)].every(v=>v!==null)?get(80)+get(81):null,
   twenty_forty:get(79)},
  evolution:{valeurs:historyPark},
  vacance:{valeurs:vacancy,actuel:get(104)},
  mobilite:{valeurs:mobility,actuel:get(130)},
  financements:{rows:funding},
  loyers:{valeurs:rentals,actuel:get(143),
   variation: get(144)>0&&get(143)!==null?round(100*(get(143)/get(144)-1)):null,
   par_anciennete:age.map((r,i)=>({...r,loyer:get(176+i)}))},
  geo:{statut:'indisponible',points:[],non_geolocalises:null}
 };
 try{
  const p=path.join(BASE,'rpls-geo-'+code+'.json');
  const d=JSON.parse(fs.readFileSync(p,'utf8'));
  if(d.code_insee===code&&Array.isArray(d.points)){
   housing.geo={statut:'disponible',points:d.points, nombre_points:d.nombre_points,
    nombre_logements:d.nombre_logements,non_geolocalises:d.non_geolocalises,
    source:d.details,avertissement:d.avertissement};
  }
 }catch(_){}
 if(total!==formatRows.reduce((s,r)=>s+(r.nombre||0),0))
  housing.avertissement='Les ventilations officielles peuvent être perturbées par les règles de secret statistique.';
 return housing;
}
module.exports={social,load,SOURCE};
