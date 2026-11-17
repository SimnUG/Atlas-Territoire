'use strict';
/* Page « Familles et ménages ». Mise en page reprise des 3 captures approuvées.
 * Réutilise exclusivement les classes CSS déjà utilisées pour « Population »
 * sans modifier le fichier, la structure ni les données de cette dernière.
 * Des tirets sont conservés en l'absence d'observations INSEE validées.
 */
(function(){
const SECTIONS=[
 {key:'menages',title:'Ménages en fonction de leur composition',
  labels:['Avec famille','1 personne','Autres sans famille'],referenceYear:2023},
 {key:'familles',title:'Familles en fonction de leur composition',
  labels:['Couples sans enfant','Couples avec enfant','Familles monoparentales'],referenceYear:2023},
 {key:'enfants',title:'Familles en fonction du nombre d’enfants de moins de 25 ans',
  labels:['0 enfant','1 enfant','2 enfants','3 enfants','4 enfants et plus'],referenceYear:2023}
];
const DESCR='Comparaison entre les différentes échelles de territoire — Effectif, part (%) et évolution';
const number=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
const percentage=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1,minimumFractionDigits:1});
const elem=(tag,cls,value)=>{
 const a=document.createElement(tag);
 if(cls)a.className=cls;
 if(value!==undefined&&value!==null)a.textContent=String(value);
 return a;
};
const valid=x=>typeof x==='number'&&Number.isFinite(x);
const percent=x=>valid(x)?percentage.format(x)+' %':'—';
const signed=x=>valid(x)?(x>0?'+':'')+percent(x):'—';
const territory=(s,type)=>{
 const name=type==='epci'?s?.admin?.epci?.nom:s?.loc?.commune||s?.admin?.commune?.nom;
 return typeof name==='string'&&name.trim()?name.trim():(type==='epci'?'INTERCOMMUNALITÉ':'COMMUNE');
};
const tableData=(s,key)=>s?.familiesData?.sections?.[key]||{};
let displayMode='matrice';
function controls(refresh){
 const strip=elem('div','atlas-pop-viewstrip'),right=elem('div','atlas-pop-viewcontrols');
 right.append(elem('span','atlas-pop-view-label','VUE'));
 for(const [mode,symbol,name] of [['matrice','▦','Matrice'],['graphique','▥','Graphique']]){
  const button=elem('button','atlas-pop-viewbutton'+(displayMode===mode?' is-active':''),symbol+'  '+name);
  button.type='button';button.setAttribute('aria-pressed',String(displayMode===mode));
  button.addEventListener('click',()=>{
   if(displayMode===mode)return;
   displayMode=mode;refresh();
  });
  right.append(button);
 }
 strip.append(right);return strip;
}
function header(s){
 const row=elem('div','atlas-pop-matrix-heading');
 row.append(elem('div','atlas-pop-matrix-empty'));
 const epci=elem('div','atlas-pop-col-label');
 epci.append(elem('span','atlas-pop-small-icon','◉'),
  elem('span',null,territory(s,'epci').toUpperCase()));
 row.append(epci);
 const commune=elem('div','atlas-pop-col-label');
 commune.append(elem('span','atlas-pop-small-icon','▥'),elem('span',null,'COMMUNE'));
 commune.append(elem('small','atlas-pop-locality',territory(s,'commune')));
 row.append(commune);
 return row;
}
function indicator(item,max,color){
 const box=elem('div','atlas-pop-indicator'),stat=elem('div','atlas-pop-statline');
 const value=valid(item?.value)?item.value:null;
 stat.append(elem('strong','atlas-pop-stat',value===null?'—':number.format(value)));
 const delta=valid(item?.change)?item.change:null;
 stat.append(elem('span','atlas-pop-change'+(delta===null?'':delta>=0?' atlas-pop-up':' atlas-pop-down'),signed(delta)));
 stat.append(elem('span','atlas-pop-share',percent(item?.share)));
 box.append(stat);
 const bar=elem('div','atlas-pop-track'),fill=elem('div','atlas-pop-fill '+color);
 const width=valid(item?.share)&&max>0?Math.min(100,Math.max(0,item.share/max*100)):0;
 fill.style.width=width+'%';
 bar.append(fill);box.append(bar);return box;
}
function reference(descriptor,data){
 const wrap=elem('div','atlas-pop-national'),title=elem('div','atlas-pop-national-header');
 const year=data?.france?.year||descriptor.referenceYear;
 title.append(elem('strong',null,'RÉFÉRENCE FRANCE — RP '+year),
  elem('span',null,'part de l’ensemble en %'));
 wrap.append(title);
 const grid=elem('div','atlas-pop-national-grid');
 grid.style.setProperty('--atlas-france-cols',String(descriptor.labels.length));
 descriptor.labels.forEach((label,index)=>{
  const cell=elem('div','atlas-pop-national-cell');
  cell.append(elem('span','atlas-pop-national-label',label),
   elem('strong','atlas-pop-national-value',percent(data?.france?.rows?.[index]?.share)));
  grid.append(cell);
 });
 wrap.append(grid);return wrap;
}
function footer(s,key,data){
 const root=elem('div','atlas-pop-matrix-footer'),left=elem('div'),right=elem('div','atlas-pop-dynamics');
 const year=data?.commune?.year||2023;
 const previous=data?.commune?.previousYear||2017;
 left.append(elem('strong',null,'Sources : Insee'));
 left.append(elem('span',null,'EPCI / COM / ARR : RP '+year));
 left.append(elem('span',null,'Quartier : RP 2023 (si disponible)'));
 right.append(elem('strong',null,'Dynamique :'));
 right.append(elem('span',null,'EPCI / COM / ARR : '+year+' / '+previous));
 right.append(elem('span',null,'Quartier : 2023 / 2017'));
 root.append(left,right);return root;
}
function matrix(s,descriptor){
 const data=tableData(s,descriptor.key);
 const card=elem('section','atlas-pop-matrix');
 card.dataset.familiesSection=descriptor.key;
 const head=elem('div','atlas-pop-matrix-top'),left=elem('div');
 left.append(elem('h2','atlas-pop-section-title',descriptor.title),
  elem('p','atlas-pop-section-subtitle',DESCR));
 head.append(left);
 const exportHint=elem('span','atlas-pop-excel','X');
 exportHint.title='Repère visuel de la maquette';
 exportHint.setAttribute('aria-hidden','true');
 head.append(exportHint);
 card.append(head);
 const scroller=elem('div','atlas-pop-matrix-scroll'),table=elem('div','atlas-pop-matrix-data'+
  (displayMode==='graphique'?' atlas-pop-graph-mode':''));
 table.append(header(s));
 const maxima={};
 for(const key of ['epci','commune']){
  maxima[key]=Math.max(0,...(data[key]?.rows||[]).map(x=>valid(x?.share)?x.share:0));
 }
 descriptor.labels.forEach((name,index)=>{
  const row=elem('div','atlas-pop-matrix-row');
  row.append(elem('div','atlas-pop-rowtitle',name));
  row.append(indicator(data?.epci?.rows?.[index],maxima.epci,'atlas-pop-epci-fill'));
  row.append(indicator(data?.commune?.rows?.[index],maxima.commune,'atlas-pop-commune-fill'));
  table.append(row);
 });
 scroller.append(table);card.append(scroller);
 card.append(reference(descriptor,data));
 card.append(footer(s,descriptor.key,data));
 return card;
}
function methodology(s){
 const root=elem('footer','atlas-pop-methodology');
 root.append(elem('span','atlas-pop-info-icon','ⓘ'));
 const info=elem('div');
 info.append(elem('p',null,
  'Source : INSEE — Recensement de la population, exploitations principale et complémentaire. Ménages, familles et enfants de moins de 25 ans : RP 2023, géographie 2026.'));
 info.append(elem('p',null,
  s?.familiesData?'Effectifs, parts et évolutions calculés sur les observations officielles par commune, EPCI et France métropolitaine. Les données manquantes restent signalées par « — ».':
   'Les graphiques conservent leurs emplacements dans l’attente des données officielles INSEE.'));
 info.append(elem('p',null,'Licence : INSEE — Licence Ouverte 2.0.'));
 root.append(info);return root;
}
function render(root,s){
 if(!root)return false;
 root.replaceChildren();
 const repaint=()=>render(root,s);
 root.append(controls(repaint));
 for(const d of SECTIONS)root.append(matrix(s,d));
 root.append(methodology(s));
 return true;
}
window.AtlasFamiliesPage={render,sections:SECTIONS.map(x=>x.key)};
})();