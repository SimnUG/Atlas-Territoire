'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const d=JSON.parse(fs.readFileSync('public/data/logements-85081.json','utf8'));
test('référence INSEE RP 2023, géographies correctes',()=>{
 assert.equal(d.commune.code,'85081');
 assert.equal(d.epci.code,'248500589');
 assert.match(d.source.url_commune,/insee\.fr/);
 assert.equal(d.source.annee,2023);
});
test('graphiques historiques complets de 1968 à 2023',()=>{
 const expected=[1968,1975,1982,1990,1999,2007,2012,2017,2023];
 for(const [id,values] of Object.entries(d.historique)){
  for(const side of ['commune','epci']){
   assert.deepEqual(values[side].map(x=>x.annee),expected,id+'/'+side);
   for(const n of values[side])assert.ok(Number.isInteger(n.valeur)&&n.valeur>=0);
  }
 }
 assert.equal(d.historique.total.commune.at(-1).valeur,1985);
 assert.equal(d.historique.total.epci.at(-1).valeur,51050);
});
test('toutes les matrices du recensement 2023 remplies',()=>{
 const ids=['type','categorie','occupation','pieces','anciennete'];
 assert.deepEqual(d.tableaux.map(x=>x.id),ids);
 for(const table of d.tableaux){
  for(const row of table.lignes){
   assert.ok(row.label);
   assert.ok(Number.isInteger(row.commune['2023']));
   assert.ok(Number.isInteger(row.epci['2023']));
   assert.ok(Number.isFinite(row.commune.part));
   assert.ok(Number.isFinite(row.epci.part));
   assert.ok(Number.isFinite(row.reference_france));
  }
 }
});
test('cohérence logement: catégories et types < 2 logements d’arrondi',()=>{
 const v=(id,where)=>d.tableaux.find(t=>t.id===id).lignes.reduce((s,row)=>s+row[where]['2023'],0);
 for(const x of ['commune','epci']){
  assert.ok(Math.abs(v('categorie',x)-d[x].total)<=1);
  assert.ok(Math.abs(v('type',x)-d[x].total)<=1);
 }
 assert.equal(d.tableaux.find(t=>t.id==='occupation').lignes[0].commune['2023'],1541);
});
test('JS et HTML de l’onglet Logements intégrés',()=>{
 const content=fs.readFileSync('public/logements-reference.js','utf8');
 new vm.Script(content,{filename:'logements-reference.js'});
 const html=fs.readFileSync('public/dashboard.html','utf8');
 assert.match(html,/logements-reference\.js/);
 assert.match(html,/logements-reference\.css/);
 const startup=fs.readFileSync('public/mockup-live.js','utf8');
 assert.match(startup,/AtlasLogementsPage/);
 assert.match(startup,/ensureLogementsReference/);
 assert.match(startup,/'logements'\]\.includes/);
});
