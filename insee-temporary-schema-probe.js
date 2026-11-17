'use strict';
// Final probe of exact official dimension combinations, not private data.
(async()=>{
 const params=[
 ['nat1','DS_RP_TD_NAT_AGESEX_PRINC','COM-85081','TIME_PERIOD=2023',150],
 ['imm_agg','DS_RP_TD_IMMI_AGESEXEMPSTA_PRINC','COM-85081','TIME_PERIOD=2023&SEX=_T&EMPSTA_ENQ=_T',120],
 ['pcs_vals','DS_RP_POPULATION_COMP','COM-85081','TIME_PERIOD=2023&SEX=_T&AGE=Y_GE15',120],
 ['n_fr','DS_RP_TD_NAT_AGESEX_PRINC','FRANCE-FM','TIME_PERIOD=2023&SEX=_T',150],
 ['age_fr','DS_RP_POPULATION_PRINC','FRANCE-FM','TIME_PERIOD=2023&SEX=_T',100],
 ['age_epci','DS_RP_POPULATION_PRINC','EPCI-248500589','TIME_PERIOD=2023&SEX=_T',100],
 ['i_fr','DS_RP_TD_IMMI_AGESEXEMPSTA_PRINC','FRANCE-FM','TIME_PERIOD=2023&SEX=_T&EMPSTA_ENQ=_T',120]
 ];
 await Promise.all(params.map(async([tag,ds,geo,query,max])=>{
  try{
   const u='https://api.insee.fr/melodi/data/'+ds+'?GEO='+geo+'&'+query+'&maxResult='+max;
   const r=await fetch(u,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(17000)});
   const d=await r.json();
   const rows=Array.isArray(d.observations)?d.observations:[];
   const dims=[...new Set(rows.flatMap(o=>Object.keys(o.dimensions||{})))];
   const vals=Object.fromEntries(dims.map(k=>[k,[...new Set(rows.map(o=>o.dimensions[k]))].slice(0,30)]));
   const summary=rows.filter(o=>o.dimensions?.SEX==='_T').slice(0,32)
    .map(o=>({dimensions:Object.fromEntries(Object.entries(o.dimensions).filter(([k])=>!['FREQ','GEO','TIME_PERIOD','RP_MEASURE'].includes(k))),val:o.measures?.OBS_VALUE_NIVEAU?.value}));
   console.log('MELOFINAL',tag,'http',r.status,'COUNT',rows.length,'PAGING',JSON.stringify(d.paging||{}),
    'DIMS',JSON.stringify(vals),'SAMPLE',JSON.stringify(summary).slice(0,4600));
  }catch(e){console.log('MELOFINAL',tag,'ERR',e.message)}
 }));
})();
