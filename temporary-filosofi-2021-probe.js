'use strict';
// Vérification transitoire : effectifs agrégés FiLoSoFi, sans données privées.
const {revenues}=require('./revenus-insee');
revenues({commune:'85081'}).then(r=>{
 const summary={median:r.median,profiles:{},composition:r.profiles.p2.composition};
 for(const [key,v] of Object.entries(r.profiles)){
  summary.profiles[key]={
   uc:v.uc,median:v.deciles['Médiane']?.monthly,
   d3:v.deciles.D3?.monthly,d9:v.deciles.D9?.monthly,
   activity:v.composition.activite
  };
 }
 console.log('REVENUS_FILO21_LIVE',JSON.stringify(summary));
}).catch(e=>console.log('REVENUS_FILO21_ERROR',e.message));
