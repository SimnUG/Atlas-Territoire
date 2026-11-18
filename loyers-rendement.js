'use strict';
/* Rendement brut indicatif à partir des loyers ANIL et des prix DVF+ Cerema.
 * Uniquement pour maisons ou appartements, si >=5 mutations valides et exhaustives.
 * Ni charges, ni fiscalité, ni vacance déduites (loyers d'annonces CC).
 */
const rentals=require('./rental-data');
const SOURCE={nom:'DVF+ open data — DGFiP / Cerema',
 url:'https://www.data.gouv.fr/datasets/dvfplus-open-data',
 methode:'Prix de vente médian des mutations à destination exclusivement maison (111) ou appartement (121), prix foncier divisé par surface bâtie; min. 5 ventes par année et catégorie'};
const START='https://apidf-preprod.cerema.fr/dvf_opendata/mutations/';
const memo=new Map();
const numeric=v=>{
 if(v===null||v===undefined||v==='')return null;
 const n=Number(String(v).trim().replace(/[\s\u00a0\u202f]/g,'').replace(',','.'));
 return Number.isFinite(n)?n:null;
};
const median=ns=>{
 const a=ns.filter(Number.isFinite).sort((a,b)=>a-b);
 const k=Math.floor(a.length/2);
 return a.length?(a.length%2?a[k]:(a[k-1]+a[k])/2):null;
};
const field=(obj,...keys)=>{
 for(const k of keys)if(obj?.[k]!==undefined&&obj[k]!==null)return obj[k];
 return null;
};
function prepare(raw,code){
 const insee=field(raw,'codcomm','code_insee','codecomm','COMM');
 if(insee!==null&&String(insee).padStart(5,'0')!==code)return null;
 const type=String(field(raw,'codtypbien')??'');
 if(type!=='111'&&type!=='121')return null;
 const vefa=String(field(raw,'vefa')??'').toLowerCase().trim();
 if(['oui','1','true','vrai'].includes(vefa))return null;
 const year=String(field(raw,'anneemut','datemut','date_mutation')||'').slice(0,4);
 if(!/^(2022|2023|2024|2025)$/.test(year))return null;
 const prix=numeric(field(raw,'valeurfonc','valeur_fonciere'));
 const surface=numeric(field(raw,'sbati','surface_reelle_bati'));
 if(!prix||!surface||surface<10||surface>1200||prix/surface<400||prix/surface>25000)return null;
 const id=field(raw,'idmutation','idmut','idopendata','idnatmut');
 if(!id)return null;
 return {id:String(id),year:Number(year),type:type==='111'?'maisons':'appartements',prix:prix/surface};
}
async function getMutations(code){
 let url=new URL(START);
 url.searchParams.set('code_insee',code);
 url.searchParams.set('anneemut_min','2022');
 url.searchParams.set('anneemut_max','2025');
 url.searchParams.set('page_size','500');
 url.searchParams.set('page','1');
 let all=[],visited=new Set(),page=0,reported=null;
 while(url&&page<60){
  const current=url.toString();
  if(visited.has(current))throw Error('Pagination DVF bouclée');
  visited.add(current);
  const response=await fetch(current,{signal:AbortSignal.timeout(22000),headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('DVF+ '+response.status);
  const body=await response.json();
  const rows=Array.isArray(body)?body:body?.results||body?.data||body?.items;
  if(!Array.isArray(rows))throw Error('Format de DVF+ inconnu');
  all.push(...rows);page++;
  if(Number.isFinite(Number(body?.count)))reported=Number(body.count);
  const next=body?.next;
  if(!next){url=null;break}
  const dest=new URL(next,url);
  if(dest.protocol!=='https:'||dest.hostname!=='apidf-preprod.cerema.fr'||!dest.pathname.startsWith('/dvf_opendata/mutations'))
   throw Error('Redirection DVF+ non reconnue');
  url=dest;
 }
 if(url||reported!==null&&all.length<reported)throw Error('Source DVF+ incomplète, prix annuels non calculés');
 const unique=new Set(),groups={};
 for(const raw of all){
  const row=prepare(raw,code);
  if(!row)continue;
  const key=row.id+'/'+row.type;
  if(unique.has(key))continue;
  unique.add(key);
  const period=row.year+'/'+row.type;
  (groups[period]??=[]).push(row.prix);
 }
 const data={};
 for(const year of [2022,2023,2024,2025]){
  data[year]={};
  for(const type of ['appartements','maisons']){
   const values=groups[year+'/'+type]||[];
   data[year][type]={nombre_ventes:values.length,prix_m2:values.length>=5?median(values):null};
  }
 }
 return {data,mutations_lues:all.length,source:SOURCE,exhaustif:true};
}
async function rendement(code){
 if(!/^(44|85)\d{3}$/.test(String(code||'')))throw Error('Code INSEE invalide');
 if(memo.has(code)&&memo.get(code).until>Date.now())return memo.get(code).promise;
 const promise=(async()=>{
  let dvf;
  try{dvf=await getMutations(code)}
  catch(e){return {statut:'indisponible',code_insee:code,raison:e.message,source:SOURCE,annees:{}}}
  const rent=await rentals.rent({code,historique:true});
  const annual={};
  for(const year of [2022,2023,2024,2025]){
   annual[year]={};
   for(const type of ['appartements','maisons']){
    const price=dvf.data[year][type],obs=rent.types?.find(x=>x.id===type)?.serie?.find(x=>x.annee===year);
    const loyer=typeof obs?.loyer==='number'&&obs.loyer>0?obs.loyer:null;
    const yieldRate=loyer&&price.prix_m2?loyer*12/price.prix_m2*100:null;
    annual[year][type]={prix_m2:price.prix_m2,ventes:price.nombre_ventes,
     loyer,loyer_niveau:obs?.niveau_prediction||null,rendement:yieldRate};
   }
  }
  return {statut:'disponible',code_insee:code,annees:annual,source:SOURCE,
   note:'Rendement brut indicatif, non corrigé des charges, du risque de vacance et de la fiscalité ; prix médians DVF sur au moins 5 mutations par type et année. Les loyers de la carte ANIL sont charges comprises.'};
 })();
 memo.set(code,{until:Date.now()+2*3600000,promise});
 try{return await promise}catch(e){memo.delete(code);throw e}
}
module.exports={rendement,prepare,median};
