#!/usr/bin/env node
'use strict';
/**
 * Indexe toutes les communes actuelles des départements 44 et 85.
 * Sources exclusives :
 *  - GEO API gouvernementale : mapping COG commune => EPCI
 *  - INSEE Melodi : historique 1968–2023 et logement RP 2017/2023
 *
 * Conserve les observations nul/supprimées sans inventer de valeurs.
 */
const fs=require('node:fs');
const zlib=require('node:zlib');
const path=require('node:path');
const insee=require('../logements-insee-complet');
const OUT=path.resolve(__dirname,'../public/data/logements-44-85-2023.json.gz');
const REPORT=path.resolve(__dirname,'../public/data/logements-44-85-couverture.json');
const departments=['44','85'];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function jsonGet(url){
 let err;
 for(let attempt=0;attempt<4;attempt++){
  try{
   const res=await fetch(url,{headers:{Accept:'application/json'},
    signal:AbortSignal.timeout(23000)});
   if(!res.ok)throw Error('GEO HTTP '+res.status+' '+url);
   return await res.json();
  }catch(e){err=e;if(attempt<3)await sleep((attempt+1)*800)}
 }
 throw err;
}
async function listDepartement(code){
 const url='https://geo.api.gouv.fr/departements/'+code+'/communes?fields=code,nom,codeEpci&format=json';
 const data=await jsonGet(url);
 if(!Array.isArray(data)||data.length<100)throw Error('Liste officielle de '+code+' invalide');
 return data.map(x=>({...x,departement:code}));
}
async function getEpciName(code){
 const data=await jsonGet('https://geo.api.gouv.fr/epcis/'+code+'?fields=nom,code&format=json');
 return data.nom||code;
}
async function getCommuneEpci(code){
 const d=await jsonGet('https://geo.api.gouv.fr/communes/'+code+'?fields=nom,code,codeEpci&format=json');
 return d.codeEpci||null;
}
async function build(){
 const list=(await Promise.all(departments.map(listDepartement))).flat().sort((a,b)=>a.code.localeCompare(b.code));
 if(list.length<350||list.length>700)throw Error('Nombre de communes inattendu : '+list.length);
 const allEpcis=[...new Set(list.map(x=>x.codeEpci).filter(x=>/^[0-9]{9}$/.test(x)))];
 const names=new Map();
 await Promise.all(allEpcis.map(async c=>{
  try{names.set(c,await getEpciName(c))}
  catch(_){names.set(c,c)}
 }));
 const profiles={},failures=[],alerts=[],started=Date.now();
 let next=0,done=0;
 const workers=Array.from({length:7},async()=>{
  while(true){
   const idx=next++;
   if(idx>=list.length)return;
   const commune=list[idx];
   const code=commune.code;
   let epci=commune.codeEpci;
   if(!/^[0-9]{9}$/.test(epci||'')){
    try{epci=await getCommuneEpci(code)}
    catch(e){failures.push({code,commune:commune.nom,erreur:'EPCI : '+e.message});continue}
   }
   let lastError;
   for(let n=0;n<4;n++){
    try{
     const d=await insee.logement({
      commune:code,epci,nomCommune:commune.nom,
      nomEpci:names.get(epci)||epci
     });
     if(d.statut!=='disponible'||d.tableaux.length!==5)throw Error('Profil incomplet');
     const fields=d.tableaux.flatMap(t=>t.lignes.flatMap(r=>
      ['commune','epci'].flatMap(level=>['2023','2017','part'].map(key=>r[level][key]))));
     const missing=fields.filter(x=>x===null).length;
     if(missing)alerts.push({code,nom:commune.nom,manquants:missing});
     profiles[code]=d;lastError=null;break;
    }catch(e){
     lastError=e;
     if(n<3)await sleep(1000*(n+1));
    }
   }
   if(lastError)failures.push({code,commune:commune.nom,erreur:lastError.message});
   done++;
   if(done%25===0||done===list.length){
    console.log('INDEX',done+'/'+list.length,'profils',Object.keys(profiles).length,'erreurs',failures.length,'elapsed',Math.round((Date.now()-started)/1000)+'s');
   }
  }
 });
 await Promise.all(workers);
 const metadata={
  schema:'ATLAS-RP-LOGEMENT-2023-44-85-v1',
  source:'INSEE Melodi — DS_RP_SERIE_HISTORIQUE + DS_RP_LOGEMENT_PRINC',
  millesime:2023,geographie:'COG 2026',
  departements,
  generé_le:new Date().toISOString().slice(0,10),
  communes:profiles
 };
 fs.mkdirSync(path.dirname(OUT),{recursive:true});
 fs.writeFileSync(OUT,zlib.gzipSync(Buffer.from(JSON.stringify(metadata)),{level:9}));
 fs.writeFileSync(REPORT,JSON.stringify({
  schema:metadata.schema,
  date:metadata.generé_le,
  communes_attendues:list.length,communes_indexees:Object.keys(profiles).length,
  erreurs:failures,
  alertes_de_donnees_manquantes:alerts,
  epci_differents:allEpcis.length
 },null,2)+'\n');
 console.log('SUMMARY',JSON.stringify({
  communes:list.length,indexed:Object.keys(profiles).length,failed:failures.length,
  withMissing:alerts.length,epcis:allEpcis.length,
  archiveKB:Math.round(fs.statSync(OUT).size/1024)}));
 if(Object.keys(profiles).length<list.length*.99)
  throw Error('Couverture inférieure à 99% : '+Object.keys(profiles).length+'/'+list.length);
}
build().catch(e=>{console.error(e);process.exitCode=1});
