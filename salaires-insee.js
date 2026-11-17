'use strict';
/*
 * INSEE — Bases Tous salariés 2022 / DADS 2016.
 * Fichiers historiques officiels, au lieu de résidence ; les valeurs
 * INSEE sont des salaires NETS HORAIRES moyens, converties en estimation
 * mensuelle avec 151,67 heures. Ne pas confondre avec l'indicateur EQTP
 * au lieu de travail diffusé à partir de 2023.
 *
 * Source https://www.insee.fr/fr/statistiques/8629963
 * Les codes géographiques sont respectivement ceux des millésimes 2024
 * (2022) et 2019 (2016). Les écarts ou cas non publiés restent null.
 */
const zlib=require('node:zlib');
const URLS=Object.freeze({
  current:'https://www.insee.fr/fr/statistiques/fichier/8629963/base-cc-bases-tous-salaries-2022_csv.zip',
  prior:'https://www.insee.fr/fr/statistiques/fichier/8629963/base-cc-dads-2016-geo-2019.zip'
});
const SOURCE={nom:'INSEE — Base Tous salariés 2022 ; DADS 2016 (fichier salariés au lieu de résidence)',
  url:'https://www.insee.fr/fr/statistiques/8629963',
  millesime:2022,annee_comparaison:2016,
  conversion:'Salaire net horaire moyen × 151,67 heures/mois ; conversion conventionnelle',
  note:'Les salaires communaux et intercommunaux sont indicatifs et soumis au secret statistique. Géographies 2024/2019.'};
const MONTH_HOURS=151.67;
const GROUPS={moyen:['SNHM'],csp:['SNHMC','SNHMP','SNHME','SNHMO'],
 age:['SNHM18','SNHM26','SNHM50']};
