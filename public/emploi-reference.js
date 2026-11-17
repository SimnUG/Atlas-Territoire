'use strict';
/*
 * ATLAS — Emploi et activité. Présentation des trois captures fournies.
 * Étape visuelle conservée, puis injection de valeurs de l'INSEE Melodi.
 * Ne touche pas aux autres composants Population / Familles.
 */
(function(){
 const MATRICES=[
  {id:'activite',title:'Population de 15 à 64 ans selon le type d’activité',
   labels:['Actifs occupés','Chômeurs','Inactifs']},
  {id:'chomage',title:'Population au chômage par tranche d’âge',
   labels:['15 – 24 ans','25 – 54 ans','55 ans et +']},
  {id:'inactifs',title:'Inactifs de 15 à 64 ans selon leur situation',
   labels:['Retraités ou préretraités','Élèves, étudiants et stagiaires non rémunérés','Autres inactifs']}
 ];
 const NB=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
 const PR=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1});
 const DOC='Comparaison entre les différentes échelles de territoire — Effectif, part (%) et évolution';
 const E=(name,cl,t)=>{
  const e=document.createElement(name);if(cl)e.className=cl;
  if(t!==undefined&&t!==null)e.textContent=String(t);
  return e;
 };
 const isNumber=x=>typeof x==='number'&&Number.isFinite(x);
 const pct=x=>isNumber(x)?PR.format(x)+' %':'—';
 const signed=(x,suffix=' %')=>isNumber(x)?(x>0?'+':'')+PR.format(x)+suffix:'—';
 const nameOf=(s,k)=>k==='epci'?
  (s.admin?.epci?.nom||'INTERCOMMUNALITÉ'):(s.loc?.commune||s.admin?.commune?.nom||'COMMUNE');
 const values=(s,key)=>s.employmentData?.sections?.[key]||{};
 let mode='matrice';
 function modeButtons(redraw){
  const outer=E('div','atlas-pop-viewstrip'),right=E('div','atlas-pop-viewcontrols');
  right.append(E('span','atlas-pop-view-label','VUE'));
  for(const [id,pict,label] of [['matrice','▦','Matrice'],['graphique','▥','Graphique']]){
   const btn=E('button','atlas-pop-viewbutton'+(mode===id?' is-active':''),pict+'  '+label);
   btn.type='button';
   btn.setAttribute('aria-pressed',String(id===mode));
   btn.addEventListener('click',()=>{if(mode===id)return;mode=id;redraw()});
   right.append(btn);
  }
  outer.append(right);return outer;
 }
 function territoryHead(s){
  const row=E('div','atlas-pop-matrix-heading');
  row.append(E('div','atlas-pop-matrix-empty'));
  const epci=E('div','atlas-pop-col-label');
  epci.append(E('span','atlas-pop-small-icon','◉'),E('span',null,nameOf(s,'epci').toUpperCase()));
  row.append(epci);
  const commune=E('div','atlas-pop-col-label');
  commune.append(E('span','atlas-pop-small-icon','▥'),E('span',null,'COMMUNE'),
   E('small','atlas-pop-locality',nameOf(s,'commune')));
  row.append(commune);
  return row;
 }
 function indicator(record,max,cls){
  const box=E('div','atlas-pop-indicator'),stats=E('div','atlas-pop-statline');
  const value=isNumber(record?.value)?record.value:null;
  stats.append(E('strong','atlas-pop-stat',value===null?'—':NB.format(value)));
  const delta=isNumber(record?.change)?record.change:null;
  stats.append(E('span','atlas-pop-change'+(delta===null?'':delta>=0?' atlas-pop-up':' atlas-pop-down'),
   signed(delta)));
  stats.append(E('span','atlas-pop-share',pct(record?.share)));
  box.append(stats);
  const t=E('div','atlas-pop-track'),fill=E('div','atlas-pop-fill '+cls);
  fill.style.width=isNumber(record?.share)&&max>0?
   Math.min(100,Math.max(0,record.share/max*100))+'%':'0%';
  t.append(fill);box.append(t);return box;
 }
 function national(descriptor,data){
  const box=E('div','atlas-pop-national'),head=E('div','atlas-pop-national-header');
  head.append(E('strong',null,'RÉFÉRENCE FRANCE — RP 2023'),
   E('span',null,'part de l’ensemble en %'));
  box.append(head);
  const grid=E('div','atlas-pop-national-grid');
  grid.style.setProperty('--atlas-france-cols',String(descriptor.labels.length));
  descriptor.labels.forEach((label,i)=>{
   const c=E('div','atlas-pop-national-cell');
   c.append(E('span','atlas-pop-national-label',label),
    E('strong','atlas-pop-national-value',pct(data.france?.rows?.[i]?.share)));
   grid.append(c);
  });
  box.append(grid);return box;
 }
 function footer(data){
  const f=E('div','atlas-pop-matrix-footer'),left=E('div'),
   right=E('div','atlas-pop-dynamics');
  left.append(E('strong',null,'Sources : Insee'),
   E('span',null,'EPCI / Commune / Arrondissement : RP 2023'),
   E('span',null,'Quartier : RP 2022 (lorsque disponible)'));
  right.append(E('strong',null,'Dynamique :'),
   E('span',null,'EPCI / Commune / Arrondissement : 2023 / 2017'),
   E('span',null,'Quartier : 2022 / 2016'));
  f.append(left,right);return f;
 }
 function matrix(descriptor,s){
  const data=values(s,descriptor.id),card=E('section','atlas-pop-matrix');
  card.dataset.employmentSection=descriptor.id;
  const head=E('div','atlas-pop-matrix-top'),left=E('div');
  left.append(E('h2','atlas-pop-section-title',descriptor.title),
   E('p','atlas-pop-section-subtitle',DOC));
  head.append(left);
  const x=E('span','atlas-pop-excel','X');
  x.title='Repère graphique de la présentation';x.setAttribute('aria-hidden','true');
  head.append(x);card.append(head);
  const scroll=E('div','atlas-pop-matrix-scroll'),rows=E('div','atlas-pop-matrix-data'+
   (mode==='graphique'?' atlas-pop-graph-mode':''));
  rows.append(territoryHead(s));
  const maxima={};
  for(const geo of ['commune','epci'])
   maxima[geo]=Math.max(0,...(data?.[geo]?.rows||[]).map(v=>isNumber(v?.share)?v.share:0));
  descriptor.labels.forEach((label,i)=>{
   const row=E('div','atlas-pop-matrix-row');
   row.append(E('div','atlas-pop-rowtitle',label));
   row.append(indicator(data.epci?.rows?.[i],maxima.epci,'atlas-pop-epci-fill'));
   row.append(indicator(data.commune?.rows?.[i],maxima.commune,'atlas-pop-commune-fill'));
   rows.append(row);
  });
  scroll.append(rows);card.append(scroll,national(descriptor,data),footer(data));return card;
 }
 function concentration(s){
  const card=E('section','atlas-pop-matrix atlas-emploi-concentration');
  card.dataset.employmentSection='concentration';
  const head=E('div','atlas-pop-matrix-top'),left=E('div');
  left.append(E('h2','atlas-pop-section-title','Indice de concentration de l’emploi'),
   E('p','atlas-pop-section-subtitle',
    'Emplois localisés pour 100 actifs occupés résidents — un indice supérieur à 100 signale un territoire pôle d’emploi (millésimes 2012 / 2017 / 2023, évolution inter-millésimes)'));
  head.append(left);card.append(head);
  const shell=E('div','atlas-pop-matrix-scroll'),table=E('div','atlas-pop-matrix-data');
  table.append(territoryHead(s));
  for(const year of [2012,2017,2023]){
   const row=E('div','atlas-pop-matrix-row atlas-emploi-concentration-row');
   row.append(E('div','atlas-pop-rowtitle',String(year)));
   for(const area of ['epci','commune']){
    const result=s.employmentData?.concentration?.[area]?.[year];
    const content=E('div','atlas-emploi-concentration-value');
    content.append(E('strong',null,pct(result?.value)));
    if(year!==2012){
     const change=isNumber(result?.change)?result.change:null;
     content.append(E('span','atlas-pop-change'+(change===null?'':change>=0?' atlas-pop-up':' atlas-pop-down'),
      signed(change,' pt')));
    }
    row.append(content);
   }
   table.append(row);
  }
  shell.append(table);card.append(shell);
  const foot=E('div','atlas-pop-matrix-footer'),leftFoot=E('div'),
   rightFoot=E('div','atlas-pop-dynamics');
  leftFoot.append(E('strong',null,'Sources : Insee'),E('span',null,'RP 2012 / 2017 / 2023'));
  rightFoot.append(E('strong',null,'Évolution :'),E('span',null,'Points d’indice entre millésimes'));
  foot.append(leftFoot,rightFoot);card.append(foot);return card;
 }
 function methodology(s){
  const el=E('footer','atlas-pop-methodology');
  el.append(E('span','atlas-pop-info-icon','ⓘ'));
  const text=E('div');
  text.append(E('p',null,'Source : INSEE — Recensement de la population (activité des 15–64 ans), commune, EPCI et France ; données au lieu de résidence et au lieu de travail selon l’indicateur.'));
  text.append(E('p',null,'Références : RP 2023 ; évolutions RP 2023 / RP 2017 ; indice de concentration de l’emploi RP 2012 / 2017 / 2023. Les cases non disponibles conservent « — ». Le chômage est défini au sens du recensement et non au sens du BIT.'));
  text.append(E('p',null,'Licence : INSEE — Licence Ouverte 2.0.'));
  el.append(text);return el;
 }
 function render(root,s){
  if(!root)return false;
  root.replaceChildren();
  const rerender=()=>render(root,s);
  root.append(modeButtons(rerender),concentration(s));
  MATRICES.forEach(descriptor=>root.append(matrix(descriptor,s)));
  root.append(methodology(s));return true;
 }
 window.AtlasEmploymentPage={render,sections:['concentration',...MATRICES.map(x=>x.id)]};
})();