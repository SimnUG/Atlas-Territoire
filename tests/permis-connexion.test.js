'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const connector=require('../permis-sitadel');

function fixture(id,date){
 return {
  COMM:'85081',TYPE_DAU:'PC',NUM_DAU:id,ETAT_DAU:2,
  DATE_REELLE_AUTORISATION:date,NB_LGT_TOT_CREES:7,
  NB_LGT_IND_CREES:0,NB_LGT_COL_CREES:7,
  NB_LGT_1P:1,NB_LGT_2P:2,NB_LGT_3P:4,NB_LGT_6P_PLUS:0,
  ADR_NUM_TER:'12',ADR_LIBVOIE_TER:'RUE DU BOURG',
  DENOM_DEM:'PROMOTION EXEMPLE'
 };
}
test('API DiDo : filtre code INSEE et PC, avance jusqu’à la fin réelle de la pagination',async()=>{
 const original=global.fetch,requests=[];
 global.fetch=async url=>{
  const u=new URL(url);
  assert.ok(u.pathname.endsWith('/8b35affb-55fc-4c1f-915b-7750f974446a/rows'));
  assert.equal(u.searchParams.get('COMM'),'eq:85081');
  assert.equal(u.searchParams.get('TYPE_DAU'),'eq:PC');
  requests.push(u);
  const page=u.searchParams.get('page');
  const rows=page==='1'?[fixture('PC1','2025-02-01')]:page==='2'?[fixture('PC2','2026-05-12')]:[];
  return {ok:true,json:async()=>({rows})};
 };
 try{
  const d=await connector.permits('85081');
  assert.equal(d.statut,'disponible');
  assert.equal(d.dossiers.length,2);
  assert.equal(d.lignes_source,2);
  assert.equal(d.pages_consultees,3);
  assert.equal(d.dossiers[0].id,'PC2');
  assert.deepEqual(d.dossiers[0].pieces,[1,2,4,null,null,0]);
  assert.equal(requests.length,3);
 }finally{global.fetch=original}
});
