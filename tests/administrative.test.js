'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {normalize}=require('../administrative-profile');
test('Référentiel géographique : ne publie pas de population nulle ou sans code',()=>{
 assert.equal(normalize({code:'44109',nom:'Nantes',population:null},'commune').population,null);
 assert.equal(normalize({nom:'Nantes',population:123},'commune'),null);
});
test('Référentiel géographique : conserve les identifiants EPCI et région',()=>{
 const obj=normalize({nom:'Commune test',code:'44109',population:123,codeEpci:'244400404',codeDepartement:'44',codeRegion:'52'},'commune');
 assert.equal(obj.code_epci,'244400404');
 assert.equal(obj.code_region,'52');
 assert.equal(obj.population,123);
});
test('Les 27 rubriques et leurs pictogrammes restent indépendants des données',()=>{
 const s=fs.readFileSync('public/market-live.js','utf8');
 const section=s.slice(s.indexOf('const tabs=['),s.indexOf('const populated='));
 assert.equal((section.match(/\{id:'/g)||[]).length,27);
 assert.match(s,/const tabIcons=/);
 assert.match(s,/const pictogram=elem\('span','glyph'/);
 assert.match(s,/tabs\.forEach\(t=>/);
});
test('Les indicateurs sans données n’engendrent aucun tableau',()=>{
 const s=fs.readFileSync('public/market-live.js','utf8');
 assert.match(s,/if\(!rows\?\.length\)return/);
 assert.match(s,/if\(!rows\.length\)return/);
});
