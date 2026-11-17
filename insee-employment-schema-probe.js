'use strict';
// Diagnostic temporaire de bout en bout, à supprimer après validation.
const {employment}=require('./emploi-insee');
employment({commune:'85081',epci:'248500589'}).then(d=>{
 const summary={index:d.concentration,sections:{},errors:d.errors};
 for(const [key,result] of Object.entries(d.sections)){
  summary.sections[key]=Object.fromEntries(['commune','epci','france'].map(area=>
   [area,{values:result[area]?.rows?.map(x=>x.value),
          shares:result[area]?.rows?.map(x=>x.share),
          changes:result[area]?.rows?.map(x=>x.change)}]));
 }
 console.log('EMPLOYMENT_LIVE_CHECK',JSON.stringify(summary).slice(0,6500));
}).catch(e=>console.log('EMPLOYMENT_LIVE_ERROR',e.message));
