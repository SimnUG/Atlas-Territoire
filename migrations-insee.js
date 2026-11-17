'use strict';
/* INSEE — base flux des migrations résidentielles 2023, téléchargée à la demande.
 * Aucun nombre fictif, aucun recours à un fournisseur non autorisé.
 */
const zlib=require('node:zlib');
const SOURCE='https://www.insee.fr/fr/statistiques/fichier/8998241/base-flux-mobilite-residentielle-2023_csv.zip';
const META={nom:'INSEE — Recensement 2023, base flux de mobilité résidentielle',url:'https://www.insee.fr/fr/statistiques/8998241',millesime:2023};
let cache=null,pending=null;
function unzipCsv(zip){
 // Parcours du répertoire central ZIP (pas de dépendance npm).
 let e=-1;
 for(let i=zip.length-22;i>=Math.max(0,zip.length-65558);i--)if(zip.readUInt32LE(i)===0x06054b50){e=i;break}
 if(e<0)throw Error('Archive ZIP non reconnue');
 let p=zip.readUInt32LE(e+16);const count=zip.readUInt16LE(e+10);
 for(let j=0;j<count;j++){
  if(zip.readUInt32LE(p)!==0x02014b50)throw Error('Index ZIP illisible');
  const method=zip.readUInt16LE(p+10),size=zip.readUInt32LE(p+20);
  const fnameLen=zip.readUInt16LE(p+28),extra=zip.readUInt16LE(p+30),comment=zip.readUInt16LE(p+32);
  const local=zip.readUInt32LE(p+42),name=zip.subarray(p+46,p+46+fnameLen).toString();
  p+=46+fnameLen+extra+comment;
  if(!/\.csv$/i.test(name))continue;
  if(zip.readUInt32LE(local)!==0x04034b50)throw Error('Entrée ZIP illisible');
  const start=local+30+zip.readUInt16LE(local+26)+zip.readUInt16LE(local+28);
  const packed=zip.subarray(start,start+size);
  if(method===0)return packed.toString('utf8');
  if(method===8)return zlib.inflateRawSync(packed).toString('utf8');
  throw Error('Compression ZIP non prise en charge');
 }
 throw Error('Aucun CSV dans le ZIP INSEE');
}
function parse(csv){
 const lines=csv.replace(/^\uFEFF/,'').split(/\r?\n/);
 const headerIndex=lines.findIndex(l=>l.includes('CODGEO')&&l.includes('DCRAN')&&l.includes('NBFLUX'));
 if(headerIndex<0)throw Error('Schéma officiel de flux inconnu');
 const h=lines[headerIndex].split(';').map(s=>s.replace(/^"|"$/g,'').trim());
 const idx=k=>h.indexOf(k);
 const target=idx('CODGEO'),prev=idx('DCRAN'),title=idx('LIBGEO'),origin=idx('L_DCRAN');
 const flux=idx('NBFLUX_C23_POP01P'),pop=idx('C23_POP01P');
 const old=idx('C23_POP01P_IRAN012'),changed=idx('C23_POP01P_IRANAUT');
 if([target,prev,flux].some(i=>i<0))throw Error('Colonnes essentielles absentes');
 const map=new Map();
 const number=s=>{const n=Number(String(s||'').replace(/\s/g,'').replace(',','.'));return Number.isFinite(n)&&n>=0?n:null};
 for(let i=headerIndex+1;i<lines.length;i++){
  const l=lines[i];if(!l)continue;
  const fields=l.split(';').map(s=>s.replace(/^"|"$/g,'').trim());
  if(fields.length<h.length)continue;
  const code=fields[target],from=fields[prev],v=number(fields[flux]);
  if(!/^(?:\d{5}|2[AB]\d{3})$/i.test(code)||v===null)continue;
  let obj=map.get(code);
  if(!obj){obj={code,nom:fields[title]||code,total:null,unchangedCommune:null,changedCommune:null,flux:[]};map.set(code,obj)}
  if(pop>=0&&obj.total===null)obj.total=number(fields[pop]);
  if(old>=0&&obj.unchangedCommune===null)obj.unchangedCommune=number(fields[old]);
  if(changed>=0&&obj.changedCommune===null)obj.changedCommune=number(fields[changed]);
  if(from)obj.flux.push({code:from,nom:fields[origin]||from,valeur:v});
 }
 if(map.size<1000)throw Error('Fichier de flux incomplet');
 return map;
}
async function all(){
 if(cache&&cache.until>Date.now())return cache.value;
 if(pending)return pending;
 pending=(async()=>{
  const r=await fetch(SOURCE,{headers:{Accept:'application/zip, application/octet-stream'},signal:AbortSignal.timeout(55000)});
  if(!r.ok)throw Error('Téléchargement INSEE HTTP '+r.status);
  const len=Number(r.headers.get('content-length')||0);
  if(len>30000000)throw Error('Archive source trop volumineuse');
  const buf=Buffer.from(await r.arrayBuffer());
  if(buf.length>30000000)throw Error('Archive source trop volumineuse');
  const value=parse(unzipCsv(buf));
  cache={value,until:Date.now()+24*3600000};
  return value;
 })();
 try{return await pending}finally{pending=null}
}
async function migrations(code){
 if(!/^(?:\d{5}|2[AB]\d{3})$/i.test(code))throw Error('Code commune invalide');
 const data=(await all()).get(code);
 if(!data)return{source:META,code_insee:code,statut:'indisponible',raison:'Commune absente du fichier des flux 2023'};
 const origins=data.flux.filter(f=>f.code!==code&&f.valeur>0)
   .sort((a,b)=>b.valeur-a.valeur);
 const internal=data.flux.filter(f=>f.code===code).reduce((a,b)=>a+b.valeur,0);
 const incoming=origins.reduce((a,b)=>a+b.valeur,0);
 return {source:META,code_insee:code,commune:data.nom,statut:'disponible',
  total:data.total,conserveCommune:data.unchangedCommune,changeCommune:data.changedCommune,
  mobiliteIntra:internal,entrants:incoming,origines:origins,
  note:'Estimations pondérées du recensement INSEE ; le total des flux peut différer des chiffres de population principale. Les profils CSP/âge/ménage ne sont pas présents dans cette base.'};
}
module.exports={migrations,parse,unzipCsv,META};
