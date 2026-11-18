'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const zlib=require('node:zlib');
const index=JSON.parse(zlib.gunzipSync(fs.readFileSync('public/data/logements-44-85-2023.json.gz')));
const insee=require('../logements-insee-complet');
const all=Object.keys(index.communes);
test('Chaque commune actuelle des départements 44/85 est accessible sans EPCI',async()=>{
 assert.equal(all.length,460);
 for(const code of all){
  const doc=await insee.logement({commune:code});
  assert.equal(doc.statut,'disponible',code);
  assert.equal(doc.commune.code,code);
  assert.equal(doc.tableaux.length,5,code);
  assert.equal(doc.historique.total.commune.length,9,code);
  assert.ok(doc.epci.nom,code);
 }
});
test('Une réponse administrative EPCI erronée ne masque plus les données',async()=>{
 const codes=['44109','44143','44020','44194','85081','85191','85234'];
 for(const code of codes){
  const original=index.communes[code];
  assert.ok(original,code);
  const loaded=await insee.logement({commune:code,epci:'DEP-85'});
  assert.equal(loaded.epci.code,original.epci.code);
  assert.equal(loaded.commune.total,original.commune.total);
 }
});
test('La page Logements ne dépend pas de la disponibilité du profil administratif',()=>{
 const js=fs.readFileSync('public/mockup-live.js','utf8');
 const start=js.indexOf('function ensureLogementsReference(){');
 const end=js.indexOf('function ensureSocialGeo(){',start);
 assert.ok(start>=0&&end>start);
 const body=js.slice(start,end);
 assert.ok(!body.includes('!state.admin'));
 assert.ok(!body.includes('code_epci:'));
 assert.match(body,/code_insee:code/);
});
