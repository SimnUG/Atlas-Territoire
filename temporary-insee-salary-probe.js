'use strict';
const zlib=require('node:zlib');
function files(b){
 const v=Buffer.from(b);let i=0;const entries=[];
 while(i<v.length-30){
  if(v.readUInt32LE(i)!==0x04034b50){i++;continue}
  const flag=v.readUInt16LE(i+6),method=v.readUInt16LE(i+8),
   csize=v.readUInt32LE(i+18),namelen=v.readUInt16LE(i+26),extra=v.readUInt16LE(i+28),
   name=v.subarray(i+30,i+30+namelen).toString('utf8'),offset=i+30+namelen+extra;
  if(flag&8){break}
  let raw=v.subarray(offset,offset+csize);
  if(method===8)raw=zlib.inflateRawSync(raw);
  entries.push({name,size:raw.length,buffer:raw});
  i=offset+csize;
 }
 return entries;
}
(async()=>{
 for(const [id,url] of [
  ['2022','https://www.insee.fr/fr/statistiques/fichier/8629963/base-cc-bases-tous-salaries-2022_csv.zip'],
  ['2016','https://www.insee.fr/fr/statistiques/fichier/8629963/base-cc-dads-2016-geo-2019.zip']
 ]){
  try{
   const res=await fetch(url,{signal:AbortSignal.timeout(20000)});
   const b=Buffer.from(await res.arrayBuffer());
   const entries=files(b);
   console.log('ZIP_STRUCTURE',id,'HTTP',res.status,'files',JSON.stringify(entries.map(x=>({name:x.name,size:x.size}))).slice(0,2700));
   for(const row of entries.slice(0,6)){
    const sample=row.name.endsWith('.csv')||row.name.endsWith('.txt')||row.name.endsWith('.xml')?
      row.buffer.toString('utf8',0,1600):'';
    console.log('ZIP_SAMPLE',id,row.name,JSON.stringify(sample).slice(0,1900));
   }
  }catch(e){console.log('ZIP_ERROR',id,e.message)}
 }
})().catch(e=>console.log('ZIP_FATAL',e.message));
