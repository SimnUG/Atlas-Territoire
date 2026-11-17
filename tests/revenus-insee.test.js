'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {number,csvRecord,profileFromRow,resultFromRow,GROUPS}=require('../revenus-insee');
test('FiLoSoFi 2021 : les déciles de niveau de vie deviennent des revenus mensuels par UC, pas des chiffres fictifs',()=>{
 const csv=[
 'CODGEO;NBMEN21;Q221;PACT21;PPEN21;TME2D321;TME2D421;TME2Q221;TME2D621;TME2D721;TME2D821;TME2D921;TME2PACT21;TME2PPEN21;TYM3Q221;OPR4Q221',
 '85081;1828;24310;81,5;22,9;21560;23300;25270;27500;30110;32990;38620;55,2;46,7;26390;23190',
 '44109;1234;21000;83,4;12,1;S;S;S;S;S;S;S;S;S;S;S'
 ].join('\n');
 const row=csvRecord(csv,'85081');
 assert.equal(row.TME2Q221,25270);
 const actual=resultFromRow(row,'85081');
 assert.equal(actual.median.annual,24310);
 assert.equal(actual.median.monthly,2026);
 assert.equal(actual.profiles.p2.deciles.D3.monthly,2695);
 assert.equal(actual.profiles.p2.deciles['Médiane'].monthly,3159);
 assert.equal(actual.profiles.p2.deciles.D6.monthly,3438);
 assert.equal(actual.profiles.couples.deciles['Médiane'].monthly,3299);
 assert.equal(actual.profiles.retraites.deciles['Médiane'].monthly,2899);
 assert.equal(actual.profiles.p2.composition.activite,55.2);
 assert.equal(actual.profiles.p2.composition.pensions,46.7);
});
test('FiLoSoFi : protection du secret statistique, pas de valeur forcée pour les profils inconnus',()=>{
 assert.equal(number('s'),null);
 assert.equal(number('nd'),null);
 assert.equal(number(''),null);
 assert.equal(number('0'),0);
 assert.equal(number('-15,3'),-15.3);
 const row=csvRecord('CODGEO;Q221;TME2Q221;TME2D321\n44109;22000;s;s','44109');
 assert.equal(row.TME2D321,null);
 const result=resultFromRow(row,'44109');
 assert.equal(result.profiles.p2.deciles.D3.monthly,null);
 assert.equal(result.median.monthly,1833);
});
class Node{
 constructor(tag){this.tagName=tag;this.children=[];this.className='';this.textContent='';
  this.attrs={};this.handlers={};this.style={};this.type='';}
 append(...nodes){for(const child of nodes.filter(Boolean)){child.parentNode=this;this.children.push(child)}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes)}
 setAttribute(name,value){this.attrs[name]=String(value)}
 addEventListener(name,fn){this.handlers[name]=fn}
 click(){if(this.handlers.click)this.handlers.click()}
}
function find(root,cls){
 const ret=[];(function scan(node){
  if(String(node.className).split(/\s+/).includes(cls))ret.push(node);
  for(const c of node.children)scan(c);
 })(root);return ret;
}
function init(){
 const code=fs.readFileSync('public/revenus-reference.js','utf8');
 const context={window:{},document:{createElement:t=>new Node(t)},console,Intl};
 vm.runInNewContext(code,context,{timeout:3000});
 return context.window.AtlasRevenusPage;
}
test('Capture : 2 modes alternables sans retirer financement, composition et revenu médian',()=>{
 const page=init(),root=new Node('div');
 const state={loc:{commune:'Dompierre-sur-Yon'},revenusData:resultFromRow({
  Q221:24310,TME2Q221:25270,TME2D321:21560,TME2D421:23300,TME2PACT21:55.2
 },'85081')};
 assert.equal(page.render(root,state),true);
 assert.equal(find(root,'atlas-rev-context').length,1);
 assert.equal(find(root,'atlas-rev-income-row').length,7);
 assert.equal(find(root,'atlas-rev-finance-tile').length,4);
 assert.equal(find(root,'atlas-rev-summary-row').length,1);
 assert.equal(find(root,'atlas-rev-median-card').length,1);
 assert.equal(find(root,'atlas-rev-composition-row').length,5);
 assert.equal(find(root,'atlas-rev-details').length,2);
 assert.equal(find(root,'atlas-rev-median-row').length,2);
 const decileMode=find(root,'atlas-rev-choice').find(x=>x.textContent.includes('Par décile'));
 assert.ok(decileMode);
 decileMode.click();
 assert.equal(find(root,'atlas-rev-income-row').length,7);
 assert.equal(find(root,'atlas-rev-composition-row').length,5);
 assert.equal(find(root,'atlas-rev-finance-tile').length,4);
 assert.equal(find(root,'atlas-rev-median-card').length,1);
 assert.equal(find(root,'atlas-rev-subselector').length,1);
 const monthly=find(root,'atlas-rev-income-row')[1];
 assert.ok(find(monthly,'atlas-rev-amount').some(x=>x.textContent==='3 159 €'||x.textContent==='3 159 €'));
 const graphBtn=find(root,'atlas-pop-viewbutton').find(x=>x.textContent.includes('Graphique'));
 graphBtn.click();
 assert.equal(find(root,'atlas-rev-median-bars').length,2);
 assert.equal(find(root,'atlas-rev-summary-row').length,1);
});
test('Le site conserve les onglets existants et protège l’endpoint avec l’accès privé',()=>{
 const nav=fs.readFileSync('public/mockup-live.js','utf8');
 const server=fs.readFileSync('server.js','utf8');
 const html=fs.readFileSync('public/dashboard.html','utf8');
 assert.match(nav,/selected\.id==='population'&&window\.AtlasPopulationPage/);
 assert.match(nav,/selected\.id==='familles'&&window\.AtlasFamiliesPage/);
 assert.match(nav,/selected\.id==='emploi'&&window\.AtlasEmploymentPage/);
 assert.match(nav,/selected\.id==='salaires'&&window\.AtlasSalariesPage/);
 assert.match(nav,/selected\.id==='revenus'&&window\.AtlasRevenusPage/);
 assert.match(html,/src="\/revenus-reference\.js"/);
 assert.match(html,/href="\/revenus-reference\.css"/);
 assert.ok(server.indexOf('privateAccess.allow(req,res)')<server.indexOf("url.pathname==='/api/revenus-insee'"));
 const navGroup=nav.slice(nav.indexOf('const groups=['),nav.indexOf('\n];',nav.indexOf('const groups=[')));
 assert.equal((navGroup.match(/\['[^']+','[^']+','[^']+'\]/g)||[]).length,21);
});
