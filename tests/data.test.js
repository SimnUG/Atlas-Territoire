'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {asObservations,normalized}=require('../official-data');
const {demographics}=require('../demographics');
test('Melodi: dimensions et séries de mesures sont alignées',()=>{
 const result=asObservations({observations:{
   dimensions:[{GEO:'2026-COM-44109',TIME_PERIOD:'2023',POPREF_MEASURE:'PMUN'}],
   measures:{OBS_VALUE:[{value:'123456'}]},
   attributes:[{OBS_STATUS:'A'}]
 }});
 assert.equal(result.length,1);
 assert.equal(result[0].measures.OBS_VALUE,'123456');
 assert.equal(result[0].dimensions.GEO,'2026-COM-44109');
});
test('Melodi: l’absence de mesures ne donne aucun chiffre inventé',()=>{
 const result=asObservations({observations:{dimensions:[{TIME_PERIOD:'2023'}],measures:{}}});
 assert.equal(result.length,1);assert.deepEqual(result[0].measures,{});
});
test('normalisation d’adresse : casse et accents neutres',()=>{
 assert.equal(normalized('12 Rue des Écoles'),'12RUEDESCOLES');
});
test('tranches d’âge : accepter seulement des couples F + M complets',async()=>{
 const ages=['Y0T14','Y15T29','Y30T44','Y45T59'];
 const dims=[],vals=[];
 for(const key of ages){
  for(const sex of ['F','M']){dims.push({GEO:'2026-COM-44109',TIME_PERIOD:'2023',AGE:key,SEX:sex,RP_MEASURE:'POP'});vals.push({value:'100'})}
 }
 const data={observations:{dimensions:dims,measures:{OBS_VALUE:vals}}};
 const r=await demographics({melodi:async()=>data,asObservations,code:'44109'});
 assert.equal(r.tranches_age.length,4);
 assert.ok(r.tranches_age.every(x=>x.valeur===200&&x.millesime===2023));
});
