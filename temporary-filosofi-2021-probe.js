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
 const url='https://www.insee.fr/fr/statistiques/fichier/7756855/indic-struct-distrib-revenu-2021-COMMUNES_csv.zip';
 const resp=await fetch(url,{signal:AbortSignal.timeout(35000)});
 const items=unzip(Buffer.from(await resp.arrayBuffer()));
 for(const filename of ['FILO2021_DISP_COM.csv','meta_FILO2021_DISP_COM.csv']){
  const file=items.find(x=>x.name===filename);
  const lines=file.read().toString('utf8').split(/\r?\n/);
  if(filename.startsWith('meta_')){
   console.log('FILO_GROUPS',JSON.stringify(lines.filter(l=>
    /^((TME[1-5]|TYM[1-6]|OPR[1-6])(D321|D421|D621|PACT21|PPEN21|N[BPU]|Q221)|D321|NBMEN21|PACT21|PTSA21|PCHO21|PBEN21|PPEN21|PPAT21|PPSOC21|PPFAM21|PPMINI21|PPLOGT21|PIMPOT21);/.test(l))
    .slice(0,95).map(l=>l.slice(0,250))).slice(0,15000));
  }else{
   const names=lines[0].split(';'),cells=lines.find(l=>l.startsWith('85081;'))?.split(';')||[];
   const groups=['NBMEN21','Q221','D321','D421','D621','PACT21','PTSA21','PCHO21','PBEN21','PPEN21','PPAT21','PPSOC21','PPFAM21','PPMINI21','PPLOGT21','PIMPOT21',
    ...['TME1','TME2','TME3','TME4','TME5','TYM1','TYM2','TYM3','TYM4','TYM5','TYM6','OPR1','OPR2','OPR3','OPR4','OPR5','OPR6']
    .flatMap(pre=>['D321','D421','Q221','D621','PACT21','PPEN21'].map(k=>pre+k))];
   const result=Object.fromEntries(groups.filter(x=>names.includes(x)).map(k=>[k,cells[names.indexOf(k)]]));
   console.log('FILO_DOMPIERRE_FIELDS',JSON.stringify(result));
  }
 }
})().catch(e=>console.log('FILO_GROUPS_ERROR',e.message));
