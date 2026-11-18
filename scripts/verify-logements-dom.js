'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const zlib=require('node:zlib');
const {JSDOM}=require('jsdom');

const dom=new JSDOM('<!doctype html><html lang="fr"><head></head><body><div id="main"></div></body></html>',{
 url:'https://atlas-territoires-simnug.onrender.com/dashboard.html?onglet=logements',runScripts:'outside-only'
});
dom.window.eval(fs.readFileSync('public/logements-reference.js','utf8'));
const source=JSON.parse(zlib.gunzipSync(fs.readFileSync('public/data/logements-44-85-2023.json.gz')).toString('utf8'));
assert.equal(source.schema,'ATLAS-RP-LOGEMENT-2023-44-85-v1');
const refs=source.communes;
assert.equal(Object.keys(refs).length,460);

const main=dom.window.document.getElementById('main');
function validate(code){
 const d=refs[code];assert.ok(d,code+' absent');
 const state={loc:{code_insee:code,commune:d.commune.nom},admin:{epci:{code:d.epci.code,nom:d.epci.nom}},logementsReference:d};
 main.className='';
 assert.equal(dom.window.AtlasLogementsPage.render(main,state),true,code);
 assert.equal(main.querySelectorAll('.lg-section-header').length,4,code);
 assert.equal(main.querySelectorAll('.lg-history-pair').length,4,code);
 assert.equal(main.querySelectorAll('.lg-graph-card').length,8,code);
 assert.equal(main.querySelectorAll('.lg-comparison-card').length,5,code);
 assert.equal(main.querySelectorAll('.lg-table-row').length,20,code);
 assert.equal(main.querySelectorAll('.lg-france').length,5,code);
 assert.equal(main.querySelectorAll('.lg-table-grid').length,5,code);
 assert.equal(main.querySelectorAll('.lg-mode').length,2,code);
 if(!['85165','85212'].includes(code)){
  assert.equal(main.querySelectorAll('.lg-linechart').length,8,code+' graphes');
  assert.equal(main.querySelectorAll('.lg-chart-unavailable').length,0,code+' placeholders');
 }
 assert.ok(main.textContent.includes(d.commune.nom));
 const mat=main.querySelectorAll('button.lg-mode');
 mat[1].click();
 assert.equal(main.querySelectorAll('.lg-comparison-card').length,5,code+' graphique mode');
 assert.equal(main.querySelectorAll('.lg-compare-chart').length,5,code+' graphiques comparatifs');
 mat[0].click();
 assert.equal(main.querySelectorAll('.lg-table-grid').length,5,code+' retour matrice');
 return d;
}
const sample=['85081','85191','85113','85165','85212','44109','44194','44190','44055','44003','85234','44020'];
for(const code of sample)validate(code);
for(const [code,d] of Object.entries(refs)){
 assert.equal(d.historique.total.commune.length,9,code);
 assert.equal(d.historique.total.epci.length,9,code);
 assert.equal(d.tableaux.length,5,code);
 assert.equal(d.tableaux.reduce((sum,t)=>sum+t.lignes.length,0),20,code);
 assert.equal(d.commune.code,code,code);
}
const state={loc:{code_insee:'44001',commune:'Aigrefeuille-sur-Maine'},admin:null,logementsReference:null,logementsError:null};
main.className='';
assert.equal(dom.window.AtlasLogementsPage.render(main,state),true);
assert.equal(main.querySelectorAll('.lg-comparison-card').length,5,'skeleton matrices');
assert.equal(main.querySelectorAll('.lg-graph-card').length,8,'skeleton graphs');
assert.equal(main.querySelectorAll('.lg-chart-unavailable').length,8,'skeleton no invented charts');
assert.ok(main.textContent.includes('Chargement du recensement'));
state.logementsError='INSEE indisponible';
assert.equal(dom.window.AtlasLogementsPage.render(main,state),true);
assert.equal(main.querySelectorAll('.lg-comparison-card').length,5,'error matrices');
assert.ok(main.textContent.includes('INSEE indisponible'));
console.log('LOGEMENTS DOM OK — 460 profils INSEE; Nantes, Rezé, Nantes Métropole, Vendée, Île-d’Yeu et communes fusionnées; 4 graphiques doubles + 5 matrices toujours présentes; deux vues; pas de zéros inventés');
