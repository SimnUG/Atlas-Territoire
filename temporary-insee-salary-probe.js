'use strict';
// Vérification temporaire des données officielles pour une commune et ses comparateurs.
const {salaries}=require('./salaires-insee');
salaries({commune:'85081',epci:'248500589',departement:'85'})
 .then(data=>{
  const summary={years:{value:2022,baseline:2016},sections:{},errors:data.errors};
  for(const [key,section] of Object.entries(data.sections)){
   summary.sections[key]=Object.fromEntries(['departement','epci','commune'].map(level=>
    [level,{amount:section[level]?.rows?.map(x=>x.value),evolution:section[level]?.rows?.map(x=>x.change)}]));
  }
  console.log('SALARY_LIVE_SMOKE',JSON.stringify(summary));
 })
 .catch(e=>console.log('SALARY_LIVE_SMOKE_FAILED',e.message));
