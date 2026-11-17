'use strict';
(async()=>{
 const names=['FRANCE-F','FRANCE-FE','FRANCE-FM'];
 await Promise.all(names.flatMap(geo=>['DS_RP_MENAGES_COMP','DS_RP_FAMILLE_COMP'].map(async ds=>{
  try{
   const u=new URL('https://api.insee.fr/melodi/data/'+ds);
   u.searchParams.set('GEO',geo);u.searchParams.set('TIME_PERIOD','2023');u.searchParams.set('maxResult','150');
   const r=await fetch(u,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(13000)});
   const text=await r.text();
   if(!r.ok){console.log('FAMILY_FRCODE',geo,ds,'HTTP',r.status,'BODY',text.slice(0,120));return}
   const d=JSON.parse(text);
   const rows=Array.isArray(d.observations)?d.observations:[];
   const cols=rows.filter(x=>ds==='DS_RP_MENAGES_COMP'
    ?(x.dimensions?.TPH==='2'||x.dimensions?.TPH==='_T')&&x.dimensions?.RP_MEASURE==='DWELLINGS':
    x.dimensions?.NCH==='_T'&&['21','22','1','_T'].includes(x.dimensions?.TFN));
   console.log('FAMILY_FRCODE',geo,ds,'HTTP',r.status,'ROWS',rows.length,
    'VALUES',JSON.stringify(cols.map(x=>[x.dimensions.TPH||x.dimensions.TFN,x.measures?.OBS_VALUE_NIVEAU?.value])));
  }catch(e){console.log('FAMILY_FRCODE_ERROR',geo,ds,e.message)}
 })));
})();
