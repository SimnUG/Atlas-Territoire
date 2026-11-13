'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('public/dashboard.html','utf8');
const mock=fs.readFileSync('public/mockup-layout-data.js','utf8');
const renderer=fs.readFileSync('public/atlas-real-panels.js','utf8');
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.className='';this.style={};this.textContent='';this.attrs={};}
 append(...items){for(const item of items){if(item!==null&&item!==undefined)this.children.push(item)}}
 replaceChildren(...items){this.children=[];this.append(...items)}
 setAttribute(name,value){this.attrs[name]=String(value)}
}
const context={window:{},document:{
 createElement:tag=>new Element(tag),
 createElementNS:(ns,tag)=>new Element(tag)
},URL,URLSearchParams,console};
vm.createContext(context);
vm.runInContext(mock,context,{timeout:1500});
vm.runInContext(renderer,context,{timeout:1500});
const templates=context.window.AtlasMockupLayout;
const draw=context.window.AtlasPanels?.render;
function blank(){
 return {loc:{},admin:null,analysis:{categories:{},indicateurs:[],dpe:{enregistrements:[]},dvf:{transactions:[],exhaustif:false},sitadel:{permis:[]}},
 housing:null,rent:null,planning:null,risk:null,extras:null};
}
test('Les 21 écrans gardent le nombre exact de KPI et de panneaux de la maquette, sans chiffres',()=>{
 assert.equal(Object.keys(templates).length,21);
 for(const [id,t] of Object.entries(templates)){
  const root=new Element('div');
  assert.equal(draw(root,id,blank()),true,'Onglet non rendu : '+id);
  assert.equal(root.children[0].className,'kpis','KPI '+id);
  assert.equal(root.children[0].children.length,t.kpis.length,'Nombre de KPI '+id);
  assert.equal(root.children[1].className,'panel-grid','Disposition des graphiques '+id);
  assert.equal(root.children[1].children.length,2,'Deux panneaux comme maquette '+id);
  const extra=Number(Boolean(t.bar2&&(t.series||t.map)));
  const table=Number(Boolean(t.table));
  assert.equal(root.children.length,2+extra+table+Number(t.insight)+1,'Structure complète de '+id);
  assert.equal(root.children.at(-1).className,'source-line',id);
  if(t.table){
   const element=root.children.find(x=>x.tagName==='section'&&x.children.some(c=>c.className==='tablewrap'));
   assert.ok(element,'Tableau manquant '+id);
   const tableNode=element.children.find(x=>x.className==='tablewrap').children[0];
   assert.equal(tableNode.children[1].children.length,t.table.labels.length,'Nombre de lignes '+id);
  }
 }
});
test('Les KPI sans statistiques affichent un tiret plutôt qu’un chiffre fictif',()=>{
 const root=new Element('div');
 draw(root,'population',blank());
 for(const item of root.children[0].children)
  assert.equal(item.children[1].textContent,'—');
});
test('La maquette et les scripts sont chargés dans le bon ordre',()=>{
 const a=html.indexOf('src="/mockup-layout-data.js"');
 const b=html.indexOf('src="/atlas-real-panels.js"');
 const c=html.indexOf('src="/mockup-live.js"');
 assert.ok(a>=0&&b>a&&c>b);
});
test('Aucun lien de navigation ne dépend de la présence des chiffres',()=>{
 const nav=fs.readFileSync('public/mockup-live.js','utf8');
 assert.match(nav,/groups\.flatMap/);
 assert.match(nav,/for\(const \[id,icon,label\] of group\.items\)/);
});