const KINDS=Object.freeze({commune:'COM',epci:'EPCI',departement:'DEP'});
const CACHE=new Map(),IN_PROGRESS=new Map();
const CACHE_DURATION=12*3600*1000;
function finite(v){
 if(typeof v==='number'&&Number.isFinite(v)&&v>0)return v;
 if(typeof v==='string'&&v.trim()!==''&&Number.isFinite(Number(v))&&Number(v)>0)return Number(v);
 return null;
}
function zipEntries(bytes){
 const b=Buffer.from(bytes),limit=b.length;
 let eocd=-1;
 for(let i=limit-22;i>=Math.max(0,limit-65557);i--){
  if(b.readUInt32LE(i)===0x06054b50){eocd=i;break}
 }
 if(eocd<0)throw Error('Archive INSEE non reconnue');
 const base=b.readUInt32LE(eocd+16),count=b.readUInt16LE(eocd+10),entry=new Map();
 let cursor=base;
 if(count>120)throw Error('Archive INSEE trop complexe');
 for(let i=0;i<count;i++){
  if(cursor+46>limit||b.readUInt32LE(cursor)!==0x02014b50)throw Error('ZIP INSEE index invalide');
  const method=b.readUInt16LE(cursor+10),deflateSize=b.readUInt32LE(cursor+20),
    rawSize=b.readUInt32LE(cursor+24),nameLength=b.readUInt16LE(cursor+28),
    extraLength=b.readUInt16LE(cursor+30),commentLength=b.readUInt16LE(cursor+32),
    localOffset=b.readUInt32LE(cursor+42);
  const name=b.subarray(cursor+46,cursor+46+nameLength).toString('utf8');
  if(localOffset+30>limit||b.readUInt32LE(localOffset)!==0x04034b50)throw Error('ZIP local header invalide');
  const body=localOffset+30+b.readUInt16LE(localOffset+26)+b.readUInt16LE(localOffset+28);
  if(deflateSize>limit||body+deflateSize>limit||rawSize>85000000)throw Error('Taille ZIP INSEE refusée');
  if(![0,8].includes(method))throw Error('Compression ZIP non reconnue');
  entry.set(name,{name,size:rawSize,read:()=>{
    const data=b.subarray(body,body+deflateSize);
    const out=method===8?zlib.inflateRawSync(data):Buffer.from(data);
    if(out.length!==rawSize)throw Error('Décompression ZIP incomplète');
    return out;
  }});
  cursor+=46+nameLength+extraLength+commentLength;
 }
 return entry;
}
async function download(which){
 const url=URLS[which];
 if(!url)throw Error('Source non autorisée');
 const response=await fetch(url,{signal:AbortSignal.timeout(26000),
  headers:{Accept:'application/zip','User-Agent':'AtlasTerritoires-INSEE/2.0'}});
 if(!response.ok)throw Error('INSEE HTTP '+response.status+' '+which);
 const header=Number(response.headers.get('content-length'));
 if(header>13000000)throw Error('Archive trop grande');
 const raw=Buffer.from(await response.arrayBuffer());
 if(raw.length>13000000)throw Error('Archive INSEE trop grande');
 return zipEntries(raw);
}
function csvRows(text){
 const rows=new Map();
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);
 const names=(lines.shift()||'').split(';').map(s=>s.trim());
 if(names[0]!=='CODGEO'||!names.includes('SNHM22'))throw Error('Colonnes INSEE 2022 non conformes');
 for(const line of lines){
  if(!line)continue;
  const items=line.split(';');
  if(items.length<names.length)continue;
  const geo=items[0].trim();
  if(!/^(?:\d{2,3}|2[AB]|\d{5}|2[AB]\d{3}|\d{9})$/i.test(geo))continue;
  if(rows.has(geo))throw Error('Doublon géographique INSEE 2022');
  const record={};
  for(const prefix of Object.values(GROUPS).flat()){
   const key=prefix+'22',at=names.indexOf(key);
   record[prefix]=at<0?null:finite(items[at]);
  }
  rows.set(geo,record);
 }
 return rows;
}
function xmlDecode(text){
 return String(text).replace(/&(?:amp|lt|gt|quot|apos|#x[0-9a-f]+|#[0-9]+);/gi,s=>{
  if(s==='&amp;')return '&';if(s==='&lt;')return '<';if(s==='&gt;')return '>';
  if(s==='&quot;')return '"';if(s==='&apos;')return "'";
  if(/^&#x/i.test(s))return String.fromCodePoint(parseInt(s.slice(3,-1),16));
  if(/^&#\d/.test(s))return String.fromCodePoint(parseInt(s.slice(2,-1),10));
  return s;
 });
}
function sharedStrings(xml){
 const result=[];
 for(const match of xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)){
  const strings=[...match[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)];
  result.push(strings.map(a=>xmlDecode(a[1])).join(''));
 }
 return result;
}
function xlsxRows(xml,strings){
 const rows=new Map(),prefixes=Object.values(GROUPS).flat();
 let headers=null;
 const rowPattern=/<row\b[^>]*>([\s\S]*?)<\/row>/g;
 for(const row of xml.matchAll(rowPattern)){
  const cells={};
  for(const cell of row[1].matchAll(/<c\b([^>]*?)>([\s\S]*?)<\/c>/g)){
   const at=cell[1].match(/\br="([A-Z]+)\d+"/)?.[1];
   if(!at)continue;
   const val=cell[2].match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/)?.[1];
   if(val===undefined)continue;
   const label=/\bt="s"/.test(cell[1])?strings[Number(val)]:xmlDecode(val);
   cells[at]=label;
  }
  if(cells.A==='CODGEO'){
   headers={};
   for(const [col,label] of Object.entries(cells))headers[String(label).trim()]=col;
   if(!headers.SNHM16)throw Error('Colonnes INSEE 2016 non conformes');
   continue;
  }
  if(!headers)continue;
  const geo=String(cells[headers.CODGEO]||'').trim();
  if(!/^(?:\d{2,3}|2[AB]|\d{5}|2[AB]\d{3}|\d{9})$/i.test(geo))continue;
  if(rows.has(geo))throw Error('Doublon géographique INSEE 2016');
  const item={};
  for(const prefix of prefixes){
   const key=prefix+'16',column=headers[key];
   item[prefix]=column?finite(cells[column]):null;
  }
  rows.set(geo,item);
 }
 if(!headers)throw Error('Aucune ligne d’en-tête INSEE 2016');
 return rows;
}
function workbookPaths(workbook,relationships){
 const relations=new Map();
 for(const match of relationships.matchAll(/<Relationship\b([^>]*)\/>/g)){
  const attrs=Object.fromEntries([...match[1].matchAll(/([\w:]+)="([^"]*)"/g)].map(x=>[x[1],x[2]]));
  if(attrs.Id&&attrs.Target)relations.set(attrs.Id,attrs.Target);
 }
 const byName=new Map();
 for(const match of workbook.matchAll(/<sheet\b([^>]*)\/>/g)){
  const attrs=Object.fromEntries([...match[1].matchAll(/([\w:]+)="([^"]*)"/g)].map(x=>[x[1],x[2]]));
  if(attrs.name&&attrs['r:id']){
   const target=relations.get(attrs['r:id']);
   if(target)byName.set(attrs.name,target.replace(/^\/?xl\//,'').replace(/^\/+/,'')); // e.g. worksheets/sheet1.xml
  }
 }
 return byName;
}
function parse2016(files){
 const nested=[...files.values()].find(x=>/\.xlsx$/i.test(x.name));
 if(!nested)throw Error('Classeur DADS INSEE 2016 absent');
 const book=zipEntries(nested.read());
 const workbook=book.get('xl/workbook.xml')?.read().toString('utf8');
 const relationship=book.get('xl/_rels/workbook.xml.rels')?.read().toString('utf8');
 const shared=book.get('xl/sharedStrings.xml')?.read().toString('utf8');
 if(!workbook||!relationship||!shared)throw Error('Métadonnées XLSX INSEE absentes');
 const strings=sharedStrings(shared),sheetPaths=workbookPaths(workbook,relationship),parsed={};
 for(const kind of ['COM','EPCI','DEP']){
  const target=sheetPaths.get(kind);
  if(!target)throw Error('Feuille '+kind+' absente');
  const sheet=book.get('xl/'+target);
  if(!sheet)throw Error('Feuille introuvable '+target);
  parsed[kind]=xlsxRows(sheet.read().toString('utf8'),strings);
 }
 return parsed;
}
async function base(year){
 const which=year===2022?'current':year===2016?'prior':null;
 if(!which)throw Error('Millésime non autorisé');
 const prior=CACHE.get(year);
 if(prior?.until>Date.now())return prior.value;
 if(IN_PROGRESS.has(year))return IN_PROGRESS.get(year);
 const load=(async()=>{
  const zip=await download(which),data={};
  if(year===2022){
   for(const type of ['COM','EPCI','DEP']){
    const file=[...zip.values()].find(x=>new RegExp('_'+type+'\\.csv$').test(x.name)&&!x.name.startsWith('meta_'));
    if(!file)throw Error('CSV INSEE '+type+' manquant');
    data[type]=csvRows(file.read().toString('utf8'));
   }
  }else Object.assign(data,parse2016(zip));
  CACHE.set(year,{value:data,until:Date.now()+CACHE_DURATION});
  return data;
 })();
 IN_PROGRESS.set(year,load);
 try{return await load}
 finally{IN_PROGRESS.delete(year)}
}
function salaryItem(now,earlier){
 const monthly=finite(now)===null?null:Math.round(now*MONTH_HOURS);
 const change=finite(now)!==null&&finite(earlier)!==null?
  Math.round((now/earlier-1)*1000)/10:null;
 return {value:monthly,change,year:2022,referenceYear:2016};
}
function sectionFor(current,former,kind){
 return {rows:GROUPS[kind].map(prefix=>salaryItem(current?.[prefix],former?.[prefix])),
  year:2022,referenceYear:2016,source:SOURCE};
}
function emptySections(){
 const result={};
 for(const kind of Object.keys(GROUPS))result[kind]={commune:null,epci:null,departement:null};
 return result;
}
async function salaries({commune,epci,departement}){
 if(!/^(?:[0-9]{5}|2[AB][0-9]{3})$/i.test(commune||''))throw Error('Code commune invalide');
 if(epci&&!/^[0-9]{9}$/.test(epci))throw Error('Code EPCI invalide');
 if(departement&&!/^(?:\d{2,3}|2[AB])$/i.test(departement))throw Error('Département invalide');
 const result={source:SOURCE,codes:{commune,epci:epci||null,departement:departement||null},
  sections:emptySections(),errors:[],generated_at:new Date().toISOString()};
 const [a,b]=await Promise.allSettled([base(2022),base(2016)]);
 const current=a.status==='fulfilled'?a.value:null;
 const before=b.status==='fulfilled'?b.value:null;
 if(!current){result.errors.push('Fichier INSEE 2022 indisponible');return result}
 if(!before)result.errors.push('Fichier INSEE 2016 indisponible : évolutions masquées');
 for(const [level,type,code] of [['commune','COM',commune],['epci','EPCI',epci],['departement','DEP',departement]]){
  if(!code)continue;
  const now=current[type]?.get(code)||null,past=before?.[type]?.get(code)||null;
  for(const key of Object.keys(GROUPS))result.sections[key][level]=sectionFor(now,past,key);
 }
 return result;
}
module.exports={salaries,salaryItem,sectionFor,zipEntries,csvRows,sharedStrings,
 xlsxRows,workbookPaths,parse2016,xmlDecode,GROUPS,SOURCE};
