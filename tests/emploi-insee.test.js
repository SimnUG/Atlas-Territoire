'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {rowsFrom,get,section,concentration,entry}=require('../emploi-insee');
const geo='2026-COM-85081';
function obs(year,dim,n){
 return {dimensions:{GEO:geo,TIME_PERIOD:String(year),...dim},
  measures:{OBS_VALUE_NIVEAU:{value:n}},attributes:{OBS_STATUS:'A'}};
}
const lr={SEX:'_T',EDUC:'_T',RP_MEASURE:'POP'};
const lt={SEX:'_T',EMPFORM:'_T',WKTIME:'_T',RP_MEASURE:'NBEMP',EMPSTA_ENQ:'1',AGE:'Y_GE15'};
function residenceFixture(){
 const values=[
  [2023,'Y15T64','_T',2976.39505],[2023,'Y15T64','1',2218.77077],
  [2023,'Y15T64','2',118.80146],[2023,'Y15T64','3',638.82282],
  [2023,'Y15T64','31',279.09945],[2023,'Y15T64','33',250.86701],
  [2023,'Y15T64','35T36',108.85637],
  [2023,'Y15T24','2',33.37232],[2023,'Y25T54','2',71.07666],
  [2023,'Y55T64','2',14.35248],
  [2017,'Y15T64','1',2051.22299],[2017,'Y15T64','2',177.86729],
  [2017,'Y15T64','3',570.11766],[2017,'Y15T64','31',266.61312],
  [2017,'Y15T64','33',219.64724],[2017,'Y15T64','35T36',83.8573],
  [2017,'Y15T24','2',41.91708],[2017,'Y25T54','2',117.56662],
  [2017,'Y55T64','2',18.38358],
  [2012,'Y_GE15','1',2054.50608],
  [2017,'Y_GE15','1',2058.42507],
  [2023,'Y_GE15','1',2233.03601]
 ];
 return rowsFrom({observations:values.map(([y,age,key,n])=>obs(y,{...lr,AGE:age,EMPSTA_ENQ:key},n))},
  'COM-85081');
}
test('Activité 2023 : les 3 lignes correspondent aux effectifs officiels des captures',()=>{
 const data=section(residenceFixture(),'activite');
 assert.deepEqual(data.rows.map(x=>x.value),[2219,119,639]);
 assert.deepEqual(data.rows.map(x=>x.share),[74.5,4,21.5]);
 assert.equal(data.rows[0].change,8.2);
 assert.ok(data.rows[1].change<0);
});
test('Chômage 2023 : âge 15-24, 25-54, 55-64 avec bon dénominateur',()=>{
 const data=section(residenceFixture(),'chomage');
 assert.deepEqual(data.rows.map(x=>x.value),[33,71,14]);
 assert.deepEqual(data.rows.map(x=>x.share),[28.1,59.8,12.1]);
 assert.ok(data.rows.every(x=>x.change<0));
});
test('Inactifs 2023 : retraités 31, élèves 33, autres inactifs 35T36',()=>{
 const data=section(residenceFixture(),'inactifs');
 assert.deepEqual(data.rows.map(x=>x.value),[279,251,109]);
 assert.deepEqual(data.rows.map(x=>x.share),[43.7,39.3,17]);
});
test('Concentration d’emploi : emplois au travail divisés par actifs occupés résidants (15+)',()=>{
 const residents=residenceFixture();
 const workplaces=rowsFrom({observations:[
  obs(2012,lt,1452.95817),obs(2017,lt,1580.67848),obs(2023,lt,2013.79705)
 ]},'COM-85081');
 const result=concentration(residents,workplaces);
 assert.equal(result[2012].value,70.7);
 assert.equal(result[2017].value,76.8);
 assert.equal(result[2023].value,90.2);
 assert.equal(result[2017].change,6.1);
 assert.equal(result[2023].change,13.4);
});
test('Melodi : aucune valeur fictive, doublon, mauvaise zone ou pagination',()=>{
 const bad=rowsFrom({observations:[
  obs(2023,{...lr,AGE:'Y15T64',EMPSTA_ENQ:'1'},0),
  {...obs(2023,{...lr,AGE:'Y15T64',EMPSTA_ENQ:'1'},15),
    dimensions:{GEO:'2026-COM-44109',TIME_PERIOD:'2023',...lr,AGE:'Y15T64',EMPSTA_ENQ:'1'}},
  {...obs(2023,{...lr,AGE:'Y15T64',EMPSTA_ENQ:'2'},22),attributes:{OBS_STATUS:'M'}}
 ]},'COM-85081');
 assert.equal(bad.length,1);
 assert.equal(get(bad,2023,{...lr,AGE:'Y15T64',EMPSTA_ENQ:'1'}),0);
 assert.deepEqual(entry(null,null,null),{value:null,share:null,change:null});
 assert.throws(()=>rowsFrom({observations:[],paging:{next:'url'}},'COM-85081'),/Pagination/);
});
class Node{
 constructor(name){this.tagName=name;this.children=[];this.className='';this.textContent='';this.attrs={};
 this.dataset={};this.style={setProperty(){}}}
 append(...items){this.children.push(...items.filter(Boolean))}
 replaceChildren(...items){this.children=[];this.append(...items)}
 setAttribute(k,v){this.attrs[k]=String(v)}
 addEventListener(){}
}
const byClass=(root,name)=>{
 let n=0;
 (function walk(el){if(String(el.className).split(/\s+/).includes(name))n++;el.children.forEach(walk)})(root);
 return n;
};
test('Interface exactement en 4 blocs, avec 3 années, 9 lignes et 9 références France même vides',()=>{
 const src=fs.readFileSync('public/emploi-reference.js','utf8');
 const context={window:{},document:{createElement(name){return new Node(name)}},Intl,console};
 vm.runInNewContext(src,context,{timeout:3000});
 const root=new Node('main');
 const obj={admin:{epci:{nom:'CA La Roche-sur-Yon Agglomération'}},loc:{commune:'Dompierre-sur-Yon'}};
 assert.equal(context.window.AtlasEmploymentPage.render(root,obj),true);
 assert.deepEqual(Array.from(context.window.AtlasEmploymentPage.sections),['concentration','activite','chomage','inactifs']);
 assert.equal(root.children.length,6);
 assert.equal(root.children[0].className,'atlas-pop-viewstrip');
 assert.deepEqual(root.children.slice(1,5).map(n=>n.dataset.employmentSection),
  ['concentration','activite','chomage','inactifs']);
 assert.equal(byClass(root,'atlas-pop-matrix-row'),12);
 assert.equal(byClass(root,'atlas-pop-indicator'),18);
 assert.equal(byClass(root,'atlas-pop-national-cell'),9);
 assert.equal(byClass(root,'atlas-emploi-concentration-value'),6);
});
test('Le site reste privé et Population / Familles conservent leurs composants',()=>{
 const s=fs.readFileSync('server.js','utf8'),nav=fs.readFileSync('public/mockup-live.js','utf8');
 const html=fs.readFileSync('public/dashboard.html','utf8');
 assert.ok(s.indexOf('privateAccess.allow(req,res)')<s.indexOf("url.pathname==='/api/emploi-insee'"));
 assert.match(nav,/selected\.id==='population'&&window\.AtlasPopulationPage/);
 assert.match(nav,/selected\.id==='familles'&&window\.AtlasFamiliesPage/);
 assert.match(nav,/selected\.id==='emploi'&&window\.AtlasEmploymentPage/);
 assert.match(html,/src="\/emploi-reference\.js"/);
 assert.match(html,/href="\/emploi-reference\.css"/);
 const navGroup=nav.slice(nav.indexOf('const groups=['),nav.indexOf('\n];',nav.indexOf('const groups=[')));
 assert.equal((navGroup.match(/\['[^']+','[^']+','[^']+'\]/g)||[]).length,21);
});
