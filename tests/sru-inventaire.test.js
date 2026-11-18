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

test('inventaire SRU 2026 : montant net officiel, majoration, année et taux en ratio',()=>{
 const tab=sru.readTable([
  'Région;Code Département;Code_INSEE de la commune;Nom de la commune;Nombre de logements locatifs sociaux Inventaire au 1er janvier 2025;Taux SRU au 1er janvier 2025;Taux cible de la commune 2023-2025;Commune déficitaire 2026;Prélèvement net 2026 (dont majoration)',
  'Pays de la Loire;85;85081;Dompierre-sur-Yon;159;0,0832;0,25;Oui;71 261'
 ].join('\\n').replace(/\\n/g,'\n'));
 const row=sru.extractRecord(tab,'85081');
 assert.equal(row.taux_sru,8.32);
 assert.equal(row.taux_cible,25);
 assert.equal(row.prelevement_net,71261);
 assert.equal(row.prelevement_annee,'2026');
 assert.equal(row.prelevement_avec_majoration,true);
 assert.equal(row.situation,'Commune déficitaire');
});
test('un prélèvement brut seul est refusé pour la rubrique net',()=>{
 assert.throws(()=>sru.readTable('Code_INSEE de la commune;Commune;Taux SRU;Objectif;Prélèvement brut;Statut\\n85081;Dompierre-sur-Yon;8,3;25;71261;Déficitaire'),/Prélèvement net/);
});
test('normaliser sans confondre taux et prélèvement',()=>{
 assert.equal(sru.percentage('0,084'),8.4);
 assert.equal(sru.percentage('8,4'),8.4);
 assert.equal(sru.percentage('0,25'),25);
 assert.equal(sru.number('71\\u202f261,00 €'),71261);
});
