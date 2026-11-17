'use strict';
/* INSEE RP2023 MIGCOM — traitement en flux, pondéré par IPONDI.
 * Source : https://www.insee.fr/fr/statistiques/9004805
 * Ne persiste pas de données individuelles. Une analyse calculée par commune
 * n'inclut que des totaux statistiques agrégés, mis en cache temporairement.
 */
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const readline=require('node:readline');
const {Readable}=require('node:stream');
const {pipeline}=require('node:stream/promises');
const yauzl=require('yauzl');
const URL='https://www.insee.fr/fr/statistiques/fichier/9004805/RP2023_migcom.zip';
const SOURCE={nom:'INSEE — RP2023, fichier détail MIGCOM',url:'https://www.insee.fr/fr/statistiques/9004805',millesime:2023,ponderation:'IPONDI',geographie:'2025'};
const CACHE=new Map();
const GROUPS={
 csp:[['6','Ouvriers'],['4','Professions intermédiaires'],['5','Employés'],['12','Chômeurs'],['21','Retraités'],['3','Cadres et professions intellectuelles supérieures'],['2','Artisans, commerçants, chefs d’entreprise'],['1','Agriculteurs exploitants'],['autres','Autres personnes']],
 age:[['00','Moins de 15 ans'],['15','15 à 19 ans'],['20','20 à 24 ans'],['25','25 à 39 ans'],['40','40 à 54 ans'],['55','55 à 64 ans'],['65','65 à 79 ans'],['80','80 ans ou plus']],
 occupation:[['10','Propriétaire'],['21','Locataire du parc privé (non HLM)'],['22','Locataire du parc social (HLM)'],['23','Locataire meublé / hôtel'],['30','Logé gratuitement']],
 menage:[['1','1 personne'],['2','2 personnes'],['3','3 personnes'],['4','4 personnes'],['5','5 personnes'],['6','6 personnes ou plus']]
};
const sum=(obj,key,v)=>{obj[key]=(obj[key]||0)+v};
function profile(cross=false){return{total:0,csp:{},age:{},occupation:{},menage:{},byCsp:cross?{}:null}}
function addProfile(p,f,w){
 p.total+=w;
 const csp=f.TACTM==='12'?'12':f.TACTM==='21'?'21':/^[1-6]$/.test(f.GSM)?f.GSM:'autres';
 sum(p.csp,csp,w);
 if(p.byCsp){if(!p.byCsp[csp])p.byCsp[csp]=profile(false);addProfile(p.byCsp[csp],f,w)}
 if(GROUPS.age.some(([c])=>c===f.AGEMEN8))sum(p.age,f.AGEMEN8,w);
 if(GROUPS.occupation.some(([c])=>c===f.STOCD))sum(p.occupation,f.STOCD,w);
 if(GROUPS.menage.some(([c])=>c===f.NPERR))sum(p.menage,f.NPERR,w);
}
function output(p){
 const rows={};
 for(const [kind,groups] of Object.entries(GROUPS)){
  rows[kind]=groups.map(([code,label])=>({code,label,valeur:p[kind][code]||0}))
   .filter(x=>x.valeur>0);
 }
return {total:p.total,distributions:rows,...(p.byCsp?{parCsp:Object.fromEntries(Object.entries(p.byCsp).map(([k,v])=>[k,output(v)]))}:{})};
}
function openZip(file){
 return new Promise((resolve,reject)=>yauzl.open(file,{lazyEntries:true,autoClose:true},(e,zip)=>e?reject(e):resolve(zip)));
}
function csvEntry(zip){
 return new Promise((resolve,reject)=>{
  let resolved=false;
  zip.once('error',reject);
  zip.on('entry',e=>{
   if(!/\.csv$/i.test(e.fileName)){zip.readEntry();return}
   zip.openReadStream(e,(err,stream)=>{if(err)reject(err);else{resolved=true;resolve(stream)}});
  });
  zip.once('end',()=>{if(!resolved)reject(Error('Aucun fichier CSV dans MIGCOM'))});
  zip.readEntry();
 });
}
function parseRow(line,columns){
 const vals=line.split(';');
 const o={};
 for(const [key,i] of Object.entries(columns))o[key]=vals[i]||'';
 return o;
}
async function compileZip(filename,code){
 const zip=await openZip(filename);
 try{
  const stream=await csvEntry(zip);
  const lines=readline.createInterface({input:stream,crlfDelay:Infinity});
  let columns=null,checked=0,kept=0;
  const all=profile(),movers=profile(true),flows=new Map(),movement={};
  const validCode=/^(?:\d{5}|2[AB]\d{3})$/i;
  for await(const line of lines){
   if(!columns){
    const h=line.replace(/^\uFEFF/,'').split(';');
    if(!h.includes('COMMUNE')||!h.includes('IPONDI')||!h.includes('IRAN'))continue;
    columns={};
    for(const key of ['COMMUNE','DCRAN','IPONDI','IRAN','GSM','TACTM','AGEMEN8','STOCD','NPERR']){
     columns[key]=h.indexOf(key);if(columns[key]<0)throw Error('Variable INSEE absente : '+key);
    }continue;
   }
   checked++;
   if(!line.startsWith(code+';'))continue;
   const f=parseRow(line,columns);
   if(f.COMMUNE!==code||!validCode.test(f.COMMUNE))continue;
   const w=Number(f.IPONDI.replace(',','.'));
   if(!(w>0)&&w!==0)continue;
   if(!Number.isFinite(w))continue;
   if(!/^[0-9]$/.test(f.IRAN))continue; // exclure les personnes nées après date de référence
   kept++;addProfile(all,f,w);
   sum(movement,f.IRAN,w);
   if(!['2','3','4','5','6','7','8','9'].includes(f.IRAN))continue;
   addProfile(movers,f,w);
   const origin=f.IRAN==='2'?code:f.DCRAN;
   if(!origin)continue;
   if(!flows.has(origin))flows.set(origin,profile(true));
   addProfile(flows.get(origin),f,w);
  }
  if(!columns||checked<10000)throw Error('MIGCOM tronqué ou schéma illisible');
  if(!kept)throw Error('Aucune observation pour la commune '+code);
  const origins={};
  const sorted=[...flows.entries()].sort((a,b)=>b[1].total-a[1].total);
  for(const [key,value] of sorted.slice(0,120))origins[key]=output(value);
  return {statut:'disponible',source:SOURCE,code_insee:code,total:all.total,
    memeLogement:movement['1']||0,intra:movement['2']||0,
    horsOrdinaire:movement['0']||0,
    repartition:Object.fromEntries(Object.entries(movement).filter(([k])=>/^[0-9]$/.test(k))),
    mobiles:output(movers),profilsParOrigine:origins,
    note:'Comptages pondérés des personnes de 1 an ou plus, caractéristiques du ménage observées à la date du recensement. Effectifs arrondis uniquement à l’affichage.'};
 }finally{zip.close()}
}
async function detail(code){
 if(!/^(?:\d{5}|2[AB]\d{3})$/i.test(code))throw Error('Commune invalide');
 const hit=CACHE.get(code);
 if(hit&&hit.until>Date.now())return hit.value;
 const promise=(async()=>{
  const dir=await fs.promises.mkdtemp(path.join(os.tmpdir(),'atlas-insee-mig-'));
  const target=path.join(dir,'RP2023_migcom.zip');
  try{
   const response=await fetch(URL,{signal:AbortSignal.timeout(175000),headers:{Accept:'application/zip'}});
   if(!response.ok)throw Error('Téléchargement INSEE HTTP '+response.status);
   let read=0;
   const {Transform}=require('node:stream');
   const limiter=new Transform({transform(chunk,_enc,cb){
    read+=chunk.length;
    if(read>320*1024*1024)cb(Error('Archive INSEE trop volumineuse'));else cb(null,chunk);
   }});
   await pipeline(Readable.fromWeb(response.body),limiter,fs.createWriteStream(target));
   return await compileZip(target,code);
  }finally{await fs.promises.rm(dir,{recursive:true,force:true})}
 })();
 CACHE.set(code,{value:promise,until:Date.now()+180000});
 try{
  const result=await promise;
  CACHE.set(code,{value:result,until:Date.now()+12*3600000});
  if(CACHE.size>10)CACHE.delete(CACHE.keys().next().value);
  return result;
 }catch(e){CACHE.delete(code);throw e}
}
module.exports={detail,GROUPS,SOURCE};