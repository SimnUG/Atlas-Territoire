'use strict';
(async()=>{
 const combos=[
  ...['COM-85081','EPCI-248500589','FRANCE-F'].flatMap(geo=>[2023,2017,2012].flatMap(year=>
   ['DS_RP_EMPLOI_LR_PRINC','DS_RP_EMPLOI_LT_PRINC'].map(ds=>({geo,year,ds}))))
 ];
 await Promise.all(combos.map(async({geo,year,ds})=>{
  try{
   const url=new URL('https://api.insee.fr/melodi/data/'+ds);
   url.searchParams.set('GEO',geo);
   url.searchParams.set('TIME_PERIOD',String(year));url.searchParams.set('maxResult','950');
   const res=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(17000)});
   const body=await res.json(),rows=body.observations||[];
   const relevant=rows.filter(x=>{
    const d=x.dimensions;
    if(d.SEX!=='_T')return false;
    if(ds==='DS_RP_EMPLOI_LR_PRINC')return d.EDUC==='_T'&&['Y15T64','Y15T24','Y25T54','Y55T64','Y_GE15'].includes(d.AGE);
    return d.EMPFORM==='_T'&&d.WKTIME==='_T'&&d.AGE==='Y_GE15';
   });
   console.log('EMP_VALUES',geo,year,ds,res.status,'count',rows.length,'pages',!!body.paging?.next,
    'data',JSON.stringify(relevant.map(x=>[x.dimensions.AGE,x.dimensions.EMPSTA_ENQ,x.measures?.OBS_VALUE_NIVEAU?.value])).slice(0,5000));
  }catch(e){console.log('EMP_VALUES_ERR',geo,year,ds,e.message)}
 }));
})().catch(e=>console.log('EMP_FATAL',e.message));
