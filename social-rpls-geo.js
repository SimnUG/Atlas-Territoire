'use strict';
// Georeferenced positions from public SDES RPLS records, grouped by coordinate.
// This endpoint never exports dwelling IDs, tenants, landlords or individual occupancy.
const fs=require('node:fs');
const path=require('node:path');
const DATA=path.join(__dirname,'public','data');
const BASE='https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1/datafiles/f3c2f2cb-8fb1-40fd-8733-964247744c9a/rows';
const MAX_RECORDS=2500;
const CACHE=new Map();
const n=x=>{if(x===null||x===undefined||x==='')return null;const v=Number(x);return Number.isFinite(v)?v:null};
const round=(v,p=6)=>+v.toFixed(p);
const RAD=Math.PI/180;
function lambert93(x,y){
 // Lambert conformal conic 2SP EPSG:2154 (GRS80) => WGS84.
 const a=6378137,e=0.08181919104281579,phi1=44*RAD,phi2=49*RAD,phi0=46.5*RAD,lon0=3*RAD;
 const m=p=>Math.cos(p)/Math.sqrt(1-e*e*Math.sin(p)**2);
 const t=p=>Math.tan(Math.PI/4-p/2)/Math.pow((1-e*Math.sin(p))/(1+e*Math.sin(p)),e/2);
 const n=Math.log(m(phi1)/m(phi2))/Math.log(t(phi1)/t(phi2));
 const F=m(phi1)/(n*t(phi1)**n),rho0=a*F*t(phi0)**n;
 const east=x-700000,north=rho0-(y-6600000);
 const rho=Math.hypot(east,north), theta=Math.atan2(east,north);
 const tt=Math.pow(rho/(a*F),1/n);
 let phi=Math.PI/2-2*Math.atan(tt);
 for(let j=0;j<12;j++)phi=Math.PI/2-2*Math.atan(tt*Math.pow((1-e*Math.sin(phi))/(1+e*Math.sin(phi)),e/2));
 return {lat:round(phi/RAD),lng:round((lon0+theta/n)/RAD)};
}
async function fetchPage(code,page){
 const u=new URL(BASE);
 u.searchParams.set('millesime','2025-01');
 u.searchParams.set('DEPCOM','eq:'+code);
 u.searchParams.set('pageSize','100');
 u.searchParams.set('page',String(page));
 u.searchParams.set('columns','X,Y,EPSG,CONSTRUCT,DISTANCE_PRECISION');
 const r=await fetch(u,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('SDES HTTP '+r.status);
 return r.json();
}
function aggregate(rows,code){
 const grouped=new Map();
 let missing=0;
 for(const r of rows){
  if(String(r.EPSG||'')!=='2154'){missing++;continue}
  const x=n(r.X),y=n(r.Y);
  if(x===null||y===null){missing++;continue}
  const key=round(x,2)+','+round(y,2);
  let g=grouped.get(key);
  if(!g){g={x,y,nombre:0,years:[],precision:[]};grouped.set(key,g)}
  g.nombre++;
  const year=n(r.CONSTRUCT);if(year!==null&&year>=1850&&year<=2025)g.years.push(year);
  const precision=n(r.DISTANCE_PRECISION);if(precision!==null&&precision>=0)g.precision.push(precision);
 }
 const points=[];
 for(const g of grouped.values()){
  const coord=lambert93(g.x,g.y);
  if(!Number.isFinite(coord.lat)||!Number.isFinite(coord.lng))continue;
  points.push({...coord,nombre:g.nombre,
    annee:g.years.length?Math.round(g.years.reduce((s,x)=>s+x,0)/g.years.length):null,
    precision_m:g.precision.length?Math.round(Math.max(...g.precision)):null});
 }
 points.sort((a,b)=>a.lat-b.lat||a.lng-b.lng);
 return {statut:'disponible',nombre_points:points.length, nombre_logements:rows.length,
  non_geolocalises:missing,points,
  source:'SDES — RPLS détaillé au logement 2025 (DiDo)',
  avertissement:'Coordonnées publiques indicatives, issues du RPLS. Certaines positions peuvent désigner une voie plutôt qu’un bâtiment précis.'};
}
async function raw(code){
 const file=path.join(DATA,'rpls-geo-'+code+'.json');
 try{
  const d=JSON.parse(fs.readFileSync(file,'utf8'));
  if(d.code_insee===code&&Array.isArray(d.points)){
   return {statut:'disponible',points:d.points,nombre_points:d.nombre_points,
    nombre_logements:d.nombre_logements,non_geolocalises:d.non_geolocalises,
    source:d.details,avertissement:d.avertissement};
  }
 }catch(_){}
 const first=await fetchPage(code,1);
 const total=Number(first.total);
 if(!Number.isInteger(total)||total<0)throw Error('Total de logements RPLS invalide');
 if(total>MAX_RECORDS)return {statut:'limite',nombre_logements:total,points:[],
  raison:'La carte détaillée en direct est limitée aux communes de 2 500 logements sociaux.'};
 if(total===0)return {statut:'absent',nombre_logements:0,points:[]};
 const pages=Math.ceil(total/100),results=Array(pages);
 results[0]=first.data||[];
 for(let p=2;p<=pages;p+=4){
  const batch=await Promise.all(Array.from({length:Math.min(4,pages-p+1)},(_,i)=>fetchPage(code,p+i)));
  batch.forEach((r,i)=>{if(r.total!==total)throw Error('Pagination RPLS incohérente');results[p+i-1]=r.data||[]});
 }
 const rows=results.flat();
 if(rows.length!==total)throw Error('Pagination RPLS incomplète : '+rows.length+'/'+total);
 return aggregate(rows,code);
}
async function get(code){
 if(!/^(?:[0-9]{5}|2[AB][0-9]{3})$/i.test(code||''))throw Error('Code INSEE invalide');
 const known=CACHE.get(code);
 if(known&&known.expires>Date.now())return known.promise;
 const promise=raw(code);
 CACHE.set(code,{promise,expires:Date.now()+6*3600_000});
 if(CACHE.size>45)CACHE.delete(CACHE.keys().next().value);
 try{return await promise}catch(e){CACHE.delete(code);throw e}
}
module.exports={get,lambert93,aggregate,MAX_RECORDS};
