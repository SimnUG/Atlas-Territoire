'use strict';
const CACHE=new Map();
const SOURCE={nom:'INSEE Melodi, Recensement de la population 2023',url:'https://api.insee.fr/melodi/',millesime:2023};
async function source(ds,code){
 const u=new URL('https://api.insee.fr/melodi/data/'+ds);
 u.searchParams.set('GEO','COM-'+code);u.searchParams.set('TIME_PERIOD','2023');u.searchParams.set('maxResult','1000');
 const r=await fetch(u,{signal:AbortSignal.timeout(18000),headers:{Accept:'application/json'}});
 if(!r.ok)throw Error('INSEE '+ds+' HTTP '+r.status);
 const data=await r.json();
 if(data.paging?.next)throw Error('Page INSEE incomplète');
 return data.observations||[];
}
const getValue=x=>typeof x?.measures?.OBS_VALUE_NIVEAU?.value==='number'?x.measures.OBS_VALUE_NIVEAU.value:null;
function choose(rows,code,key,value,extra={}){
 const matches=rows.filter(x=>x.dimensions?.GEO?.endsWith('-COM-'+code)
  &&x.dimensions.TIME_PERIOD==='2023'&&x.dimensions?.[key]===value
  &&Object.entries(extra).every(([k,v])=>x.dimensions[k]===v));
 return matches.length===1?getValue(matches[0]):null;
}
function points(entries,tot){
 return {rows:entries.filter(x=>typeof x.value==='number').map(x=>({...x,share:tot>0?100*x.value/tot:null,change:null})),year:2023,source:SOURCE};
}
async function portrait(code){
 if(!/^(?:\d{5}|2[AB]\d{3})$/i.test(code))throw Error('Code INSEE invalide');
 const hit=CACHE.get(code);if(hit?.until>Date.now())return hit.data;
 const promise=(async()=>{
  const [a,b]=await Promise.allSettled([
   source('DS_RP_DIPLOMES_PRINC',code),
   source('DS_RP_TD_LOGEMENT_CARACT_PRINC',code)
  ]);
  const out={source:SOURCE,diplomes:null,anciennete:null,occupation:null,erreurs:[]};
  if(a.status==='fulfilled'){
   const rows=a.value,f={SEX:'_T',AGE:'Y_GE15',RP_MEASURE:'POP'};
   const total=choose(rows,code,'EDUC','_T',f);
   const labels=[
    ['001T100_RP','Sans diplôme ou inférieur au brevet'],
    ['200_RP','Brevet des collèges'],
    ['300_RP','CAP / BEP'],
    ['350T351_RP','Baccalauréat'],
    ['500T702_RP','Enseignement supérieur']
   ];
   const values=labels.map(([k,label])=>({label,value:choose(rows,code,'EDUC',k,f)}));
   if(total!==null&&values.every(x=>x.value!==null))out.diplomes=points(values,total);
   else out.erreurs.push('Ventilation diplôme incomplète');
  }else out.erreurs.push('Diplômes INSEE : '+a.reason.message);
  if(b.status==='fulfilled'){
   const rows=b.value;
   const f={NOR:'_T',BUILD_END:'_T',NOC:'_T',TDW:'_T',TSH:'_T',LIFT:'_T',OCS:'DW_MAIN',RP_MEASURE:'DWELLINGS'};
   const total=choose(rows,code,'L_STAY','_T',f);
   const labels=[
    ['Y_LT2','Moins de 2 ans'],['Y2T4','De 2 à 4 ans'],['Y5T9','De 5 à 9 ans'],
    ['Y10T19','De 10 à 19 ans'],['Y20T29','De 20 à 29 ans'],['Y_GE30','30 ans et plus']
   ];
   const values=labels.map(([k,label])=>({label,value:choose(rows,code,'L_STAY',k,f)}));
   if(total!==null&&values.every(x=>x.value!==null))out.anciennete=points(values,total);
   else out.erreurs.push('Ancienneté d’emménagement incomplète');
  }else out.erreurs.push('Ancienneté INSEE : '+b.reason.message);
  return out;
 })();
 CACHE.set(code,{data:promise,until:Date.now()+120000});
 try{const value=await promise;CACHE.set(code,{data:value,until:Date.now()+12*3600000});return value}
 catch(e){CACHE.delete(code);throw e}
}
module.exports={portrait,choose,SOURCE};