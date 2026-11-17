'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {rowsFrom,one,point,getSection,LABELS}=require('../familles-insee');
const geo='2026-COM-85081';
function obs(year,dimensions,v){
 return {dimensions:{GEO:geo,TIME_PERIOD:String(year),...dimensions},
  measures:{OBS_VALUE_NIVEAU:{value:v}},attributes:{OBS_STATUS:'A'}};
}
test('Melodi RP 2023 : la composition des ménages reprend les 3 postes non chevauchants',()=>{
 const dims={RP_MEASURE:'DWELLINGS',OCS:'DW_MAIN',PCS:'_T'};
 const raw=[obs(2023,{...dims,TPH:'2'},1466.90596),
  obs(2023,{...dims,TPH:'11'},422.0017),
  obs(2023,{...dims,TPH:'12'},5.48047),
  obs(2023,{...dims,TPH:'_T'},1894.38813),
  obs(2017,{...dims,TPH:'2'},1284.17919),
  obs(2017,{...dims,TPH:'11'},321.73458),
  obs(2017,{...dims,TPH:'12'},35.69715)];
 const rows=rowsFrom({observations:raw},'COM-85081');
 const o=getSection(rows,'menages');
 assert.deepEqual(o.rows.map(x=>x.value),[1467,422,5]);
 assert.deepEqual(o.rows.map(x=>x.share),[77.4,22.3,0.3]);
 assert.equal(o.rows[0].change,14.2);
 assert.equal(o.denominator,1894);
});
test('Familles : couples sans / avec enfant et familles monoparentales',()=>{
 const d={RP_MEASURE:'NBFAM',NCH:'_T'};
 const base=[obs(2023,{...d,TFN:'21'},739.65022),
  obs(2023,{...d,TFN:'22'},652.23785),
  obs(2023,{...d,TFN:'1'},75.01789),
  obs(2023,{...d,TFN:'_T'},1466.90596),
  obs(2017,{...d,TFN:'21'},556.83241),
  obs(2017,{...d,TFN:'22'},626.05812),
  obs(2017,{...d,TFN:'1'},101.28865)];
 const table=getSection(rowsFrom({observations:base},'COM-85081'),'familles');
 assert.deepEqual(table.rows.map(r=>r.value),[740,652,75]);
 assert.deepEqual(table.rows.map(r=>r.share),[50.4,44.5,5.1]);
 assert.ok(table.rows[2].change<0);
});
test('Familles avec enfants de moins de 25 ans : aucun enfant à 4 et plus',()=>{
 const keys=LABELS.enfants;
 const d={RP_MEASURE:'NBFAM',TFN:'_T'};
 const counts=[761.14493,253.66468,355.7499,77.82956,18.51689];
 const rows=rowsFrom({observations:[
  ...keys.map((key,i)=>obs(2023,{...d,NCH:key},counts[i])),
  obs(2023,{...d,NCH:'_T'},1466.90596)
 ]},'COM-85081');
 const t=getSection(rows,'enfants');
 assert.deepEqual(t.rows.map(r=>r.value),[761,254,356,78,19]);
 assert.deepEqual(t.rows.map(r=>r.share),[51.9,17.3,24.3,5.3,1.3]);
});
test('Des cellules restent vides si observation absente, doublonnée, censurée ou pagination incomplète',()=>{
 assert.deepEqual(point(null,null,null),{value:null,share:null,change:null});
 const rows=rowsFrom({observations:[
  obs(2023,{RP_MEASURE:'NBFAM',NCH:'_T',TFN:'21'},2),
  obs(2023,{RP_MEASURE:'NBFAM',NCH:'_T',TFN:'21'},3),
  {...obs(2023,{RP_MEASURE:'NBFAM',NCH:'_T',TFN:'22'},10),attributes:{OBS_STATUS:'M'}}
 ]},'COM-85081');
 assert.equal(one(rows,2023,{RP_MEASURE:'NBFAM',NCH:'_T',TFN:'21'}),null);
 assert.equal(one(rows,2023,{RP_MEASURE:'NBFAM',NCH:'_T',TFN:'22'}),null);
 assert.throws(()=>rowsFrom({observations:[],paging:{next:'url'}},'COM-85081'),/Pagination/);
});
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.className='';this.textContent='';
  this.attrs={};this.dataset={};this.style={setProperty(){}}}
 append(...args){this.children.push(...args.filter(Boolean))}
 replaceChildren(...args){this.children=[];this.append(...args)}
 setAttribute(name,val){this.attrs[name]=String(val)}
 addEventListener(){}
}
function find(root,cls){
 let count=0;
 const visit=n=>{if(String(n.className).split(/\s+/).includes(cls))count++;n.children.forEach(visit)};
 visit(root);return count;
}
test('Exactement 3 tableaux ordonnés : 3 + 3 + 5 lignes, colonnes et références France',()=>{
 const source=fs.readFileSync('public/familles-reference.js','utf8');
 const context={window:{},document:{createElement(tag){return new Element(tag)}},Intl,console};
 vm.runInNewContext(source,context,{timeout:3000});
 const root=new Element('main');
 assert.equal(context.window.AtlasFamiliesPage.render(root,{loc:{},admin:null}),true);
 assert.equal(root.children.length,5);
 assert.equal(root.children[0].className,'atlas-pop-viewstrip');
 assert.deepEqual(Array.from(context.window.AtlasFamiliesPage.sections),['menages','familles','enfants']);
 assert.deepEqual(root.children.slice(1,4).map(x=>x.dataset.familiesSection),['menages','familles','enfants']);
 assert.equal(find(root,'atlas-pop-matrix-row'),11);
 assert.equal(find(root,'atlas-pop-indicator'),22);
 assert.equal(find(root,'atlas-pop-national-cell'),11);
 assert.equal(find(root,'atlas-pop-national-header'),3);
 assert.equal(find(root,'atlas-pop-methodology'),1);
});
test('Population : composants d’origine intacts, seule la nouvelle page est branchée',()=>{
 const nav=fs.readFileSync('public/mockup-live.js','utf8');
 assert.match(nav,/selected\.id==='population'&&window\.AtlasPopulationPage/);
 assert.match(nav,/selected\.id==='familles'&&window\.AtlasFamiliesPage/);
 assert.match(nav,/if\(id==='population'\)ensurePopulation/);
 assert.match(nav,/if\(id==='familles'\)ensureFamilies/);
 const html=fs.readFileSync('public/dashboard.html','utf8');
 assert.match(html,/src="\/population-reference\.js"/);
 assert.match(html,/src="\/familles-reference\.js"/);
 const server=fs.readFileSync('server.js','utf8');
 assert.match(server,/if\(url\.pathname==='\/api\/familles-insee'\)/);
 assert.ok(server.indexOf('privateAccess.allow(req,res)')<server.indexOf("url.pathname==='/api/familles-insee'"));
});
