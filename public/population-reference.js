'use strict';
/*
 * ATLAS Territoires — Maquette Population, étape 1.
 * Structure issue des quatre captures fournies par l'utilisateur, dans l'ordre.
 * Aucun effectif, pourcentage, variation ou référence France fictifs.
 * Le câblage de données INSEE sera effectué à l'étape 2.
 */
(function(){
 const YEARS=['1968','1975','1982','1990','1999','2007','2012','2017','2023'];
 const SECTIONS=[
  {key:'ages', title:'Population par tranches d’âges',
   subtitle:'Comparaison entre les différentes échelles de territoire — Effectif, part (%) et évolution',
   toplabel:'DÉCOUPAGE DU RP 2023',
   labels:['Moins de 15 ans','15 – 24 ans','25 – 39 ans','40 – 54 ans','55 – 64 ans','65 – 79 ans','80 ans ou plus'],
   franceYear:'2023',year:'2023',prev:'2017'},
  {key:'csp',title:'Population par catégorie socio-professionnelle (CSP)',
   subtitle:'Comparaison entre les différentes échelles de territoire — Effectif, part (%) et évolution',
   labels:['Agriculteurs exploitants','Artisans, Comm., Chefs entr.','Cadres, Prof. intel. sup.','Prof. intermédiaires','Employés','Ouvriers','Retraités','Autres sans activité prof.'],
   franceYear:'2023',year:'2023',prev:'2017'},
  {key:'origines',title:'Population par origines',
   subtitle:'Comparaison entre les différentes échelles de territoire — Effectif, part (%) et évolution',
   labels:['Population française','Population étrangère','Population immigrée'],
   franceYear:'2022',year:'2022',prev:'2016',
   topNote:'Source : INSEE RP 2022 (quartier : RP 2023 si disponible)'}
 ];
 const E=(tag,cls,content)=>{
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(content!==undefined&&content!==null)e.textContent=String(content);
  return e;
 };
 const svg=(tag,attrs,content)=>{
  const n=document.createElementNS('http://www.w3.org/2000/svg',tag);
  Object.entries(attrs||{}).forEach(([k,v])=>n.setAttribute(k,String(v)));
  if(content!==undefined)n.textContent=String(content);
  return n;
 };
 const nameOf=(s,type)=>{
  const value=type==='epci'?s?.admin?.epci?.nom:s?.loc?.commune||s?.admin?.commune?.nom;
  return typeof value==='string'&&value.trim()?value.trim():(type==='epci'?'INTERCOMMUNALITÉ':'COMMUNE');
 };
 const compared=(state)=>({
  epci:nameOf(state,'epci'),
  commune:nameOf(state,'commune')
 });
 const graphicChart=()=>{
  const view=svg('svg',{class:'atlas-pop-lineplot',viewBox:'0 0 540 220',role:'img','aria-label':'Emplacement du graphique chronologique : aucune donnée chargée'});
  const left=40,right=526,top=18,bottom=190;
  for(let i=0;i<5;i++){
   const y=top+(bottom-top)*i/4;
   view.append(svg('line',{x1:left,y1:y,x2:right,y2:y,stroke:'#e7eaf0','stroke-dasharray':'2 3','stroke-width':1}));
   view.append(svg('text',{x:31,y:y+3,'text-anchor':'end',class:'atlas-pop-axis-tick'},'—'));
  }
  view.append(svg('line',{x1:left,y1:bottom,x2:right,y2:bottom,stroke:'#aeb7c4','stroke-width':'1.1'}));
  YEARS.forEach((year,i)=>{
   const x=left+(right-left)*i/(YEARS.length-1);
   view.append(svg('line',{x1:x,y1:bottom,x2:x,y2:bottom+4,stroke:'#aeb7c4'}));
   view.append(svg('text',{x,y:bottom+17,'text-anchor':'middle',class:'atlas-pop-year'},year));
  });
  view.append(svg('text',{x:285,y:108,'text-anchor':'middle',class:'atlas-pop-emptyplot'},'—'));
  return view;
 };
 const overview=(s)=>{
  const section=E('section','atlas-pop-overview');
  section.append(E('h2','atlas-pop-section-title','Population évolution séries longues'));
  section.append(E('p','atlas-pop-section-subtitle','Recensements successifs — effectif et variation d’un millésime au suivant'));
  const pair=E('div','atlas-pop-chart-pair');
  const names=compared(s);
  [['epci',names.epci],['commune',names.commune]].forEach(([key,name])=>{
   const card=E('article','atlas-pop-chartcard');
   card.append(E('h3','atlas-pop-charttitle',name));
   card.append(E('p','atlas-pop-chartsub','% Variation 2017 → 2023'));
   card.append(E('span','atlas-pop-neutral-pill','—'));
   card.append(graphicChart());
   pair.append(card);
  });
  section.append(pair);return section;
 };
 const indicator=(key,barClass)=>{
  const content=E('div','atlas-pop-indicator');
  const stat=E('div','atlas-pop-statline');
  stat.append(E('strong','atlas-pop-stat','—'));
  stat.append(E('span','atlas-pop-change','—'));
  stat.append(E('span','atlas-pop-share','—'));
  content.append(stat);
  const track=E('div','atlas-pop-track');
  track.append(E('div','atlas-pop-fill '+barClass));
  content.append(track);
  return content;
 };
 const matrixHead=(names)=>{
  const head=E('div','atlas-pop-matrix-heading');
  head.append(E('div','atlas-pop-matrix-empty'));
  const epci=E('div','atlas-pop-col-label');
  epci.append(E('span','atlas-pop-small-icon','◉'),E('span',null,names.epci.toUpperCase()));
  head.append(epci);
  const commune=E('div','atlas-pop-col-label');
  commune.append(E('span','atlas-pop-small-icon','▥'),E('span',null,'COMMUNE'));
  commune.append(E('small','atlas-pop-locality',names.commune));
  head.append(commune);
  return head;
 };
 const france=(section)=>{
  const ref=E('div','atlas-pop-national');
  const heading=E('div','atlas-pop-national-header');
  heading.append(E('strong',null,'RÉFÉRENCE FRANCE — RP '+section.franceYear));
  heading.append(E('span',null,'part de l’ensemble en %'));
  ref.append(heading);
  const grid=E('div','atlas-pop-national-grid');
  grid.style.setProperty('--atlas-france-cols',String(section.labels.length));
  section.labels.forEach(label=>{
   const cell=E('div','atlas-pop-national-cell');
   cell.append(E('span','atlas-pop-national-label',label),E('strong','atlas-pop-national-value','—'));
   grid.append(cell);
  });
  ref.append(grid);return ref;
 };
 const sourceLine=(section)=>{
  const foot=E('div','atlas-pop-matrix-footer');
  const left=E('div');
  left.append(E('strong',null,'Sources : Insee'));
  left.append(E('span',null,'EPCI / Commune / Arrondissement / Quartier : RP '+section.year+' (présentation à renseigner)'));
  left.append(E('span',null,'Données chiffrées : connexion prévue à l’étape 2'));
  const right=E('div','atlas-pop-dynamics');
  right.append(E('strong',null,'Dynamique :'));
  right.append(E('span',null,'EPCI / Commune / Arrondissement : '+section.year+' / '+section.prev));
  right.append(E('span',null,'Quartier : '+(section.year==='2023'?'2022 / 2016':'2022 / 2016')));
  foot.append(left,right);
  return foot;
 };
 const matrix=(section,state,mode)=>{
  const card=E('section','atlas-pop-matrix');
  card.dataset.populationSection=section.key;
  const top=E('div','atlas-pop-matrix-top');
  const title=E('div');
  title.append(E('h2','atlas-pop-section-title',section.title));
  title.append(E('p','atlas-pop-section-subtitle',section.subtitle));
  top.append(title);
  if(section.topNote)top.append(E('small','atlas-pop-source-note',section.topNote));
  else {
   const exportHint=E('span','atlas-pop-excel','X');
   exportHint.title='Présentation du bouton d’export de la référence';
   exportHint.setAttribute('aria-hidden','true');
   top.append(exportHint);
  }
  card.append(top);
  if(section.toplabel)card.append(E('div','atlas-pop-uppercase-note',section.toplabel));
  const names=compared(state);
  const table=E('div','atlas-pop-matrix-scroll');
  const shell=E('div','atlas-pop-matrix-data'+(mode==='graphique'?' atlas-pop-graph-mode':''));
  shell.append(matrixHead(names));
  section.labels.forEach(label=>{
   const row=E('div','atlas-pop-matrix-row');
   row.append(E('div','atlas-pop-rowtitle',label));
   row.append(indicator('epci','atlas-pop-epci-fill'));
   row.append(indicator('commune','atlas-pop-commune-fill'));
   shell.append(row);
  });
  table.append(shell);card.append(table);
  card.append(france(section));
  if(section.key!=='origines')card.append(sourceLine(section));
  return card;
 };
 let mode='matrice';
 const controls=(redraw)=>{
  const strip=E('div','atlas-pop-viewstrip');
  const right=E('div','atlas-pop-viewcontrols');
  right.append(E('span','atlas-pop-view-label','VUE'));
  for(const [value,glyph,label] of [['matrice','▦','Matrice'],['graphique','▥','Graphique']]){
   const button=E('button','atlas-pop-viewbutton'+(mode===value?' is-active':''),glyph+'  '+label);
   button.type='button';button.setAttribute('aria-pressed',String(mode===value));
   button.addEventListener('click',()=>{
    if(mode===value)return;
    mode=value;redraw();
   });
   right.append(button);
  }
  strip.append(right);return strip;
 };
 const methodology=()=>{
  const panel=E('footer','atlas-pop-methodology');
  panel.append(E('span','atlas-pop-info-icon','ⓘ'));
  const details=E('div');
  details.append(E('p',null,'Source prévue : INSEE — Recensement de la population (exploitation principale). Évolution de la population : série historique 1968 → 2023 pour l’EPCI et la commune. Tranches d’âges, catégories socio-professionnelles et origines : millésimes indiqués dans les rubriques.'));
  details.append(E('p',null,'Les périodes et définitions sont celles montrées sur les captures de référence ; aucune observation, part, évolution ou comparaison France n’est encore connectée.'));
  details.append(E('p',null,'Licence prévue : INSEE — Licence Ouverte 2.0 (étape 2 : liaison aux jeux officiels).'));
  panel.append(details);return panel;
 };
 function render(root,state){
  if(!root)return false;
  root.replaceChildren();
  const refresh=()=>render(root,state);
  root.append(controls(refresh),overview(state));
  SECTIONS.forEach(section=>root.append(matrix(section,state,mode)));
  root.append(methodology());
  return true;
 }
 window.AtlasPopulationPage={render,sections:SECTIONS.map(x=>x.key)};
})();