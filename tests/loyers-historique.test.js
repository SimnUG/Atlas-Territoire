'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const rental=require('../rental-data');
const rend=require('../loyers-rendement');

test('ANIL : reconnaître les quatre fichiers de loyers de chaque millésime',()=>{
 const files=[
  ['Indicateurs de loyer maison','maisons'],
  ['Indicateurs de loyer appartement de 3 pièces et plus','grands'],
  ['Indicateurs de loyer appartement de 1 ou 2 pièces','petits'],
  ['Indicateurs de loyer appartement','appartements']
 ];
 for(const [title,expected] of files){
  assert.equal(rental.category({title,description:'',url:''}),expected);
 }
});
test('ANIL : lire la commune exacte, valeur, intervalle, nombre observations',()=>{
 const csv='INSEE_C;loypredm2;lwr_ipm2;upr_ipm2;nbobs_com;typpred\n85081;9,7;7,9;12,0;262;commune\n44109;14,2;10,0;18,0;1000;commune';
 const match=rental.rowFor(csv,'85081');
 assert.equal(match.row.INSEE_C,'85081');
 assert.equal(rental.rowFor(csv,'85082').row,null);
 const got=rental.interpret(match.row,2023,'maisons');
 assert.equal(got.loyer,9.7);
 assert.equal(got.observations,262);
 assert.equal(got.comparaison_autorisee,true);
});
test('DVF+ 2022-2025 : vente de maison, exclusions VEFA et prix médian',()=>{
 const sales=Array.from({length:5},(_,i)=>({
  codcomm:'85081',idmutation:'V'+i,anneemut:2022,
  codtypbien:111,vefa:false,valeurfonc:(i+1)*200000,sbati:100
 }));
 const values=sales.map(x=>rend.prepare(x,'85081').prix);
 assert.equal(rend.median(values),6000);
 assert.equal(rend.prepare({...sales[0],vefa:true},'85081'),null);
 assert.equal(rend.prepare({...sales[0],codtypbien:121},'85081').type,'appartements');
});
