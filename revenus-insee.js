'use strict';
/*
 * FiLoSoFi 2021 : fichier officiel INSEE de structure et de distribution
 * des revenus disponibles des ménages fiscaux, à l'échelle communale.
 * Lien public INSEE : https://www.insee.fr/fr/statistiques/7756855
 *
 * Important : les déciles sont des NIVEAUX DE VIE PAR UC, pas des revenus
 * disponibles de ménages réels. Nous appliquons les coefficients d'UC
 * conventionnels de la maquette demandée pour produire une simulation
 * affichée comme telle. Pour 5 personnes ou plus et pour les ménages
 * dont la principale ressource est une pension, le coefficient est
 * indicatif et ne décrit pas la composition effective de leur foyer.
 *
 * Les valeurs censurées (« s »), absentes ou invalides sont toujours null.
 */
const {zipEntries}=require('./salaires-insee');
const SOURCE=Object.freeze({
 nom:'INSEE — FiLoSoFi 2021, structure et distribution des revenus disponibles',
 url:'https://www.insee.fr/fr/statistiques/7756855',
 millesime:2021,
 geographicVintage:'Communes en géographie au 1er janvier 2022',
 licence:'Licence Ouverte 2.0',
 warning:'Références par profil exprimées en niveau de vie par UC. Les conversions ménage utilisent des coefficients indicatifs et ne sont pas un revenu réellement observé pour une composition familiale précise.'
});
const ZIP_URL='https://www.insee.fr/fr/statistiques/fichier/7756855/indic-struct-distrib-revenu-2021-COMMUNES_csv.zip';
const FILE_NAME='FILO2021_DISP_COM.csv';
const GROUPS=Object.freeze([
 {key:'p1',prefix:'TME1',uc:1,description:'Ménage d’une personne'},
 {key:'p2',prefix:'TME2',uc:1.5,description:'Ménage de deux personnes — 1,5 UC'},
 {key:'p3',prefix:'TME3',uc:1.8,description:'Ménage de trois personnes — 1,8 UC'},
 {key:'p4',prefix:'TME4',uc:2.1,description:'Ménage de quatre personnes — 2,1 UC'},
 {key:'p5',prefix:'TME5',uc:2.4,description:'Ménage de cinq personnes ou plus — 2,4 UC indicative'},
 {key:'couples',prefix:'TYM3',uc:1.5,description:'Couples sans enfant — 1,5 UC indicative'},
 {key:'retraites',prefix:'OPR4',uc:1.5,description:'Ménages dont les pensions constituent la principale source de revenus — 1,5 UC indicative'}
]);
const DECILES=Object.freeze({
 D3:'D321',D4:'D421','Médiane':'Q221',D6:'D621',
 D7:'D721',D8:'D821',D9:'D921'
});
const PARTS=Object.freeze({
 activite:'PACT21',pensions:'PPEN21',patrimoine:'PPAT21',
 prestations:'PPSOC21',impots:'PIMPOT21',
 salaires:'PTSA21',chomage:'PCHO21',nonSalaries:'PBEN21',
 familles:'PPFAM21',minima:'PPMINI21',logement:'PPLOGT21'
});
const CACHE=new Map();
let ARCHIVE=null,ARCHIVE_PENDING=null,ARCHIVE_UNTIL=0;
const SIX_HOURS=6*3600*1000;
function number(value){
 if(typeof value==='number'&&Number.isFinite(value))return value;
 if(typeof value!=='string')return null;
 const src=value.trim().replace(/\u00a0/g,'').replace(/\s+/g,'').replace(',','.');
 if(!src||/^(?:s|nd|n\.d\.|na|nan|x|\.|-)$/i.test(src))return null;
 if(!/^-?\d+(?:\.\d+)?$/.test(src))return null;
 const n=Number(src);
 return Number.isFinite(n)?n:null;
}
function csvRecord(csv,code){
 if(!/^(?:\d{5}|2[AB]\d{3})$/i.test(code))throw Error('Code INSEE non valide');
 // Chercher une ligne exacte sans créer un tableau de 35 000 objets JS.
 const sep=csv.indexOf('\n');
 if(sep<0)throw Error('En-tête FiLoSoFi absent');
 const header=csv.slice(0,sep).replace(/^\uFEFF/,'').replace(/\r$/,'').split(';');
 if(header[0]!=='CODGEO'||!header.includes('Q221')||!header.includes('TME2Q221'))
  throw Error('Colonnes INSEE FiLoSoFi non conformes');
 const pattern='\n'+code+';';
 let index=csv.indexOf(pattern,sep);
 if(index<0)return null;
 index+=1;
 const end=csv.indexOf('\n',index);
 const line=csv.slice(index,end<0?undefined:end).replace(/\r$/,'').split(';');
 const result={};
 for(let i=0;i<header.length;i++){
  // Ne conserver que les observations utiles à l'interface.
  const key=header[i];
  if(key==='NBMEN21'||key==='Q221'||Object.values(DECILES).some(d=>key.endsWith(d))
    ||Object.values(PARTS).some(k=>key.endsWith(k))){
   const v=number(line[i]);
   result[key]=v;
  }
 }
 return result;
}
function parseCsvBuffer(buf,code){
 return csvRecord(Buffer.isBuffer(buf)?buf.toString('utf8'):String(buf),code);
}
async function archive(){
 const now=Date.now();
 if(ARCHIVE&&ARCHIVE_UNTIL>now)return ARCHIVE;
 if(ARCHIVE_PENDING)return ARCHIVE_PENDING;
 ARCHIVE_PENDING=(async()=>{
  const res=await fetch(ZIP_URL,{signal:AbortSignal.timeout(35000),
   headers:{Accept:'application/zip','User-Agent':'AtlasTerritoires-INSEE/2.0'}});
  if(!res.ok)throw Error('FiLoSoFi INSEE HTTP '+res.status);
  const len=Number(res.headers.get('content-length')||0);
  if(len>23000000)throw Error('Archive FiLoSoFi trop volumineuse');
  const compressed=Buffer.from(await res.arrayBuffer());
  if(compressed.length>23000000)throw Error('Archive FiLoSoFi trop volumineuse');
  const files=zipEntries(compressed),file=files.get(FILE_NAME);
  if(!file)throw Error('Fichier FiLoSoFi communal introuvable');
  ARCHIVE=file;ARCHIVE_UNTIL=Date.now()+SIX_HOURS;
  return file;
 })();
 try{return await ARCHIVE_PENDING}
 finally{ARCHIVE_PENDING=null}
}
function composition(raw,prefix=''){
 const values={};
 for(const [key,col] of Object.entries(PARTS))values[key]=number(raw?.[prefix+col]);
 return values;
}
function profileFromRow(raw,g){
 const deciles={};
 for(const [key,col] of Object.entries(DECILES)){
  const annualUC=number(raw?.[g.prefix+col]);
  deciles[key]={
   sourceAnnualPerUC:annualUC,
   monthly:annualUC!==null?Math.round(annualUC*g.uc/12):null
  };
 }
 return {
  uc:g.uc,description:g.description,households:null,marketDepth:null,
  deciles,composition:composition(raw,g.prefix),
  source:SOURCE
 };
}
function resultFromRow(raw,code){
 const profiles={};
 for(const g of GROUPS)profiles[g.key]=profileFromRow(raw,g);
 const annual=number(raw?.Q221);
 return {
  source:SOURCE,code_insee:code,profiles,
  median:{
   annual,monthly:annual!==null?Math.round(annual/12):null,
   meaning:'Niveau de vie médian des ménages, par unité de consommation'
  },
  composition:composition(raw),
  assumptions:{durationYears:25,annualRateWithInsurance:0.035,
   maximumDebtRatio:0.33,deposit:0,UCmethod:'Coefficients indicatifs 1 / 1,5 / 1,8 / 2,1 / 2,4'},
  generatedAt:new Date().toISOString()
 };
}
async function revenues({commune}){
 if(!/^(?:\d{5}|2[AB]\d{3})$/i.test(commune||''))throw Error('Code commune invalide');
 const existing=CACHE.get(commune);
 if(existing&&existing.until>Date.now())return existing.value;
 const zip=await archive();
 const raw=parseCsvBuffer(zip.read(),commune);
 const result=resultFromRow(raw,commune);
 CACHE.set(commune,{value:result,until:Date.now()+SIX_HOURS});
 if(CACHE.size>200)CACHE.delete(CACHE.keys().next().value);
 return result;
}
module.exports={revenues,number,csvRecord,parseCsvBuffer,composition,
 profileFromRow,resultFromRow,DECILES,GROUPS,PARTS,SOURCE};
