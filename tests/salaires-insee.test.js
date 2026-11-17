'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {salaryItem,sectionFor,csvRows,sharedStrings,xlsxRows,workbookPaths,
 GROUPS}=require('../salaires-insee');
test('BTS INSEE 2022 : 8 catégories source, en salaire horaire avec décimales officielles',()=>{
 const header='CODGEO;SNHM22;SNHMC22;SNHMP22;SNHME22;SNHMO22;SNHM1822;SNHM2622;SNHM5022';
 const text=header+'\n85081;15.42;24.97;15.6;12.58;12.67;10.99;15.4;16.83\n'+
  '85;14.28;25.06;15.48;11.8;12.36;10.9;14.31;15.83\n';
 const values=csvRows(text);
 assert.equal(values.get('85081').SNHM,15.42);
 assert.equal(values.get('85').SNHM18,10.9);
 assert.deepEqual(GROUPS.csp,['SNHMC','SNHMP','SNHME','SNHMO']);
 assert.equal(salaryItem(15.42,13.05).value,2339);
 assert.equal(salaryItem(15.42,13.05).change,18.2);
});
test('BTS 2016 : extraction Excel de cellules partagées et valeurs de salaire numériquement vérifiées',()=>{
 const strings=['CODGEO','SNHM16','SNHMC16','85081'];
 const xml='<worksheet><sheetData>'+
 '<row r="6"><c r="A6" t="s"><v>0</v></c><c r="C6" t="s"><v>1</v></c><c r="D6" t="s"><v>2</v></c></row>'+
 '<row r="7"><c r="A7" t="s"><v>3</v></c><c r="C7"><v>13.05</v></c><c r="D7"><v>23</v></c></row>'+
 '</sheetData></worksheet>';
 const rows=xlsxRows(xml,strings);
 assert.equal(rows.get('85081').SNHM,13.05);
 assert.equal(rows.get('85081').SNHMC,23);
 assert.equal(rows.get('85081').SNHMP,null);
 const result=sectionFor({SNHM:15.42},{SNHM:13.05},'moyen');
 assert.equal(result.rows.length,1);
 assert.equal(result.rows[0].value,2339);
 assert.equal(result.rows[0].change,18.2);
});
test('Secret statistique : les valeurs manquantes ne deviennent pas des zéros',()=>{
 const raw=csvRows('CODGEO;SNHM22;SNHMC22;SNHMP22;SNHME22;SNHMO22;SNHM1822;SNHM2622;SNHM5022\n'+
  '44109;S;14;nd;;0;15;X;16\n');
 const row=raw.get('44109');
 assert.equal(row.SNHM,null);
 assert.equal(row.SNHMO,null);
 assert.equal(row.SNHM26,null);
 assert.deepEqual(salaryItem(null,12),{value:null,change:null,year:2022,referenceYear:2016});
 assert.deepEqual(salaryItem(15,null),{value:2275,change:null,year:2022,referenceYear:2016});
});
test('Structure du classeur source : la feuille EPCI est reliée par son id de relation',()=>{
 const workbook='<workbook><sheets><sheet name="COM" sheetId="1" r:id="rId1"/>'+
 '<sheet name="EPCI" sheetId="6" r:id="rId6"/></sheets></workbook>';
 const rel='<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/>'+
 '<Relationship Id="rId6" Target="worksheets/sheet6.xml"/></Relationships>';
 assert.deepEqual([...workbookPaths(workbook,rel)],[['COM','worksheets/sheet1.xml'],
 ['EPCI','worksheets/sheet6.xml']]);
 assert.deepEqual(sharedStrings('<sst><si><t>CODGEO</t></si><si><t>Pro &amp; Co</t></si></sst>'),
 ['CODGEO','Pro & Co']);
});
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.className='';this.textContent='';
  this.dataset={};this.attrs={};this.style={setProperty(){}}}
 append(...children){this.children.push(...children.filter(Boolean))}
 replaceChildren(...children){this.children=[];this.append(...children)}
 setAttribute(k,v){this.attrs[k]=v}
 addEventListener(){}
}
function findAll(root,cl){
 const out=[];
 (function visit(node){if(String(node.className).split(/\s+/).includes(cl))out.push(node);
  node.children.forEach(visit)})(root);
 return out;
}
test('Salaires nets : trois blocs, une ligne, quatre CSP et trois âges, sans aucun chiffre simulé',()=>{
 const js=fs.readFileSync('public/salaires-reference.js','utf8');
 const context={window:{},document:{createElement(tag){return new Element(tag)}},console,Intl};
 vm.runInNewContext(js,context,{timeout:2500});
 const root=new Element('div');
 const state={loc:{commune:'Dompierre-sur-Yon'},admin:{epci:{nom:'La Roche-sur-Yon Agglomération'},departement:{nom:'Vendée'}}};
 assert.equal(context.window.AtlasSalariesPage.render(root,state),true);
 assert.deepEqual(Array.from(context.window.AtlasSalariesPage.sections),['moyen','csp','age']);
 assert.equal(findAll(root,'atlas-salaire-panel').length,3);
 assert.equal(findAll(root,'atlas-salaire-row').length,8);
 assert.equal(findAll(root,'atlas-salaire-observation').length,24);
 assert.ok(findAll(root,'atlas-salaire-figure').every(x=>x.textContent==='—'));
 assert.ok(findAll(root,'atlas-salaire-trend').every(x=>x.textContent==='—'));
 assert.equal(findAll(root,'atlas-salaire-heading').length,9);
});
test('Les autres trois onglets INSEE sont préservés et toute la route est authentifiée',()=>{
 const html=fs.readFileSync('public/dashboard.html','utf8');
 const nav=fs.readFileSync('public/mockup-live.js','utf8');
 const server=fs.readFileSync('server.js','utf8');
 for(const name of ['population-reference.js','familles-reference.js','emploi-reference.js','salaires-reference.js'])
  assert.match(html,new RegExp('src="/'+name.replace(/\./g,'\\.')+'"'));
 assert.match(nav,/selected\.id==='population'&&window\.AtlasPopulationPage/);
 assert.match(nav,/selected\.id==='familles'&&window\.AtlasFamiliesPage/);
 assert.match(nav,/selected\.id==='emploi'&&window\.AtlasEmploymentPage/);
 assert.match(nav,/selected\.id==='salaires'&&window\.AtlasSalariesPage/);
 assert.ok(server.indexOf('privateAccess.allow(req,res)')<server.indexOf("url.pathname==='/api/salaires-insee'"));
});
