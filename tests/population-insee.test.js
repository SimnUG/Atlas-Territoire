'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {
 rowsFrom,one,point,extractTable,historic,nationality,immigrated,extractOrigins
}=require('../population-insee');
const obs=(geo,year,dimension,value)=>({
 dimensions:{GEO:geo,TIME_PERIOD:String(year),FREQ:'A',RP_MEASURE:'POP',...dimension},
 measures:{OBS_VALUE_NIVEAU:{value}}
});
const commune='2026-COM-85081';
test('Melodi : filtrage strict commune/année et conservation des séries de 1968',()=>{
 const payload={observations:[
  obs('2025-COM-85081',1968,{POPREF_MEASURE:'PMUN',AGE:undefined},1539),
  obs(commune,2023,{SEX:'_T',AGE:'Y_LT15'},915.26188),
  obs('2026-COM-44109',2023,{SEX:'_T',AGE:'Y_LT15'},900000)
 ]};
 const rows=rowsFrom(payload,'COM-85081');
 assert.equal(rows.length,2);
 assert.equal(rows[0].year,1968);
 assert.equal(rows[1].value,915.26188);
 const older={observations:[{
  dimensions:{GEO:'2025-COM-85081',TIME_PERIOD:'1968',POPREF_MEASURE:'PSDC'},
  measures:{OBS_VALUE_NIVEAU:{value:1539}}
 }]};
 const long=rowsFrom(older,'COM-85081');
 assert.equal(historic(long,[])[0].year,1968);
 assert.throws(()=>rowsFrom({observations:[],paging:{next:'https://example.com'}},'COM-85081'),
  /Pagination/);
});
test('Tranches d’âges : une seule observation agrégée, répartition et évolutions correctes',()=>{
 const ages=['Y_LT15','Y15T24','Y25T39','Y40T54','Y55T64','Y65T79','Y_GE80'];
 const rows=[
 ...ages.map((AGE,i)=>({year:2023,d:{AGE,SEX:'_T',RP_MEASURE:'POP'},value:(i+1)*100})),
 ...ages.map((AGE,i)=>({year:2017,d:{AGE,SEX:'_T',RP_MEASURE:'POP'},value:(i+1)*80})),
 {year:2023,d:{AGE:'_T',SEX:'_T',RP_MEASURE:'POP'},value:2800},
 {year:2017,d:{AGE:'_T',SEX:'_T',RP_MEASURE:'POP'},value:2240}
 ];
 const out=extractTable(rows,'ages');
 assert.equal(out.rows.length,7);
 assert.equal(out.rows[0].value,100);
 assert.equal(out.rows[0].share,3.6);
 assert.equal(out.rows[0].change,25);
 // Les agrégats par sexe ne sont pas cumulés : une seule observation.
 rows.push({year:2023,d:{AGE:'Y_LT15',SEX:'_T',RP_MEASURE:'POP'},value:100});
 const double=extractTable(rows,'ages');
 assert.equal(double.rows[0].value,null);
});
test('CSP 2023 : groupe 9 autres sans activité, groupe 7 retraités',()=>{
 const rows=[
  {year:2023,d:{PCS:'7',SEX:'_T',AGE:'Y_GE15',RP_MEASURE:'POP'},value:1055.88551},
  {year:2023,d:{PCS:'9',SEX:'_T',AGE:'Y_GE15',RP_MEASURE:'POP'},value:402.15833},
  {year:2023,d:{PCS:'_T',SEX:'_T',AGE:'Y_GE15',RP_MEASURE:'POP'},value:3749.55475}
 ];
 const out=extractTable(rows,'csp');
 assert.equal(out.rows[6].value,1056);
 assert.equal(out.rows[7].value,402);
 assert.equal(out.rows[7].share,10.7);
 assert.equal(out.rows[0].value,null);
});
test('Origines : nationalité et immigration restent des axes distincts',()=>{
 const nat=[
  {year:2023,d:{SEX:'_T',NATIONALITY_TYPE:'100',AGE:'_T',RP_MEASURE:'POP'},value:37.32536},
  {year:2023,d:{SEX:'_T',NATIONALITY_TYPE:'250',AGE:'_T',RP_MEASURE:'POP'},value:4587.67464}
 ];
 const imm=[{year:2023,d:{SEX:'_T',IMMI:'1',AGE:'_T',EMPSTA_ENQ:'_T',RP_MEASURE:'POP'},value:75.7381}];
 assert.equal(nationality(nat).total,4625);
 assert.equal(Math.round(immigrated(imm)),76);
 const origins=extractOrigins(nat,imm);
 assert.deepEqual(origins.rows.map(x=>x.value),[4588,37,76]);
 assert.deepEqual(origins.rows.map(x=>x.share),[99.2,0.8,1.6]);
 assert.equal(origins.rows[2].change,null);
});
test('Aucune valeur manquante n’est remplacée par zéro',()=>{
 assert.equal(point(null,null,null).value,null);
 assert.equal(point(0,null,null).share,null);
 assert.equal(one([],2023,{AGE:'Y_LT15'}),null);
 const series=historic([{year:1968,value:1539,d:{POPREF_MEASURE:'PMUN'}}],[]);
 assert.equal(series[0].year,1968);
});
test('Le site appelle l’API Population seulement pour cet onglet et garde les 21 onglets',()=>{
 const server=fs.readFileSync('server.js','utf8');
 const client=fs.readFileSync('public/mockup-live.js','utf8');
 const ui=fs.readFileSync('public/population-reference.js','utf8');
 assert.match(server,/\/api\/population-insee/);
 assert.match(client,/ensurePopulation/);
 assert.match(client,/populationData/);
 assert.match(ui,/atlas-pop-chartcard/);
 assert.match(ui,/atlas-pop-matrix/);
 assert.match(ui,/atlas-pop-national/);
 const groups=client.slice(client.indexOf('const groups=['),client.indexOf('\n];',client.indexOf('const groups=[')));
 assert.equal((groups.match(/\['[^']+','[^']+','[^']+'\]/g)||[]).length,21);
});
