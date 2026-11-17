'use strict';
// Temporary Melodi metadata sanity checks; no secrets or user data logged.
(async()=>{
 const jobs=[
  ['p_meta','https://api.insee.fr/melodi/catalog/DS_RP_POPULATION_PRINC'],
  ['c_meta','https://api.insee.fr/melodi/catalog/DS_RP_POPULATION_COMP'],
  ['i_meta','https://api.insee.fr/melodi/catalog/DS_RP_TD_IMMI_AGESEXEMPSTA_PRINC'],
  ['n_meta','https://api.insee.fr/melodi/catalog/DS_RP_TD_NAT_AGESEXEMPSTA_PRINC'],
  ['p_all','https://api.insee.fr/melodi/data/DS_RP_POPULATION_PRINC?GEO=COM-85081&TIME_PERIOD=2023&maxResult=160'],
  ['c_all','https://api.insee.fr/melodi/data/DS_RP_POPULATION_COMP?GEO=COM-85081&TIME_PERIOD=2023&maxResult=350'],
  ['i_all','https://api.insee.fr/melodi/data/DS_RP_TD_IMMI_AGESEXEMPSTA_PRINC?GEO=COM-85081&TIME_PERIOD=2023&maxResult=250'],
  ['n_all','https://api.insee.fr/melodi/data/DS_RP_TD_NAT_AGESEXEMPSTA_PRINC?GEO=COM-85081&TIME_PERIOD=2023&maxResult=250'],
  ['h_epci','https://api.insee.fr/melodi/data/DS_POPULATIONS_HISTORIQUES?GEO=EPCI-248500589&maxResult=120'],
  ['h_comm','https://api.insee.fr/melodi/data/DS_POPULATIONS_HISTORIQUES?GEO=COM-85081&maxResult=120']
 ];
 await Promise.all(jobs.map(async([id,url])=>{
  try{
   const r=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(16000)});
   const d=await r.json();
   if(id.endsWith('_meta')){
    const st=d.structure||{};
    console.log('MELODICHECK',id,'http',r.status,'STRUCTURE',JSON.stringify(st).slice(0,9500));
   }else{
    const rows=Array.isArray(d.observations)?d.observations:[];
    const dims=[...new Set(rows.flatMap(o=>Object.keys(o.dimensions||{})))];
    const options=Object.fromEntries(dims.map(k=>[k,[...new Set(rows.map(o=>o.dimensions[k]))].slice(0,40)]));
    console.log('MELODICHECK',id,'http',r.status,'PAGING',JSON.stringify(d.paging||{}),
     'ROWS',rows.length,'OPTIONS',JSON.stringify(options).slice(0,5500),
     'SAMPLE',JSON.stringify(rows.slice(0,3)).slice(0,950));
   }
  }catch(e){console.log('MELODICHECK',id,'ERR',e.message)}
 }));
})();
