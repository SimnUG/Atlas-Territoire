'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {rowFor,interpret}=require('../rental-data');
const {objects}=require('../housing-data');
test('Loyers : identification par code INSEE, pas par nom de commune',()=>{
 const csv='INSEE_C;LIBGEO;loypredm2;TYPPRED;nbobs_com\n44109;Nantes;12,4;Commune;95\n44190;Rezé;11,6;epci;22\n';
 const a=rowFor(csv,'44109');
 assert.equal(a.row.LIBGEO,'Nantes');
 assert.equal(interpret(a.row,2025,'appartements').loyer,12.4);
 const b=rowFor(csv,'44190');
 assert.equal(interpret(b.row,2025,'appartements').comparaison_autorisee,null);
 const missing=rowFor(csv,'85092');
 assert.equal(missing.row,null);
});
test('Loyers : valeur inconnue ne devient pas zéro',()=>{
 const r=interpret({INSEE_C:'44109',loypredm2:'NA',TYPPRED:'Commune'},2025,'maisons');
 assert.equal(r.loyer,null);
});
test('Recensement : observations et valeurs conservées sans doublon',()=>{
 const data={observations:{dimensions:[{GEO:'2026-COM-44109',OCS:'DW_MAIN'}],measures:{OBS_VALUE_NIVEAU:[{value:'500'}]}}};
 const d=objects(data);
 assert.equal(d.length,1);
 assert.equal(d[0].measures.OBS_VALUE_NIVEAU,'500');
});
