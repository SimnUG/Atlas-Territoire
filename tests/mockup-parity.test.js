'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const expected=[["programmation","▥","Programmation théorique"],["commercialisation","◈","Commercialisation"],["population","♙","Population"],["familles","♧","Familles et ménages"],["emploi","◫","Emploi et activité"],["salaires","▤","Salaires nets"],["revenus","◇","Revenus disponibles"],["migrations","⇄","Migrations résidentielles"],["elections","▣","Élections"],["equipements","♧","Équipements et transports"],["logements","⌂","Logements"],["social","▥","Parc social"],["sru","▤","Loi SRU"],["zonage","◈","Zonage ABC"],["permis","▧","Permis de construire"],["prix","€","Prix (DVF)"],["loyers","◈","Loyers du parc privé"],["batiments","▦","Bâtiments et DPE"],["urbanisme","◈","Urbanisme"],["finances","€","Finances locales"],["sources","▦","Provenance des données"]];
const js=fs.readFileSync('public/mockup-live.js','utf8');
const html=fs.readFileSync('public/dashboard.html','utf8');
const css=fs.readFileSync('public/mockup.css','utf8');
function groupsFrom(text){
 const match=text.match(/const groups=\[[\s\S]*?\n\];/);
 assert.ok(match,'Menu historique non trouvé');
 return [...match[0].matchAll(/\['([^']+)','([^']+)','([^']+)'\]/g)]
  .map(m=>[m[1],m[2],m[3]]);
}
test('Parité exacte des 21 onglets : identifiants, pictogrammes et titres',()=>{
 assert.equal(expected.length,21);
 assert.deepEqual(groupsFrom(js),expected);
});
test('Maquette : classes de navigation identiques et structure de page réelle',()=>{
 assert.match(html,/class="sidebar" id="sidebar"/);
 assert.match(css,/\.nav-heading/);
 assert.match(js,/elem\('div','nav-heading',group.name\)/);
 assert.match(js,/elem\('button','nav-button'\)/);
 assert.match(js,/elem\('span','symbol',icon\)/);
 assert.match(js,/elem\('span','name',label\)/);
 assert.match(html,/id="viewAll"/);
 assert.match(html,/id="viewCompact"/);
 assert.match(html,/src="\/mockup-live.js"/);
 assert.match(html,/href="\/mockup.css"/);
});
test('Styles du menu identiques à la maquette approuvée',()=>{
 const original=css.slice(0,9776);
 let hash=2166136261;
 for(let i=0;i<original.length;i++){
  hash^=original.charCodeAt(i);hash=Math.imul(hash,16777619);
 }
 assert.equal(hash>>>0,3213786281);
 assert.match(original,/\.nav-button\.active/);
});
test('Les données de démonstration ne sont pas dans le site',()=>{
 assert.doesNotMatch(html,/Ville Exemple|12 rue des Ateliers|MAQUETTE HORS SITE|Tous les chiffres.*fictifs/i);
 assert.doesNotMatch(js,/const pages=\{/);
 assert.match(js,/\/api\/indicateurs/);
 assert.match(js,/\/api\/analyse/);
});
test('La recherche d’adresse reste sur la page d’accueil distincte',()=>{
 const home=fs.readFileSync('public/index.html','utf8');
 assert.match(home,/Rechercher une adresse/);
 assert.match(home,/id="address"/);
});
