'use strict';
// Temporary INSEE FiLoSoFi 2021 CSV structure verification. Delete before final deploy.
const zlib=require('node:zlib');
function unzip(bytes){
 const b=Buffer.from(bytes),out=[];
 let e=-1;for(let i=b.length-22;i>=Math.max(0,b.length-66000);i--)if(b.readUInt32LE(i)===0x06054b50){e=i;break}
 if(e<0)throw Error('Missing ZIP EOCD');
 let p=b.readUInt32LE(e+16),n=b.readUInt16LE(e+10);
 for(let i=0;i<n;i++){
  if(b.readUInt32LE(p)!==0x02014b50)throw Error('Bad central dir');
  const type=b.readUInt16LE(p+10),size=b.readUInt32LE(p+20),
   fn=b.readUInt16LE(p+28),ex=b.readUInt16LE(p+30),comment=b.readUInt16LE(p+32),loc=b.readUInt32LE(p+42);
  const name=b.subarray(p+46,p+46+fn).toString('utf8');
  const off=loc+30+b.readUInt16LE(loc+26)+b.readUInt16LE(loc+28),src=b.subarray(off,off+size);
  out.push({name,read:()=>type===8?zlib.inflateRawSync(src):Buffer.from(src)});
  p+=46+fn+ex+comment;
 }
 return out;
}
(async()=>{
 for(const [level,url] of [
  ['communes','https://www.insee.fr/fr/statistiques/fichier/7756855/indic-struct-distrib-revenu-2021-COMMUNES_csv.zip'],
  ['admin','https://www.insee.fr/fr/statistiques/fichier/7756855/indic-struct-distrib-revenu-2021-SUPRA_csv.zip']]){
  try{
   const res=await fetch(url,{signal:AbortSignal.timeout(35000),headers:{Accept:'application/zip'}});
   const buf=Buffer.from(await res.arrayBuffer()),files=unzip(buf);
   console.log('FILO2021_FILES',level,res.status,buf.length,JSON.stringify(files.map(x=>x.name)));
   for(const item of files.filter(x=>/\.csv$/i.test(x.name))){
    const data=item.read().toString('utf8');
    const lines=data.split(/\r?\n/);
    const found=lines.findIndex(x=>/^85081(?:;|,)/.test(x)||/^(?:2022-)?COM-85081(?:;|,)/.test(x));
    const related=lines.find(x=>/^248500589(?:;|,)/.test(x));
    console.log('FILO2021_FILE',level,item.name,'size',data.length,'lines',lines.length,
      'HEAD',JSON.stringify(lines.slice(0,3)).slice(0,1600),
      'DompierreIndex',found,'SAMPLE',found>=0?JSON.stringify(lines[found].slice(0,1400)):'',
      'EPCI',related?.slice(0,300)||'');
   }
  }catch(e){console.log('FILO2021_DIAG_ERROR',level,e.message)}
 }
})();
