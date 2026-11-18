'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const epci=require('../loyers-epci');
const yieldData=require('../loyers-rendement');

test('médianes EPCI : montants manquants ignorés',()=>{
 assert.equal(epci.median([10.4,11.8,9.6]),10.4);
 assert.equal(epci.median([10,12,14,18]),13);
 assert.equal(epci.median([null,undefined,NaN,-1]),null);
});
test('extraction ANIL : quatrième typologie et millésime vérifiés',()=>{
 const fixture={types:[
  {id:'appartements',serie:[{annee:2025,loyer:10.4,observations:94,borne_basse:8.3,borne_haute:13.1,niveau_prediction:'commune'}]},
  {id:'petits',serie:[{annee:2025,loyer:12.1,observations:25}]},
  {id:'grands',serie:[{annee:2025,loyer:9.4}]},
  {id:'maisons',serie:[{annee:2025,loyer:9.7}]}
 ]};
 const got=epci.extractYear(fixture,2025);
 assert.equal(got.appartements.valeur,10.4);
 assert.equal(got.appartements.bas,8.3);
 assert.equal(got.maisons.valeur,9.7);
 assert.equal(epci.extractYear(fixture,2024).maisons,null);
});
test('DVF : exclure ventes autres typologies et VEFA, utiliser année réelle',()=>{
 const r={codcomm:'85081',idmutation:'id-2025-1',anneemut:2025,codtypbien:111,vefa:false,valeurfonc:280000,sbati:100};
 assert.deepEqual(yieldData.prepare(r,'85081'),{id:'id-2025-1',year:2025,type:'maisons',prix:2800});
 assert.equal(yieldData.prepare({...r,codcomm:'44020'},'85081'),null);
 assert.equal(yieldData.prepare({...r,codtypbien:999},'85081'),null);
 assert.equal(yieldData.prepare({...r,vefa:true},'85081'),null);
 assert.equal(yieldData.prepare({...r,sbati:0},'85081'),null);
 assert.equal(yieldData.prepare({...r,valeurfonc:10000},'85081'),null);
});
test('DVF : médiane robuste contre ordre des mutations',()=>{
 assert.equal(yieldData.median([2300,1500,1900,2500,2200]),2200);
 assert.equal(yieldData.median([]),null);
});
