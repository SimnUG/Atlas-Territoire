'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const sru=require('../sru-inventaire');
const fixture=[
 'Code INSEE;Nom de la commune;Taux SRU;Taux cible;Prélèvement net dont majoration;Situation de la commune',
 '85081;Dompierre-sur-Yon;8,4;25;66063,38;Commune déficitaire',
 '44109;Nantes;27,8;25;0;Taux cible atteint'
].join('\n');
test('inventaire SRU : extraction exacte par code INSEE',()=>{
 const tab=sru.readTable(fixture);
 const r=sru.extractRecord(tab,'85081');
 assert.equal(r.commune,'Dompierre-sur-Yon');
 assert.equal(r.taux_sru,8.4);
 assert.equal(r.taux_cible,25);
 assert.equal(r.prelevement_net,66063.38);
 assert.equal(r.situation,'Commune déficitaire');
 assert.equal(sru.extractRecord(tab,'85085'),null);
});
test('inventaire SRU : zéro documenté et aucune assimilation des absences',()=>{
 const tab=sru.readTable(fixture);
 const n=sru.extractRecord(tab,'44109');
 assert.equal(n.prelevement_net,0);
 assert.equal(n.situation,'Taux cible atteint');
 assert.equal(sru.extractRecord(tab,'44100'),null);
});
test('inventaire SRU : CSV à virgules, valeurs inconnues',()=>{
 const tab=sru.readTable('Code INSEE,Commune,Taux de logements sociaux,Taux légal,Prélèvement net dont majoration\n85081,Dompierre-sur-Yon,8.4,25,ND\n');
 const r=sru.extractRecord(tab,'85081');
 assert.equal(r.taux_sru,8.4);
 assert.equal(r.prelevement_net,null);
 assert.equal(r.taux_cible,25);
});
