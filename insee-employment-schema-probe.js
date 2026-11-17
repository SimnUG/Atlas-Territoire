'use strict';
// Temporaire : inspection des dimensions de l'API INSEE Melodi, sans données personnelles.
(async()=>{
 const ds=['DS_RP_EMPLOI_LR_PRINC','DS_RP_EMPLOI_LT_PRINC'];
 const all=ds.flatMap(dataset=>['COM-85081','EPCI-248500589','FRANCE-F'].map(geo=>({dataset,geo})));
 await Promise.all(all.map(async({dataset,geo})=>{
  try{
   const url=new URL('https://api.insee.fr/melodi/data/'+dataset);
   url.searchParams.set('GEO',geo);
   url.searchParams.set('TIME_PERIOD','2023');
   url.searchParams.set('maxResult','900');
   const resp=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(17000)});
   const data=await resp.json();
   const rows=Array.isArray(data.observations)?data.observations:[];
   const dims=[...new Set(rows.flatMap(r=>Object.keys(r.dimensions||{})))];
   const values=Object.fromEntries(dims.map(d=>[d,[...new Set(rows.map(r=>String(r.dimensions[d])))].slice(0,45)]));
   const sample=rows.filter(r=>r.dimensions.SEX==='_T'&&!Object.values(r.dimensions).includes('F'))
    .slice(0,36).map(r=>({d:Object.fromEntries(Object.entries(r.dimensions).filter(([k])=>!['GEO','TIME_PERIOD','FREQ'].includes(k))),v:r.measures?.OBS_VALUE_NIVEAU?.value}));
   console.log('EMP_SCHEMA',dataset,geo,'HTTP',resp.status,'COUNT',rows.length,'PAGING',!!data.paging?.next,
      'DIM',JSON.stringify(values).slice(0,6500),'SAMPLE',JSON.stringify(sample).slice(0,6200));
  }catch(e){console.log('EMP_SCHEMA',dataset,geo,'ERROR',e.message)}
 }));
})().catch(e=>console.log('EMP_SCHEMA_FATAL',e.message));
