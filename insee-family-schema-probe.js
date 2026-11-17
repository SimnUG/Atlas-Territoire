'use strict';
(async()=>{
 await Promise.all(['DS_RP_MENAGES_COMP','DS_RP_FAMILLE_COMP'].map(async ds=>{
  try{
   const u=new URL('https://api.insee.fr/melodi/data/'+ds);
   u.searchParams.set('GEO','FRANCE-1');u.searchParams.set('TIME_PERIOD','2023');u.searchParams.set('maxResult','150');
   const r=await fetch(u,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(14000)});
   const data=await r.json();
   const rows=Array.isArray(data.observations)?data.observations:[];
   const sample=rows.filter(o=>ds==='DS_RP_MENAGES_COMP'?
    o.dimensions?.RP_MEASURE==='DWELLINGS'&&o.dimensions?.PCS==='_T':
    o.dimensions?.RP_MEASURE==='NBFAM'&&(o.dimensions?.TFN==='_T'||o.dimensions?.NCH==='_T'));
   console.log('FAMILY_FRANCE1',ds,r.status,rows.length,JSON.stringify(sample.map(o=>({d:o.dimensions,v:o.measures?.OBS_VALUE_NIVEAU?.value})).slice(0,30)).slice(0,5500));
  }catch(e){console.log('FAMILY_FRANCE1_ERROR',ds,e.message)}
 }))
})();
