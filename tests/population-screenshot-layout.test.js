'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const popSrc=fs.readFileSync('public/population-reference.js','utf8');
const css=fs.readFileSync('public/population-reference.css','utf8');
const live=fs.readFileSync('public/mockup-live.js','utf8');
class Element{
 constructor(tag){
  this.tagName=tag;this.children=[];this.className='';this.textContent='';
  this.attrs={};this.dataset={};this.style={setProperty(){}};
 }
 append(...elements){this.children.push(...elements.filter(Boolean))}
 replaceChildren(...elements){this.children=[];this.append(...elements)}
 setAttribute(key,value){this.attrs[key]=String(value)}
 addEventListener(){}
}
function setup(){
 const context={window:{},document:{
  createElement:tag=>new Element(tag),
  createElementNS:(ns,tag)=>new Element(tag)
 },console};
 vm.runInNewContext(popSrc,context,{timeout:2500});
 return context.window.AtlasPopulationPage;
}
function walk(node,fn){
 fn(node);
 for(const c of node.children)walk(c,fn);
}
function byClass(root,className){
 const found=[];walk(root,n=>{if((n.className||'').split(/\s+/).includes(className))found.push(n)});
 return found;
}
const blank={loc:{},admin:null,analysis:null};
test('Population : ordre exact des quatre blocs des captures et matrice complète même sans chiffres',()=>{
 const root=new Element('div'),page=setup();
 assert.equal(page.render(root,blank),true);
 assert.deepEqual(Array.from(page.sections),['ages','csp','origines']);
 assert.equal(root.children.length,6);
 assert.equal(root.children[0].className,'atlas-pop-viewstrip');
 assert.equal(root.children[1].className,'atlas-pop-overview');
 assert.equal(root.children[2].dataset.populationSection,'ages');
 assert.equal(root.children[3].dataset.populationSection,'csp');
 assert.equal(root.children[4].dataset.populationSection,'origines');
 assert.equal(root.children[5].className,'atlas-pop-methodology');
 assert.equal(byClass(root,'atlas-pop-chartcard').length,2);
 assert.equal(byClass(root,'atlas-pop-lineplot').length,2);
 assert.equal(byClass(root,'atlas-pop-matrix-row').length,7+8+3);
 assert.equal(byClass(root,'atlas-pop-national-cell').length,7+8+3);
 assert.equal(byClass(root,'atlas-pop-indicator').length,(7+8+3)*2);
});
test('Population : la matrice reste identique et sans résultats numériques fictifs',()=>{
 const root=new Element('div');setup().render(root,blank);
 const values=byClass(root,'atlas-pop-stat'),percent=byClass(root,'atlas-pop-share');
 assert.ok(values.every(v=>v.textContent==='—'));
 assert.ok(percent.every(v=>v.textContent==='—'));
 assert.equal(byClass(root,'atlas-pop-fill').length,(7+8+3)*2);
 assert.ok(byClass(root,'atlas-pop-national-value').every(v=>v.textContent==='—'));
 assert.ok(!popSrc.includes('Dompierre-sur-Yon')&&!popSrc.includes('La Roche-sur-Yon'));
});
test('Population : deux territoires se personnalisent selon l’adresse sans données de recensement',()=>{
 const root=new Element('div');setup().render(root,{loc:{commune:'Ville test'},admin:{epci:{nom:'Intercommunalité test'}}});
 const titles=byClass(root,'atlas-pop-charttitle').map(x=>x.textContent);
 assert.deepEqual(titles,['Intercommunalité test','Ville test']);
 assert.ok(byClass(root,'atlas-pop-locality').some(x=>x.textContent==='Ville test'));
});
test('Population : seuls ses styles et son composant sont utilisés, la navigation reste à 21 onglets',()=>{
 assert.match(css,/\.app\.atlas-population-active/);
 assert.match(live,/selected\.id==='population'&&window\.AtlasPopulationPage/);
 assert.match(live,/selected\.id!=='population'/);
 for(const path of ['public/dashboard.html','public/territory-study-preview.html']){
  const html=fs.readFileSync(path,'utf8');
  assert.match(html,/href="\/population-reference\.css"/);
  assert.match(html,/src="\/population-reference\.js"/);
  assert.match(html,/21 onglets/);
 }
 const navSection=live.slice(live.indexOf('const groups=['),live.indexOf('\n];',live.indexOf('const groups=[')));
 assert.equal((navSection.match(/\['[^']+','[^']+','[^']+'\]/g)||[]).length,21);
});
