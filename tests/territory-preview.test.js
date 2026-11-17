'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('Aperçu du thème territorial garde le moteur de données et les 21 onglets',()=>{
 const p=fs.readFileSync('public/territory-study-preview.html','utf8');
 assert.match(p,/href="\/mockup\.css"/);
 assert.match(p,/href="\/territory-study-preview\.css"/);
 assert.match(p,/src="\/mockup-live\.js"/);
 assert.match(p,/src="\/atlas-real-panels\.js"/);
 assert.match(p,/21 onglets/);
 assert.match(p,/Ce n’est pas une reproduction vérifiée/);
});
test('Interface publique de production reste indépendante de l’aperçu',()=>{
 const p=fs.readFileSync('public/dashboard.html','utf8');
 assert.doesNotMatch(p,/territory-study-preview\.css/);
 assert.doesNotMatch(p,/APERÇU GRAPHIQUE/);
});
test('Protection du site inclut automatiquement la route d’aperçu',()=>{
 const server=fs.readFileSync('server.js','utf8');
 const a=server.indexOf("if(!privateAccess.allow(req,res))return;");
 const b=server.indexOf("const pathname=url.pathname==='/'");
 assert.ok(a>=0&&b>a);
});
