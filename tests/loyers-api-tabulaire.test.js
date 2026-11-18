'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const rental=require('../rental-data');

test('API tabulaire ANIL 2023 : récupérer seulement la commune 85081 et le loyer maison',async()=>{
 const original=global.fetch;
 const resource={id:'34434cef-2f85-43b9-a601-c625ee426cb7'};
 const calls=[];
 global.fetch=async(url)=>{
  const name=String(url),u=new URL(name);calls.push(u);
  assert.equal(u.hostname,'tabular-api.data.gouv.fr');
  if(u.pathname.endsWith('/profile/'))return {ok:true,json:async()=>({
   profile:{header:['INSEE_C','loypredm2','TYPPRED','nbobs_com']}
  })};
  if(u.pathname.endsWith('/data/')){
   assert.equal(u.searchParams.get('INSEE_C__exact'),'85081');
   return {ok:true,json:async()=>({data:[
    {INSEE_C:'85081',loypredm2:9.7,TYPPRED:'commune',nbobs_com:262}
   ]})};
  }
  throw Error('URL inattendue '+name);
 };
 try{
  const row=await rental.getTabular(resource,'85081');
  assert.equal(row.loypredm2,9.7);
  const result=rental.interpret(row,2023,'maisons');
  assert.equal(result.loyer,9.7);
  assert.equal(result.observations,262);
  assert.equal(result.comparaison_autorisee,true);
  assert.equal(calls.length,2);
 }finally{global.fetch=original}
});
