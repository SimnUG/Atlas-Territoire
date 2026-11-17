'use strict';
// Vérification ponctuelle des valeurs officielles retournées par le module de production.
const {families}=require('./familles-insee');
families({commune:'85081',epci:'248500589'})
 .then(result=>{
  const summaries={};
  for(const [key,data] of Object.entries(result.sections)){
   summaries[key]=Object.fromEntries(['commune','epci','france'].map(area=>
    [area,{valeurs:data[area]?.rows?.map(row=>row.value)||[],
      parts:data[area]?.rows?.map(row=>row.share)||[],
      taux:data[area]?.rows?.map(row=>row.change)||[]}]));
  }
  console.log('FAMILY_PRODUCTION_CHECK',JSON.stringify({code:result.code_insee,
   epci:result.code_epci,sections:summaries,errors:result.errors}).slice(0,7000));
 })
 .catch(error=>console.log('FAMILY_PRODUCTION_CHECK_ERROR',error.message));
