'use strict';
/**
 * Classement ABC au 26 juin 2026 — DHUP / ministère du Logement.
 * Sources officielles :
 * https://www.data.gouv.fr/datasets/liste-des-communes-selon-le-zonage-abc/
 * Arrêté du 23 juin 2026 (JORF du 25 juin), en vigueur le 26 juin.
 * Ce dernier arrêté ne modifie qu'Alfortville (94002) : A -> A bis.
 */
const extras=require('./official-extras');
const SOURCE='https://www.data.gouv.fr/datasets/liste-des-communes-selon-le-zonage-abc/';
const CSV='https://static.data.gouv.fr/resources/liste-des-communes-selon-le-zonage-abc/20260703-091314/liste-ensemble-des-communes-zonage-abc-en-vigueur-26-juin-2026.csv';
const ARRETE='https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054306084';
const CARTE='https://www.ecologie.gouv.fr/sites/default/files/documents/Carte_France_zonage_ABC_2026.pdf';
const MINISTERE='https://www.ecologie.gouv.fr/politiques-publiques/zonage-b-c';
const SOURCE_INFO={
  nom:'DHUP — Ministère chargé du Logement, zonage ABC en vigueur au 26 juin 2026',
  url:SOURCE, fichier:CSV, carte:CARTE, arrete:ARRETE, ministere:MINISTERE,
  date_entree_en_vigueur:'2026-06-26',date_fichier:'2026-07-03',licence:'Licence Ouverte 2.0'
};
const validCode=code=>/^(?:[0-9]{5}|2[AB][0-9]{3})$/i.test(String(code||''));
const clean=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function zoneCanon(zone){
 const s=String(zone??'').normalize('NFKC').toUpperCase()
   .replace(/\s+/g,'').replace(/[\-_.]/g,'').replace(/^ZONE/,'');
 if(s==='ABIS'||s==='A1')return 'A bis';
 return ['A','B1','B2','C'].includes(s)?s:null;
}
function csvRows(data,separator){
 let rows=[],row=[],current='',inside=false;
 data=String(data||'').replace(/^\uFEFF/,'');
 for(let i=0;i<data.length;i++){
   const ch=data[i];
   if(ch==='"'){
     if(inside&&data[i+1]==='"'){current+='"';i++}else inside=!inside;
   }else if(ch===separator&&!inside){row.push(current.trim());current=''}
   else if((ch==='\r'||ch==='\n')&&!inside){
     if(ch==='\r'&&data[i+1]==='\n')i++;
     row.push(current.trim());if(row.some(Boolean))rows.push(row);
     row=[];current='';
   }else current+=ch;
 }
 row.push(current.trim());if(row.some(Boolean))rows.push(row);
 return rows;
}
function locateHeader(rows){
 for(let i=0;i<Math.min(rows.length,25);i++){
  const headers=rows[i].map(clean);
  const code=headers.findIndex(h=>/^(?:codeinsee|codecog|codegeo|codecommune|codeinseedelacommune|codgeo|codcom|insee|codeinseecommune)$/.test(h)||/^(?:codeinsee|codecommune)/.test(h));
  const zone=headers.findIndex(h=>/^(?:zonageabc|zoneabc|zonage2026|zone2026|zonage|classement|zone|zonageabcen vigueur|zoneabc2026)/.test(h)&&!/(?:avant|ancien|precedent|2025|reclassement|historique|origine)/.test(h));
  if(code>=0&&zone>=0)return {index:i,code,zone,headers:rows[i]};
 }
 return null;
}
function parseCsv(csv){
 const intro=String(csv||'').slice(0,15000);
 const n1=(intro.match(/;/g)||[]).length,n2=(intro.match(/,/g)||[]).length,n3=(intro.match(/\t/g)||[]).length;
 const separator=n3>n1&&n3>n2?'\t':n1>=n2?';':',';
 const rows=csvRows(csv,separator),header=locateHeader(rows);
 if(!header)throw Error('Colonnes code INSEE ou zonage non identifiées dans le fichier ministériel');
 const out=new Map();
 for(const row of rows.slice(header.index+1)){
  const code=String(row[header.code]||'').replace(/\.0$/,'').trim().toUpperCase().padStart(5,'0');
  const zone=zoneCanon(row[header.zone]);
  if(validCode(code)&&zone){
   if(out.has(code)&&out.get(code)!==zone)throw Error('Classement contradictoire pour le code INSEE '+code);
   out.set(code,zone);
  }
 }
 if(out.size<30000)throw Error('Fichier national de zonage incomplet ('+out.size+' communes)');
 return out;
}
let csvCache=null,downloadPromise=null;
async function csvMap(){
 if(csvCache&&csvCache.until>Date.now())return csvCache.map;
 if(!downloadPromise){
  downloadPromise=(async()=>{
    const response=await fetch(CSV,{signal:AbortSignal.timeout(18000),headers:{Accept:'text/csv,*/*;q=0.8'}});
    if(!response.ok)throw Error('Source officielle : HTTP '+response.status);
    const raw=await response.arrayBuffer();
    if(raw.byteLength<300000||raw.byteLength>3000000)throw Error('Taille de fichier inattendue');
    let csv;try{csv=new TextDecoder('utf-8',{fatal:true}).decode(raw)}
       catch(_){csv=new TextDecoder('windows-1252').decode(raw)}
    const map=parseCsv(csv);
    csvCache={map,until:Date.now()+24*3600*1000};
    return map;
  })().finally(()=>{downloadPromise=null});
 }
 return downloadPromise;
}
async function zonage(code){
 code=String(code||'').trim().toUpperCase();
 if(!validCode(code))throw Object.assign(new Error('Code INSEE invalide'),{status:400});
 let zone=null,method=null;
 try{
  const existing=await extras.abc(code);
  zone=zoneCanon(existing?.zone);
  if(zone)method='API tabulaire nationale (DHUP)';
 }catch(_){}
 if(!zone){
  try{
   zone=(await csvMap()).get(code)||null;
   if(zone)method='CSV national (DHUP)';
  }catch(_){}
 }
 if(!zone){
  return {statut:'indisponible',code_insee:code,zone:null,
   reclassement_juin_2026:null,departement:/^2[AB]/.test(code)?'2A / 2B':code.slice(0,2),
   message:'Classement non confirmé dans la liste officielle au 26 juin 2026.',source:SOURCE_INFO};
 }
 const reclassification=code==='94002'; // Unique commune modifiée par l'arrêté du 23 juin 2026.
 return {statut:'disponible',code_insee:code,zone,
  reclassement_juin_2026:reclassification,
  departement:/^2[AB]/.test(code)?code.slice(0,2):code.slice(0,2),
  date_effet:'2026-06-26',methode:method,source:SOURCE_INFO};
}
module.exports={zonage,parseCsv,zoneCanon,locateHeader,validCode,SOURCE,CSV,ARRETE,CARTE};
