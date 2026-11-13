'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {findKey,schoolCategory}=require('../official-extras');
const code=fs.readFileSync('public/atlas-real-panels.js','utf8');
const html=fs.readFileSync('public/dashboard.html','utf8');
test('Zonage ABC : colonnage officiel identifié sans inventer de classement',()=>{
 const columns=['Code Insee Commune','Classement 2026','Libellé commune'];
 assert.equal(findKey(columns,[/^codeinsee/]),columns[0]);
 assert.equal(findKey(columns,[/^classement/]),columns[1]);
 assert.equal(findKey(columns,[/^zonageabc$/]),null);
});
test('Annuaire de l’Éducation nationale : typologies scolaires reconnues',()=>{
 assert.equal(schoolCategory('École maternelle'),'Maternelle');
 assert.equal(schoolCategory('Collège'),'Collège');
 assert.equal(schoolCategory('Lycée général et technologique'),'Lycée');
});
test('Maquette : panneaux réels avec cartes, diagrammes et tableaux',()=>{
 assert.match(code,/class='insight'|text\('section','insight'\)/);
 assert.match(code,/text\('div','kpis'\)/);
 assert.match(code,/text\('div','panel-grid'\)/);
 assert.match(code,/text\('div','barrow'\)/);
 assert.match(code,/createElementNS\(svgNS,'svg'\)/);
 assert.match(code,/openstreetmap\.org\/export\/embed\.html/);
 assert.match(code,/function tablePanel/);
 assert.match(html,/src="\/atlas-real-panels\.js"/);
 assert.match(html,/src="\/mockup-live\.js"/);
});
test('Conserver les 27 onglets sans réimporter les données fictives',()=>{
 const mockup=fs.readFileSync('public/mockup-live.js','utf8');
 assert.equal((mockup.slice(mockup.indexOf('const groups=['),mockup.indexOf('const groups=[')+1700).match(/\['[^']+','[^']+','[^']+'\]/g)||[]).length,27);
 assert.doesNotMatch(code,/Ville Exemple|12 rue des Ateliers|Tous les chiffres.*fictifs/i);
 assert.match(code,/function render\(root,id,state\)/);
});
