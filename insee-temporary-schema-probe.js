'use strict';
// Diagnostic éphémère de schéma Melodi — uniquement les 3 premières observations et dimensions.
(async()=>{
 const root='https://api.insee.fr/melodi/';
 const requests=[
 ['catalog-princ','catalog/DS_RP_POPULATION_PRINC'],
 ['catalog-comp','catalog/DS_RP_POPULATION_COMP'],
 ['catalog-imm','catalog/DS_RP_TD_IMMI_AGESEXEMPSTA_PRINC'],
 ['historic','data/DS_POPULATIONS_HISTORIQUES?GEO=COM-85081&maxResult=3'],
 ['princip','data/DS_RP_POPULATION_PRINC?GEO=COM-85081&maxResult=3'],
 ['comp','data/DS_RP_POPULATION_COMP?GEO=COM-85081&maxResult=3'],
 ['imm','data/DS_RP_TD_IMMI_AGESEXEMPSTA_PRINC?GEO=COM-85081&maxResult=3'],
 ['epci','data/DS_RP_POPULATION_PRINC?GEO=EPCI-248500589&maxResult=3']
 ];
 await Promise.all(requests.map(async([id,path])=>{
  try{
   const res=await fetch(root+path,{headers:{Accept:'application/json'},
    signal:AbortSignal.timeout(12000)});
   const raw=await res.text();
   const data=JSON.parse(raw);
   if(id.startsWith('catalog')){
    const fields=(data?.dimensions||data?.structure?.dimensions||data?.data?.dimensions||[]);
    console.log('MEL_PROBE',id,JSON.stringify({status:res.status,
     keys:Object.keys(data),dims:Array.isArray(fields)?fields.slice(0,12).map(d=>({id:d.id,name:d.name,values:d.values?.slice?.(0,12),codes:d.codes?.slice?.(0,12)})):fields,
     sample:JSON.stringify(data).slice(0,2000)}));
   }else{
    const block=data.observations||{};
    console.log('MEL_PROBE',id,JSON.stringify({status:res.status,
     top:Object.keys(data),block:Object.keys(block),
     dimensions:Array.isArray(block.dimensions)?block.dimensions.slice(0,3):[],
     measures:block.measures?Object.fromEntries(Object.entries(block.measures).slice(0,3).map(([k,v])=>[k,Array.isArray(v)?v.slice(0,3):v])):null,
     sample:JSON.stringify(data).slice(0,450)}));
   }
  }catch(e){console.log('MEL_PROBE',id,'ERROR',e.message)}
 }));
})().catch(e=>console.log('MEL_PROBE_FATAL',e.message));
