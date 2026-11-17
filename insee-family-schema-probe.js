'use strict';
// Diagnostic temporaire : seules des dimensions INSEE agrégées, sur une commune fictivement non privée, sont consignées.
(async()=>{
 const dss=['DS_RP_MENAGES_PRINC','DS_RP_MENAGES_COMP','DS_RP_FAMILLE_COMP'];
 await Promise.all(dss.map(async ds=>{
  for(const [year,geo] of [[2023,'COM-85081'],[2017,'COM-85081'],[2023,'FRANCE-FM']]){
   try{
    const u=new URL('https://api.insee.fr/melodi/data/'+ds);
    u.searchParams.set('GEO',geo);u.searchParams.set('TIME_PERIOD',String(year));
    u.searchParams.set('maxResult','900');
    const r=await fetch(u.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(18000)});
    const o=await r.json(),rows=Array.isArray(o.observations)?o.observations:[];
    const keys=[...new Set(rows.flatMap(x=>Object.keys(x.dimensions||{})))];
    const distinct=Object.fromEntries(keys.map(k=>[k,[...new Set(rows.map(x=>String(x.dimensions[k])))].sort().slice(0,45)]));
    const agg=rows.filter(x=>x.dimensions?.GEO&&x.dimensions?.TIME_PERIOD)
     .filter(x=>x.dimensions.SEX==='_T'|| !('SEX' in x.dimensions))
     .slice(0,85)
     .map(x=>({d:Object.fromEntries(Object.entries(x.dimensions).filter(([k])=>!['GEO','TIME_PERIOD','FREQ','SEX'].includes(k))),v:x.measures?.OBS_VALUE_NIVEAU?.value}));
    console.log('FAMILY_SCHEMA',ds,geo,year,'HTTP',r.status,'ROWS',rows.length,'NEXT',!!o.paging?.next,
     'OPTIONS',JSON.stringify(distinct).slice(0,7500),'SAMPLES',JSON.stringify(agg).slice(0,9300));
   }catch(e){console.log('FAMILY_SCHEMA',ds,geo,year,'ERROR',e.message)}
  }
 }));
})().catch(e=>console.log('FAMILY_SCHEMA_FATAL',e.message));
