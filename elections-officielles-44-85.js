'use strict';
/** Municipal elections: verified Ministry of Interior 2026 by commune/BV,
 * preserve historical 2008–2020 where already available. No invented votes.
 */
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const DATA=path.join(__dirname,'public','data');
let cached;let attempted=false;
const valid=/^(?:[0-9]{5}|2[AB][0-9]{3})$/i;
function index(){
 if(attempted)return cached;
 attempted=true;
 try{
  const raw=zlib.gunzipSync(fs.readFileSync(path.join(DATA,'elections-2026-44-85.json.gz'))).toString('utf8');
  const d=JSON.parse(raw);
  if(d.schema!=='ATLAS-MUNICIPALES-2026-v1'||!d.communes)throw Error('Répertoire municipal 2026 invalide');
  cached=d.communes;
 }catch(_){cached=null}
 return cached;
}
function get(code){
 if(!valid.test(code||''))throw Error('Code INSEE invalide');
 const target=path.join(DATA,'elections-'+code+'.json');
 let legacy=null;
 try{legacy=JSON.parse(fs.readFileSync(target,'utf8'))}catch(_){}
 const record=index()?.[code];
 const prior=Array.isArray(legacy?.scrutins)?legacy.scrutins:[];
 const records=Array.isArray(record?.scrutins)?record.scrutins:[];
 const key=r=>r.annee+'-'+r.tour;
 const rounds=new Map();
 for(const x of [...records,...prior])rounds.set(key(x),x); // historical local first-priority for established datasets
 const scrutins=[...rounds.values()].sort((a,b)=>b.annee-a.annee||a.tour-b.tour);
 const sourceArr=new Map();
 for(const x of scrutins){
  if(x.source)sourceArr.set(key(x),{annee:x.annee,tour:x.tour,url:x.source});
 }
 return scrutins.length?{
  statut:'disponible',code_insee:code,commune:legacy?.commune||'',
  scrutins,sources:[...sourceArr.values()],
  avertissement:'Résultats officiels par commune. Les années sans fichiers exploitables restent absentes, et la définition des bureaux peut évoluer.'
 }:{
  statut:'indisponible',code_insee:code,scrutins:[],
  raison:'Résultats officiels municipaux non répertoriés pour cette commune dans le fichier courant.'
 };
}
module.exports={get,index};
