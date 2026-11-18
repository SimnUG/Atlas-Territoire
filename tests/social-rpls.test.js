'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const rpls=require('../social-rpls');
test('RPLS official 2025 nationally indexed for municipalities',()=>{
 const data=rpls.load();
 assert.ok(Object.keys(data.communes).length>10000);
 assert.ok(data.fields.has(143));
});
test('Dompierre 2025 SDES stock, occupancy, typology and financing',()=>{
 const d=rpls.social('85081');
 assert.equal(d.statut,'disponible');
 assert.equal(d.total,149);
 assert.equal(d.occupation.occupied,147);
 assert.equal(d.occupation.vacants,2);
 assert.equal(d.occupation.rows.reduce((s,r)=>s+r.nombre,0),149);
 assert.deepEqual(d.typologie.nature.map(x=>x.nombre),[53,96]);
 assert.deepEqual(d.typologie.pieces.map(x=>x.nombre),[0,16,96,37,0]);
 assert.deepEqual(d.financements.rows.map(x=>x.nombre),[6,101,42,0,0]);
 assert.deepEqual(d.anciennete.rows.map(x=>x.nombre),[31,37,19,48,14,0]);
});
test('Official series have all RPLS years and correct endpoints',()=>{
 const d=rpls.social('85081');
 for(const section of ['evolution','vacance','mobilite']){
  const rows=d[section].valeurs;
  assert.equal(rows.length,13);
  assert.equal(rows[0].annee,2013);
  assert.equal(rows.at(-1).annee,2025);
  rows.forEach(x=>assert.ok(typeof x.valeur==='number'&&Number.isFinite(x.valeur)));
 }
 assert.equal(d.evolution.valeurs[0].valeur,64);
 assert.equal(d.evolution.valeurs[7].valeur,116); // 2020
 assert.equal(d.evolution.valeurs.at(-1).valeur,149);
 assert.ok(Math.abs(d.vacance.actuel-.6803)<.001);
 assert.ok(Math.abs(d.mobilite.actuel-10.2041)<.001);
 assert.ok(Math.abs(d.loyers.actuel-6.21895679)<.001);
 assert.equal(d.loyers.valeurs[0].annee,2013);
 assert.equal(d.loyers.valeurs.at(-1).annee,2025);
});
test('Map coordinates are aggregated RPLS public geolocalisation, not household data',()=>{
 const d=rpls.social('85081');
 assert.equal(d.geo.statut,'disponible');
 assert.ok(d.geo.points.length>=15);
 assert.equal(d.geo.points.reduce((s,p)=>s+p.nombre,0),149);
 for(const p of d.geo.points){
  assert.ok(p.lat>46&&p.lat<47.3);
  assert.ok(p.lng>-2&&p.lng<-.8);
  assert.ok(Number.isInteger(p.nombre)&&p.nombre>0);
  assert.ok(!('occupant' in p) && !('bailleur' in p) && !('nom' in p));
 }
});
test('Unknown towns must not receive Dompierre housing values',()=>{
 const result=rpls.social('99999');assert.equal(result.statut,'absent');
 assert.equal(result.total,undefined);
});
test('WGS84 coordinates from Lambert-93 are correct within a few metres',()=>{
 const {lambert93}=require('../social-rpls-geo');
 const {lat,lng}=lambert93(365550,6636050);
 assert.ok(Math.abs(lat-46.7410092)<.00002);
 assert.ok(Math.abs(lng+1.3826897)<.00002);
});
test('Source code supports on-demand RPLS map without guessing points',()=>{
 const script=fs.readFileSync('social-rpls-geo.js','utf8');
 assert.match(script,/DEPCOM/);
 assert.match(script,/MAX_RECORDS/);
 const server=fs.readFileSync('server.js','utf8');
 assert.match(server,/\/api\/parc-social-rpls-points/);
 const front=fs.readFileSync('public/mockup-live.js','utf8');
 assert.match(front,/ensureSocialGeo/);
});
test('Frontend is activated without overwriting other Atlas tabs',()=>{
 const html=fs.readFileSync('public/dashboard.html','utf8');
 const live=fs.readFileSync('public/mockup-live.js','utf8');
 assert.match(html,/social-reference\.js/);
 assert.match(html,/social-reference\.css/);
 assert.match(live,/AtlasSocialPage/);
 assert.match(live,/ensureSocialRpls/);
 const script=fs.readFileSync('public/social-reference.js','utf8');
 assert.match(script,/Plan IGN/);
 assert.match(script,/rs-map-filters/);
});
