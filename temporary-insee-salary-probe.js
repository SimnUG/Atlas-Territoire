'use strict';
// Temporary INSEE salary source diagnostic: prints headers and dimension codes only.
(async()=>{
 const resources=[
 ['2022_csv','https://www.insee.fr/fr/statistiques/fichier/8629963/base-cc-bases-tous-salaries-2022_csv.zip'],
 ['2016_zip','https://www.insee.fr/fr/statistiques/fichier/8629963/base-cc-dads-2016-geo-2019.zip'],
 ['sal_eqtp_pcs','https://api.insee.fr/melodi/data/DS_BTS_SAL_EQTP_SEX_PCS?GEO=COM-85081&TIME_PERIOD=2022&maxResult=80'],
 ['sal_eqtp_age','https://api.insee.fr/melodi/data/DS_BTS_SAL_EQTP_SEX_AGE?GEO=COM-85081&TIME_PERIOD=2022&maxResult=80'],
 ['sal_horaire','https://api.insee.fr/melodi/data/DS_BTS_SAL_HORAIRE_SEX_PCS?GEO=COM-85081&TIME_PERIOD=2022&maxResult=80'],
 ['sal_hour','https://api.insee.fr/melodi/data/DS_BTS_SAL_HOUR_SEX_PCS?GEO=COM-85081&TIME_PERIOD=2022&maxResult=80'],
 ['catalog','https://api.insee.fr/melodi/catalog']
 ];
 await Promise.all(resources.map(async([id,url])=>{
  try{
   const res=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{Accept:'application/json, text/csv, application/zip, */*'}});
   if(id.endsWith('zip')||id.endsWith('csv')){
    let b=await res.arrayBuffer();
    console.log('SAL_PROBE',id,'HTTP',res.status,'length',b.byteLength,'contentType',res.headers.get('content-type'),
      'first8',Buffer.from(b).subarray(0,8).toString('hex'));
   }else{
    const raw=await res.text();
    let data;try{data=JSON.parse(raw)}catch(e){}
    const rows=data?.observations||[];
    const vals=Object.fromEntries([...new Set(rows.flatMap(o=>Object.keys(o.dimensions||{})))].map(k=>[k,[...new Set(rows.map(o=>o.dimensions[k]))].slice(0,12)]));
    console.log('SAL_PROBE',id,'HTTP',res.status,'length',raw.length,'keys',Object.keys(data||{}),
      'rows',rows.length,'dims',JSON.stringify(vals).slice(0,1200),'sample',raw.slice(0,300));
   }
  }catch(e){console.log('SAL_PROBE',id,'ERROR',e.message)}
 }));
})();
