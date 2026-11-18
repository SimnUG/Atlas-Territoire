const datasets=['DS_RP_DIPLOMES_PRINC','DS_RP_TD_LOGEMENT_CARACT_PRINC'];
async function run(){
 for(const ds of datasets){
  const u=new URL('https://api.insee.fr/melodi/data/'+ds);
  u.searchParams.set('GEO','COM-85081');u.searchParams.set('TIME_PERIOD','2023');u.searchParams.set('maxResult','1000');
  try{const r=await fetch(u,{signal:AbortSignal.timeout(30000)});const data=await r.json();
   const rows=data.observations||[];console.log(ds,r.status,'rows',rows.length,'paging',data?.paging);
   console.log('DIMENSIONS',JSON.stringify([...new Set(rows.map(x=>JSON.stringify(x.dimensions)))].slice(0,14),null,2).slice(0,4900));
   for(const key of ['EDUC','AGE','SEX','RP_MEASURE','TENURE','OCCUPANCY','DURATION_OFFER','DWELLING'])console.log(key,[...new Set(rows.map(x=>x.dimensions?.[key]).filter(Boolean))].slice(0,55));
  }catch(e){console.error(ds,e.message)}
 }
}
run();
