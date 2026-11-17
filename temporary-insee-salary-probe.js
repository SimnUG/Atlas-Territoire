'use strict';
const zlib=require('node:zlib');
function unzip(b){
 const buf=Buffer.from(b),out=[],len=buf.length;
 let dir=-1;
 for(let i=len-22;i>=Math.max(0,len-66000);i--){
  if(buf.readUInt32LE(i)===0x06054b50){dir=buf.readUInt32LE(i+16);break}
 }
 if(dir<0)throw Error('ZIP dir missing');
 let pos=dir;
 while(pos+46<len&&buf.readUInt32LE(pos)===0x02014b50){
  const method=buf.readUInt16LE(pos+10),compressed=buf.readUInt32LE(pos+20),
   namelen=buf.readUInt16LE(pos+28),extra=buf.readUInt16LE(pos+30),
   comment=buf.readUInt16LE(pos+32),local=buf.readUInt32LE(pos+42),
   name=buf.subarray(pos+46,pos+46+namelen).toString('utf8');
  const data=local+30+buf.readUInt16LE(local+26)+buf.readUInt16LE(local+28);
  const raw=buf.subarray(data,data+compressed);
  const extract=()=>method===8?zlib.inflateRawSync(raw):Buffer.from(raw);
  out.push({name,extract});
  pos+=46+namelen+extra+comment;
 }
 return out;
}
(async()=>{
 const url='https://www.insee.fr/fr/statistiques/fichier/8629963/base-cc-dads-2016-geo-2019.zip';
 const res=await fetch(url,{signal:AbortSignal.timeout(25000)});
 const zip=unzip(await res.arrayBuffer());
 const nested=unzip(zip.find(x=>x.name.endsWith('.xlsx')).extract());
 console.log('2016_XLSX_ENTRIES',JSON.stringify(nested.map(x=>({name:x.name}))).slice(0,1800));
 for(const x of nested.filter(x=>['xl/workbook.xml','xl/_rels/workbook.xml.rels',
     'xl/sharedStrings.xml'].includes(x.name)||/^xl\/worksheets\/sheet[0-9]+\.xml$/.test(x.name)).slice(0,15)){
  const raw=x.extract(),s=raw.toString('utf8');
  const first=s.indexOf('<row');
  const text=x.name.includes('worksheets')?s.slice(first,first+1400):s.slice(0,1200);
  console.log('XLSX_SHEET',x.name,'size',raw.length,
   'first',JSON.stringify(text).slice(0,1700));
 }
})().catch(e=>console.log('XLSX_PROBE_ERROR',e.message));
