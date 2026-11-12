'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const dashboard=fs.readFileSync('public/market-live.js','utf8');
const home=fs.readFileSync('public/index.html','utf8');
const originalTabs=[
'Programmation théorique','Commercialisation','Toutes les données','Focus commune',
'Population','Familles et ménages','Emploi et activité','Salaires nets',
'Revenus disponibles','Migrations résidentielles','Élections','Équipements et transports',
'Logements','Parc social','Loi SRU','Zonage ABC','Permis de construire',
'Prix (DVF)','Loyers du parc privé','Bâtiments et DPE'
];
test('Les onglets du menu initial sont tous présents et dans le même ordre',()=>{
 let previous=-1;
 const tabs=dashboard.slice(dashboard.indexOf('const tabs=['),dashboard.indexOf('const populated='));
 for(const name of originalTabs){
   const found=tabs.indexOf("label:'"+name+"'");
   assert.ok(found>=0,'Onglet absent : '+name);
   assert.ok(found>previous,'Ordre non conservé pour '+name);
   previous=found;
 }
});
test('Le menu de gauche utilise la liste fixe et ne masque pas les onglets',()=>{
 assert.match(dashboard,/tabs\.forEach\(t=>/);
 assert.match(dashboard,/const selected=tabs\.find/);
 assert.doesNotMatch(dashboard,/const nav=\$\('nav'\);nav\.replaceChildren\(\);[\s\S]{0,130}available\(\)\.forEach/);
});
test('La première page conserve sa recherche d’adresse',()=>{
 assert.match(home,/Rechercher une adresse/);
 assert.match(home,/id="address"/);
 assert.match(home,/id="form"/);
});
