'use strict';
/** Indicateurs publics de loyers du ministère chargé du logement / ANIL,
 *  référencés sur data.gouv.fr. Les colonnes ou ressources non vérifiables
 *  sont laissées indisponibles, sans valeur simulée. */
const root='https://www.data.gouv.fr/api/1/datasets/';
const source={nom:'Ministère de la Transition écologique — Carte des loyers (estimations ANIL)',url:'https://www.data.gouv.fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025',niveau:'commune'};
const years=[2022,2023,2024,2025];
const types=[
 {id:'appartements',nom:'Appartements',category:'all'},
 {id:'petits',nom:'Appartements T1/T2',category:'small'},
 {id:'grands',nom:'Appartements T3 et plus',category:'large'},
 {id:'maisons',nom:'Maisons',category:'house'}
];
const verified2025={
 appartements:'55b34088-0964-415f-9df7-d87dd98a09be',
 petits:'14a1fe11-b2d1-49b3-9f6b-83d12df9482c',
 grands:'5e3b28a4-cf56-43a3-ae79-43cceeb27f8c',
 maisons:'129f764d-b613-44e4-952c-5ff50a8c9b73'
};
const memo=new Map();
async function cached(key,fn,ttl=6*3600000){
 const e=memo.get(key);if(e&&e.expires>Date.now())return e.value;
 const promise=Promise.resolve().then(fn);
 memo.set(key,{value:promise,expires:Date.now()+ttl});
 try{const result=await promise;memo.set(key,{value:result,expires:Date.now()+ttl});if(memo.size>60)memo.delete(memo.keys().next().value);return result}
 catch(e){memo.delete(key);throw e}
}
async function get(url,timeout=13000){
 const target=new URL(url);
 const allow=new Set(['www.data.gouv.fr','data.gouv.fr','static.data.gouv.fr']);
 if(!allow.has(target.hostname)||target.protocol!=='https:')throw Error('Hôte non autorisé');
 const r=await fetch(target.toString(),{signal:AbortSignal.timeout(timeout),headers:{Accept:'text/csv,application/json,text/plain'}});
 if(!r.ok)throw Error('Données publiques HTTP '+r.status);
 const final=new URL(r.url);
 if(!allow.has(final.hostname))throw Error('Redirection externe refusée');
 const length=Number(r.headers.get('content-length')||0);
 if(length>12*1024*1024)throw Error('Fichier trop volumineux pour une requête à la demande');
 const raw=await r.text();
 if(raw.length>12*1024*1024)throw Error('Volume de données trop important');
 return raw;
}
function norm(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function category(resource){
 const label=norm([resource.title,resource.description,resource.url].join(' '));
 if(label.includes('maison')||label.includes('predmai')||label.includes('predm'))return 'maisons';
 if(/t1t2|12pieces|12piece|12p|1ou2/.test(label)||label.includes('appartementde1ou2'))return 'petits';
 if(/t3|3piecesouplus|3piecesetplus|3ouplus|3etplus|3p/.test(label))return 'grands';
 if(/appartement|predapp/.test(label))return 'appartements';
 return null;
}
async function manifest(y){
 return cached('rentmanifest'+y,async()=>{
  const raw=await get(root+'carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-'+y+'/',10000);
  const d=JSON.parse(raw);
  const producer=norm(d.organization?.name||'');
  if(!producer.includes('ministere')||!producer.includes('transition')||!producer.includes('ecolog')){
   throw Error('Producteur officiel non confirmé');
  }
  const out={};
  for(const res of d.resources||[]){
   if(!/csv/i.test(res.format||'')&&!(res.url||'').toLowerCase().endsWith('.csv'))continue;
   const cat=category(res);
   if(cat&&!out[cat])out[cat]=res;
  }
  // Identifiants vérifiés du jeu officiel 2025 : aucune attribution
  // hypothétique d'un autre fichier à une typologie.
  if(y===2025){
   for(const [type,id] of Object.entries(verified2025)){
    const verified=(d.resources||[]).find(r=>r.id===id);
    if(verified)out[type]=verified;
   }
  }
  return out;
 },86400000);
}
function parseLine(line,delim){
 const out=[];let part='',q=false;
 for(let i=0;i<line.length;i++){
  const ch=line[i];
  if(ch==='"'&&q&&line[i+1]==='"'){part+='"';i++}
  else if(ch==='"')q=!q;
  else if(ch===delim&&!q){out.push(part.trim());part=''}
  else part+=ch;
 }out.push(part.trim());return out;
}
function parseRecords(text){
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
 const header=lines[0]||'';
 const delim=(header.match(/;/g)||[]).length>(header.match(/,/g)||[]).length?';':',';
 const keys=parseLine(header,delim);
 return {keys,delim,lines};
}
function nval(value){
 if(value===null||value===undefined)return null;
 const str=String(value).trim().replace(/\s/g,'');
 if(!str||/^(NA|ND|NR|N/A|null|nan|\.)$/i.test(str))return null;
 const n=Number(str.replace(',','.'));
 return Number.isFinite(n)?n:null;
}
function rowFor(csv,code){
 const {keys,delim,lines}=parseRecords(csv);
 const kn=keys.map(norm);
 const index=kn.findIndex(k=>['insee','inseec','codeinsee','codinsee','codecommune','comcode','codgeo','inseecom','codcom'].includes(k));
 if(index<0)return {row:null,keys,issue:'Colonne du code INSEE non identifiée'};
 for(const line of lines.slice(1)){
  const parts=parseLine(line,delim);
  const v=String(parts[index]||'').trim().replace(/^"/,'').replace(/"$/,'');
  if(v===code){
   const row={};keys.forEach((k,i)=>row[k]=parts[i]||null);
   return {row,keys,issue:null};
  }
 }
 return {row:null,keys,issue:'Aucune ligne pour le code INSEE dans ce fichier'};
}
function colValue(row,patterns){
 const keys=Object.keys(row||{});
 for(const regex of patterns){
  const key=keys.find(k=>regex.test(norm(k)));
  if(key)return {key,value:row[key]};
 }
 return {key:null,value:null};
}
function interpret(row,year,kind){
 const val=colValue(row,[
 /^loypredm2$/, /^loypredm2[0-9]{4}$/, /^loyerpredm2$/,
 /^loyerestimee?m2$/, /^loyerm2$/, /^loyerparmetrecarre$/,
 /^loypred/, /^loyer.*m2$/, /^medianloyer/
 ]);
 const n=nval(val.value);
 const geo=colValue(row,[/^niveaugeo$/, /^nivgeo$/, /^niveauprediction$/, /^niveaugeographique$/, /^echgeo$/]);
 const obs=colValue(row,[/^nbobs$/, /^nobs$/, /^nombreannonces$/, /^nbannonces$/, /^nombreobservations$/, /^nbann/]);
 const r2=colValue(row,[/^r2adj$/, /^r2$/, /^r2ajuste$/]);
 const lo=colValue(row,[/^loypredm2min$/, /^loybasse$/, /^low$/, /^ipbas/, /^borneinf/]);
 const hi=colValue(row,[/^loypredm2max$/, /^loyhaute$/, /^high$/, /^iphaut/, /^bornesup/]);
 const level=String(geo.value||'').trim();
 return {
  type:kind,annee:year,loyer:n!==null&&n>0&&n<150?n:null,unite:'€/m²/mois',
  source,producteur:'Ministère de la Transition écologique',estimation:'ANIL',
  niveau_prediction:level||null,observations:nval(obs.value),r2:nval(r2.value),
  borne_basse:nval(lo.value),borne_haute:nval(hi.value),
  indicateur_colonne:val.key||null,
  comparaison_autorisee:/^(commune|communale|com)$/i.test(level)?true:null,
  fiabilite:nval(obs.value)!==null&&nval(obs.value)<30?'Nombre d’annonces inférieur à 30':nval(r2.value)!==null&&nval(r2.value)<.5?'R² inférieur à 0,5':null
 };
}
async function one(code,y,kind){
 const files=await manifest(y);
 const res=files[kind];
 if(!res)return {type:kind,annee:y,loyer:null,erreur:'Fichier de typologie non identifié dans le jeu officiel '+y};
 const u=res.url;
 if(!u)return {type:kind,annee:y,loyer:null,erreur:'URL source absente'};
 const content=await cached('rentfile:'+res.id,()=>get(u,22000),86400000);
 const hit=rowFor(content,code);
 if(!hit.row)return {type:kind,annee:y,loyer:null,erreur:hit.issue,colonne_disponibles:hit.keys.slice(0,40)};
 const i=interpret(hit.row,y,kind);
 if(i.loyer===null)i.erreur='Colonne de loyer reconnue indisponible ou valeur hors domaine';
 return i;
}
async function rent({code,historique=false}){
 if(!/^(?:[0-9]{5}|2[AB][0-9]{3})$/i.test(code||''))throw Error('Code INSEE invalide');
 const periods=historique?years:[2025];
 const entries=periods.flatMap(y=>types.map(t=>[y,t.id]));
 const results=await Promise.all(entries.map(async([y,t])=>{
  try{return await one(code,y,t)}catch(e){return {type:t,annee:y,loyer:null,erreur:e.message}}
 }));
 const charts=types.map(t=>{
  const rows=results.filter(x=>x.type===t.id).sort((a,b)=>a.annee-b.annee);
  const comparable=rows.filter(x=>x.loyer!==null).every(x=>x.comparaison_autorisee===true);
  const last=rows.find(x=>x.annee===2025);
  return {...t,serie:rows,dernier:last?.loyer??null,
   historique_comparable:comparable&&rows.filter(x=>x.loyer!==null).length>=2,
   note:!comparable?'Comparaison interannuelle déconseillée : niveau communal non prouvé pour chaque millésime.':null};
 });
 return {code_insee:code,source,reference:'Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin',
  couverture:'France hors Mayotte, données de loyers d’annonces non meublées charges comprises',
  millesime_courant:2025,types:charts,
  avertissement:'Le loyer est une estimation pour un bien type, pas celui du bien recherché. Les chiffres 2022-2025 ne sont comparables que si la prédiction est communale à chaque millésime.',
  date_recherche:new Date().toISOString()};
}
module.exports={rent,parseRecords,rowFor,interpret,category};
