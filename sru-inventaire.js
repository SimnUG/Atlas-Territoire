'use strict';
/**
 * Inventaire national de l'article 55 de la loi SRU.
 * Producteur : DGALN/DHUP (ministère du Logement), Licence Ouverte 2.0.
 * Publication 11 août 2026, situation des logements au 1er janvier 2025.
 * Un code INSEE est toujours utilisé, jamais une recherche par nom approximatif.
 */
const SOURCE='https://www.data.gouv.fr/datasets/communes-et-inventaire-sru/';
const CSV='https://static.data.gouv.fr/resources/communes-et-inventaire-sru/20260811-123753/donnees-sru-data-gouv-2026.csv';
const MIRROR='https://www.data.gouv.fr/api/1/datasets/r/2773f8ca-e06b-4a67-9844-ac165d52f47c';
const CACHE_MS=24*3600*1000;
let cache=null, inFlight=null;

const clean=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

function csvRecords(text,separator=';'){
 const rows=[];let row=[],cell='',quoted=false;
 text=String(text||'').replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(ch==='"'){
   if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted;
  }else if(ch===separator&&!quoted){row.push(cell.trim());cell=''}
  else if((ch==='\n'||ch==='\r')&&!quoted){
   if(ch==='\r'&&text[i+1]==='\n')i++;
   row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell='';
  }else cell+=ch;
 }
 row.push(cell.trim());if(row.some(Boolean))rows.push(row);
 return rows;
}
function number(s){
 if(typeof s==='number')return Number.isFinite(s)?s:null;
 if(s===null||s===undefined)return null;
 const v=String(s).replace(/[\u00a0\u202f\s€%]/g,'').replace(/,/g,'.');
 if(!v||/^(?:nc|nd|na|nr|n d|-|sans objet|non renseigne)$/i.test(v))return null;
 return /^-?\d+(?:\.\d+)?$/.test(v)?Number(v):null;
}
function locate(headers,conditions){
 for(const test of conditions){
  const found=headers.findIndex(h=>test(clean(h)));
  if(found>=0)return found;
 }
 return -1;
}
function indexFields(headers){
 return {
  code:locate(headers,[
   h=>/code/.test(h)&&(/insee|commune|commun|geo/.test(h)),
   h=>/^(?:codcom|insee|codgeo|code)$/.test(h),
   h=>/^(?:com|codgeo 2026)$/.test(h)
  ]),
  commune:locate(headers,[
   h=>/^(?:commune|nom commune|nom de la commune|libelle commune|libelle de la commune)$/.test(h),
   h=>/nom/.test(h)&&/commune/.test(h),
   h=>/commune/.test(h)&&!/code|situation|statut/.test(h)
  ]),
  taux:locate(headers,[
   h=>/taux/.test(h)&&/sru/.test(h)&&!/cible|objectif|legal|oblig|rattrap|reference/.test(h),
   h=>/taux/.test(h)&&/(?:logements? sociaux?|lls|logements? locatifs? sociaux?)/.test(h)&&!/cible|objectif|legal|oblig|rattrap|reference/.test(h),
   h=>/^(?:taux|taux lls|taux 2025|taux inventaire)$/.test(h)
  ]),
  objectif:locate(headers,[
   h=>/taux/.test(h)&&/(?:cible|legal|objectif|obligation|applicable|a atteindre)/.test(h),
   h=>/^(?:objectif 20 25|objectif en pourcentage)$/.test(h)
  ]),
  // Colonne officielle : « Prélèvement net 2026 (dont majoration) ».
  // Préférer impérativement le montant net MAJORATION COMPRISE.
  prelevement:locate(headers,[
   h=>/prelevement/.test(h)&&/net/.test(h)&&/majoration/.test(h),
   h=>/prelevement/.test(h)&&/net/.test(h)&&!/hors majoration/.test(h),
   h=>/montant/.test(h)&&/prelevement/.test(h)&&/net/.test(h)&&!/brut/.test(h)
  ]),
  situation:locate(headers,[
   h=>/^(?:situation de la commune|situation commune|statut commune|statut sru|situation sru)$/.test(h),
   h=>/commune/.test(h)&&/(?:deficitaire|carencee|situation sru)/.test(h)
  ]),
  deficit:locate(headers,[
   h=>/deficitaire/.test(h)&&!/nombre/.test(h)
  ]),
  exemption:locate(headers,[
   h=>/exemptee|exemption/.test(h)
  ]),
  carence:locate(headers,[
   h=>/carencee|carence/.test(h)&&!/majoration|prelevement|taux/.test(h)
  ])
 };
}
function readTable(csv){
 const lines=String(csv||'').replace(/^\uFEFF/,'').split(/\r?\n/).slice(0,20);
 const semi=lines.map(l=>(l.match(/;/g)||[]).length).reduce((a,b)=>a+b,0);
 const comma=lines.map(l=>(l.match(/,/g)||[]).length).reduce((a,b)=>a+b,0);
 const delimiter=semi>=comma?';':',';
 const rows=csvRecords(csv,delimiter);
 const headerRow=rows.findIndex((r,i)=>i<20&&r.length>=6&&r.some(x=>/(?:insee|code.*commune|codcom|codgeo)/.test(clean(x))));
 const first=headerRow>=0?headerRow:0;
 const headers=rows[first]||[];
 const index=indexFields(headers);
 if(index.code<0)throw Error('Colonne du code INSEE absente de l’inventaire SRU');
 // Ne jamais présenter un prélèvement brut comme un prélèvement net.
 if(index.prelevement<0)throw Error('Colonne « Prélèvement net (dont majoration) » introuvable dans le CSV officiel');
 const titrePrelevement=headers[index.prelevement];
 const anneePrelevement=/\b20\d{2}\b/.exec(titrePrelevement)?.[0]||null;
 return {headers,index,anneePrelevement,rows:rows.slice(first+1)};
}
function select(row,idx){return idx>=0?String(row[idx]??'').trim():''}
function extractRecord(table,code){
 const {index,rows}=table;
 const row=rows.find(r=>select(r,index.code).replace(/\.0$/,'').padStart(5,'0')===code);
 if(!row)return null;
 const taux=number(select(row,index.taux));
 const objectif=number(select(row,index.objectif));
 const rawStatus=select(row,index.situation);
 const rawDeficit=select(row,index.deficit);
 const rawExemption=select(row,index.exemption);
 const rawCarence=select(row,index.carence);
 const normStatus=clean(rawStatus);
 const exempt=/(?:oui|exemptee|exemption|exempte)/.test(clean(rawExemption))||/exempte/.test(normStatus);
 const deficient=/(?:oui|deficitaire)/.test(clean(rawDeficit))||/deficitaire/.test(normStatus);
 const conform=/(?:non deficitaire|conforme|atteint)/.test(normStatus);
 let situation=rawStatus||null;
 if(!situation&&exempt)situation='Commune exemptée';
 if(!situation&&deficient)situation='Commune déficitaire';
 if(!situation&&conform)situation='Commune au taux cible';
 // Si le statut explicite manque, un taux inférieur au taux cible signifie un déficit.
 if(!situation&&taux!==null&&objectif!==null)
   situation=taux<objectif?'Commune déficitaire':'Taux cible atteint';
 return {
  statut:'disponible',code_insee:code,commune:select(row,index.commune)||null,
  taux_sru:taux, taux_cible:objectif,
  prelevement_net:number(select(row,index.prelevement)),
  prelevement_annee:table.anneePrelevement,
  prelevement_avec_majoration:/majoration/.test(clean(table.headers[index.prelevement])) ,
  situation, exemptee:exempt, carencee:/(?:oui|carencee)/.test(clean(rawCarence))||/carencee/.test(normStatus),
  bilan:'2025-01-01',annee_publication:2026,
  source:{nom:'Inventaire SRU — DGALN/DHUP, ministère du Logement',url:SOURCE,
   fichier:CSV,licence:'Licence Ouverte 2.0',publie:'2026-08-11'}
 };
}
async function download(){
 let error;
 for(const url of [CSV,MIRROR]){
  try{
   const r=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{Accept:'text/csv,text/plain;q=0.9,*/*;q=0.1'}});
   if(!r.ok)throw Error('HTTP '+r.status);
   // Fichiers CSV officiels : parfois ISO-8859-1/Windows-1252 (accents).
   // Une lecture UTF-8 forcée remplace « Prélèvement » par des caractères invalides.
   const buffer=await r.arrayBuffer();
   if(buffer.byteLength<30000||buffer.byteLength>2000000)throw Error('Taille du fichier SRU inattendue');
   let text;
   try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer)}
   catch(_){text=new TextDecoder('windows-1252').decode(buffer)}
   const table=readTable(text);
   if(table.rows.length<1500)throw Error('Inventaire SRU incomplet');
   return table;
  }catch(e){error=e}
 }
 throw Error('Téléchargement de l’inventaire SRU indisponible : '+(error?.message||'inconnu'));
}
async function inventaire(code){
 if(!/^\d{5}$/.test(code))throw Error('Code INSEE invalide');
 if(!cache||Date.now()-cache.time>CACHE_MS){
  if(!inFlight)inFlight=download().then(table=>{cache={table,time:Date.now()};return table}).finally(()=>{inFlight=null});
  await inFlight;
 }
 const r=extractRecord(cache.table,code);
 return r||{statut:'hors_perimetre',code_insee:code,taux_sru:null,taux_cible:null,
  prelevement_net:null,situation:null,bilan:'2025-01-01',annee_publication:2026,
  message:'Cette commune ne figure pas dans le périmètre de l’inventaire SRU publié pour 2026.',
  source:{nom:'Inventaire SRU — DGALN/DHUP, ministère du Logement',url:SOURCE,licence:'Licence Ouverte 2.0'}};
}
module.exports={inventaire,readTable,extractRecord,number,indexFields,CSV,SOURCE};
