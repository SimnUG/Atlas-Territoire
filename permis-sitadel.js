'use strict';
/*
 * Liste détaillée des autorisations d'urbanisme créant des logements.
 * Source : SDES, Sitadel, DiDo (actualisation mensuelle).
 * Filtre par code INSEE COMM et type PC uniquement; DP, PA, PD exclus.
 * La carte géocode uniquement les adresses BAN avec correspondance communale vérifiée.
 */
const RID='8b35affb-55fc-4c1f-915b-7750f974446a';
const API='https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1/datafiles/'+RID+'/rows';
const SOURCE='https://www.data.gouv.fr/datasets/liste-des-permis-de-construire-et-autres-autorisations-durbanisme';
const FIELD='COMM';
const cache=new Map(), geoCache=new Map();
const now=()=>Date.now();
const valid=c=>/^(44|85)\d{3}$/.test(String(c||''));
function val(row,key) {
 if(!row||typeof row!=='object')return null;
 const wanted=key.toLowerCase(),k=Object.keys(row).find(k=>k.toLowerCase()===wanted);
 return k===undefined?null:row[k];
}
function first(row,...keys){for(const k of keys){const v=val(row,k);if(v!==null&&v!==undefined&&String(v).trim()!=='')return v}return null}
function n(v) {
 if(v===null||v===undefined||v==='')return null;
 const v2=Number(String(v).replace(/[\s\u00a0\u202f]/g,'').replace(',','.'));
 return Number.isFinite(v2)?v2:null;
}
function date(v){
 if(!v)return null;
 const x=String(v).trim();
 let m=/^(\d{4})-(\d{2})-(\d{2})/.exec(x);
 if(!m&&/^\d{8}$/.test(x))m=[null,x.slice(0,4),x.slice(4,6),x.slice(6,8)];
 if(!m)return null;
 const d=new Date(m[1]+'-'+m[2]+'-'+m[3]+'T12:00:00Z');
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===m[1]+'-'+m[2]+'-'+m[3]?d.toISOString().slice(0,10):null;
}
function normalize(row,code){
 if(String(first(row,'COMM')||'').trim().padStart(5,'0')!==code)return null;
 if(String(first(row,'TYPE_DAU')||'').trim().toUpperCase()!=='PC')return null;
 const etat=String(first(row,'ETAT_DAU')||'');
 if(etat==='4')return null; // annulé
 const total=n(first(row,'NB_LGT_TOT_CREES'));
 const dateAut=date(first(row,'DATE_REELLE_AUTORISATION'));
 if(total===null||total<=0||!dateAut)return null;
 const id=String(first(row,'NUM_DAU')||'').trim();
 if(!id)return null;
 const ind=n(first(row,'NB_LGT_IND_CREES')),col=n(first(row,'NB_LGT_COL_CREES'));
 const typ=(ind!==null&&col!==null)?(ind>0&&col>0?'mixte':col>0?'appartements':'maisons'):(col!==null&&col>0?'appartements':ind!==null&&ind>0?'maisons':'inconnu');
 const doc=date(first(row,'DATE_REELLE_DOC')),daact=date(first(row,'DATE_REELLE_DAACT'));
 const status=etat==='6'||daact?'Terminé':etat==='5'||doc?'Commencé':'Autorisé';
 const name=String(first(row,'DENOM_DEM')||'').trim();
 const num=String(first(row,'ADR_NUM_TER')||'').trim();
 const road=String([first(row,'ADR_TYPEVOIE_TER'),first(row,'ADR_LIBVOIE_TER')].filter(Boolean).join(' ')).trim();
 const lieu=String(first(row,'ADR_LIEUDIT_TER')||'').trim();
 const local=String(first(row,'ADR_LOCALITE_TER')||'').trim();
 const addr=([num,road].filter(Boolean).join(' ')||lieu||local).trim();
 const pcs=['NB_LGT_1P','NB_LGT_2P','NB_LGT_3P','NB_LGT_4P','NB_LGT_5P','NB_LGT_6P_PLUS'].map(key=>n(first(row,key)));
 const cad=[1,2,3].map(i=>[first(row,'SEC_CADASTRE'+i),first(row,'NUM_CADASTRE'+i)].filter(Boolean).join(' ')).filter(Boolean);
 return {
  id,code_insee:code,annee:Number(dateAut.slice(0,4)),date_autorisation:dateAut,
  date_doc:doc,date_daact:daact,status,nombre:total,
  ind:ind??null,col:col??null,typologie:typ,pieces:pcs,
  demandeur:/^(secret|non communicable|anonyme)$/i.test(name)?null:name||null,
  adresse:addr||null,code_postal:String(first(row,'ADR_CODPOST_TER')||'').trim()||null,
  parcelles:cad,surface_terrain:n(first(row,'SUPERFICIE_TERRAIN')),
  source:'Sitadel — SDES'
 };
}
function extractArray(json){
 if(Array.isArray(json))return json;
 for(const k of ['data','rows','results','items','records']){
  if(Array.isArray(json?.[k]))return json[k];
  if(Array.isArray(json?.data?.[k]))return json.data[k];
 }
 return null;
}
async function retrieve(code){
 const items=[], seen=new Set();
 const pageSize=1000,MAXPAGES=300;
 let pages=0,seenPages=new Set(),rawRows=0;
 for(let page=1;page<=MAXPAGES;page++){
  const u=new URL(API);
  u.searchParams.set(FIELD,'eq:'+code);
  u.searchParams.set('TYPE_DAU','eq:PC');
  u.searchParams.set('page',String(page));
  u.searchParams.set('pageSize',String(pageSize));
  const resp=await fetch(u,{signal:AbortSignal.timeout(22000),headers:{Accept:'application/json'}});
  if(!resp.ok)throw Error('DiDo SDES : HTTP '+resp.status);
  const result=await resp.json(),rows=extractArray(result);
  if(!rows)throw Error('Réponse DiDo non reconnue');
  pages=page;
  if(rows.length===0)break;
  rawRows+=rows.length;
  const signature=JSON.stringify([rows.length,first(rows[0],'NUM_DAU'),first(rows.at(-1),'NUM_DAU')]);
  if(seenPages.has(signature))throw Error('La pagination DiDo renvoie une page en double : inventaire incomplet');
  seenPages.add(signature);
  if(!rows.some(r=>String(first(r,'COMM')||'').trim().padStart(5,'0')===code))
   throw Error('La requête DiDo n’a pas filtré les permis par code INSEE : résultats rejetés');
  for(const row of rows){
   const obj=normalize(row,code);
   if(obj&&!seen.has(obj.id)){seen.add(obj.id);items.push(obj)}
  }
  // Pages limitées côté serveur : avancer jusqu'à la dernière page ou au total confirmé.
  const total=n(result?.total??result?.pagination?.total??result?.meta?.total??result?.meta?.pagination?.total);
  const pageCount=n(result?.totalPages??result?.pagination?.totalPages??result?.meta?.total_pages);
  if(total!==null&&rawRows>=total)break;
  if(pageCount!==null&&page>=pageCount)break;
  if(page===MAXPAGES)throw Error('Pagination des dossiers Sitadel incomplète');
 }
 items.sort((a,b)=>b.date_autorisation.localeCompare(a.date_autorisation)||a.id.localeCompare(b.id));
 return {statut:'disponible',code_insee:code,dossiers:items,
  tous_dossiers:true,pages_consultees:pages,lignes_source:rawRows,
  source:{nom:'Sitadel — SDES, Ministère de la Transition écologique',
   url:SOURCE,api:API,date_recue:new Date().toISOString().slice(0,10),
   licence:'Licence Ouverte 2.0',note:'Données administratives de PC, non équivalentes aux estimations corrigées DR++'}};
}
async function permits(code){
 if(!valid(code))throw Object.assign(Error('Commune hors des départements 44 et 85'),{status:400});
 const existing=cache.get(code);
 if(existing&&existing.until>now())return existing.result;
 const inFlight=existing?.promise;
 if(inFlight)return inFlight;
 const promise=retrieve(code);
 cache.set(code,{promise,until:now()+2*3600000});
 try{
  const result=await promise;
  cache.set(code,{result,until:now()+24*3600000});
  if(cache.size>35)cache.delete(cache.keys().next().value);
  return result;
 }catch(e){cache.delete(code);throw e}
}
async function oneGeo(item,code,city){
 if(!item.adresse||item.adresse.length<6)return null;
 const key=code+'/'+item.id,existing=geoCache.get(key);
 if(existing&&existing.until>now())return existing.point;
 const postcode=item.code_postal||'';
 const query=[item.adresse,postcode,city].filter(Boolean).join(' ');
 const url=new URL('https://data.geopf.fr/geocodage/search');
 url.searchParams.set('q',query);
 url.searchParams.set('limit','3');
 try{
  const resp=await fetch(url,{signal:AbortSignal.timeout(6500),headers:{Accept:'application/json'}});
  if(!resp.ok)return null;
  const json=await resp.json();
  const candidate=(json.features||[]).find(f=>{
   const p=f.properties||{},geoCode=String(p.citycode||p.cityCode||'');
   return geoCode===code&&Number(p.score)>=0.73&&
     Array.isArray(f.geometry?.coordinates)&&Number.isFinite(f.geometry.coordinates[0]);
  });
  const point=candidate?{id:item.id,lon:candidate.geometry.coordinates[0],lat:candidate.geometry.coordinates[1],
    precision:candidate.properties?.type||'adresse',score:candidate.properties?.score}:null;
  geoCache.set(key,{point,until:now()+7*24*3600000});
  if(geoCache.size>3000)geoCache.delete(geoCache.keys().next().value);
  return point;
 }catch(_){return null}
}
async function geocodes(code,ids,city){
 const data=await permits(code);
 const byId=new Set(ids.filter(v=>typeof v==='string'&&v.length<60).slice(0,120));
 const list=data.dossiers.filter(x=>byId.has(x.id)&&x.adresse).slice(0,120);
 const points=[];
 // Quatre requêtes parallèles évitent de surcharger le géocodeur public.
 for(let k=0;k<list.length;k+=4){
  const result=await Promise.all(list.slice(k,k+4).map(r=>oneGeo(r,code,city)));
  for(const p of result)if(p)points.push(p);
 }
 return {statut:'disponible',code_insee:code,points,non_geocodes:byId.size-points.length,
  source:{nom:'Géoplateforme — Base Adresse Nationale',url:'https://data.geopf.fr/geocodage/search'},
  note:'Seules les adresses avec code INSEE concordant et score de rapprochement suffisant sont placées.'};
}
module.exports={permits,geocodes,normalize,extractArray,n,date,valid,RID,API,SOURCE};
