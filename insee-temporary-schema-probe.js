'use strict';
// One-time smoke test: all numbers are returned from Melodi; no test data shown to users.
const {population}=require('./population-insee');
population({commune:'85081',epci:'248500589'}).then(d=>{
 const digest={
  series:{commune:d.series.commune.map(x=>x.year),epci:d.series.epci.map(x=>x.year)},
  ages:{commune:d.sections.ages.commune?.rows?.map(x=>x.value),epci:d.sections.ages.epci?.rows?.map(x=>x.value)},
  csp:{commune:d.sections.csp.commune?.rows?.map(x=>x.value),epci:d.sections.csp.epci?.rows?.map(x=>x.value)},
  origines:{commune:d.sections.origines.commune?.rows?.map(x=>x.value),
   epci:d.sections.origines.epci?.rows?.map(x=>x.value),
   france:d.sections.origines.france?.rows?.map(x=>x.share)},
  errors:d.errors
 };
 console.log('INSEE_SMOKE',JSON.stringify(digest).slice(0,9000));
}).catch(e=>console.log('INSEE_SMOKE_ERROR',e.message));
