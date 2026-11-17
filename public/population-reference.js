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
 const format=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
 const pct=v=>typeof v==='number'&&Number.isFinite(v)?
  new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1,minimumFractionDigits:1}).format(v)+' %':'—';
 const signed=v=>typeof v==='number'&&Number.isFinite(v)?
  (v>0?'+':'')+pct(v):'—';
 const observation=r=>r&&typeof r.value==='number'&&Number.isFinite(r.value);
 const graphicChart=(records=[])=>{
  const view=svg('svg',{class:'atlas-pop-lineplot',viewBox:'0 0 540 220',role:'img',
   'aria-label':'Évolution de la population selon les séries INSEE'});
  const left=40,right=526,top=18,bottom=190;
  const known=Array.isArray(records)?records.filter(r=>observation(r)&&Number.isInteger(r.year)):[];
  const maximum=known.length?Math.max(...known.map(x=>x.value)):0;
  const ceiling=maximum>0?Math.ceil(maximum/(maximum>=50000?10000:maximum>=5000?1000:maximum>=500?100:10))*
   (maximum>=50000?10000:maximum>=5000?1000:maximum>=500?100:10):1;
  const scale=ceiling>0?ceiling*1.14:1;
  for(let i=0;i<5;i++){
   const y=top+(bottom-top)*i/4;
   view.append(svg('line',{x1:left,y1:y,x2:right,y2:y,stroke:'#e7eaf0','stroke-dasharray':'2 3','stroke-width':1}));
   view.append(svg('text',{x:31,y:y+3,'text-anchor':'end',class:'atlas-pop-axis-tick'},
    known.length?format.format(scale*(4-i)/4):'—'));
  }
  view.append(svg('line',{x1:left,y1:bottom,x2:right,y2:bottom,stroke:'#aeb7c4','stroke-width':'1.1'}));
  YEARS.forEach((year,i)=>{
   const x=left+(right-left)*i/(YEARS.length-1);
   view.append(svg('line',{x1:x,y1:bottom,x2:x,y2:bottom+4,stroke:'#aeb7c4'}));
   view.append(svg('text',{x,y:bottom+17,'text-anchor':'middle',class:'atlas-pop-year'},year));
  });
  if(known.length){
   // N'afficher que les années présentes dans les graduations de la maquette.
   const data=YEARS.map(year=>known.find(x=>String(x.year)===year)).filter(observation);
   if(data.length>=2){
    const coords=data.map(r=>({
     x:left+YEARS.indexOf(String(r.year))*(right-left)/(YEARS.length-1),
     y:bottom-(r.value/scale)*(bottom-top),value:r.value
    }));
    view.append(svg('path',{d:'M '+coords.map(p=>p.x+','+p.y).join(' L '),
     fill:'none',stroke:'#436d9b','stroke-width':2.2,'stroke-linecap':'round','stroke-linejoin':'round'}));
    for(const pt of coords){
     view.append(svg('circle',{cx:pt.x,cy:pt.y,r:3.3,fill:'#436d9b'}));
     view.append(svg('text',{x:pt.x,y:Math.max(12,pt.y-7),'text-anchor':'middle',
      class:'atlas-pop-axis-tick'},format.format(pt.value)));
    }
   }
  }else{
   view.append(svg('text',{x:285,y:108,'text-anchor':'middle',class:'atlas-pop-emptyplot'},'—'));
  }
  return view;
 };
 const overview=(s)=>{
  const section=E('section','atlas-pop-overview');
  section.append(E('h2','atlas-pop-section-title','Population évolution séries longues'));
  section.append(E('p','atlas-pop-section-subtitle','Recensements successifs — effectif et variation d’un millésime au suivant'));
  const pair=E('div','atlas-pop-chart-pair'),names=compared(s);
  [['epci',names.epci],['commune',names.commune]].forEach(([key,name])=>{
   const card=E('article','atlas-pop-chartcard');
   const records=s.populationData?.series?.[key]||[];
   const p2017=records.find(x=>x.year===2017)?.value;
   const p2023=records.find(x=>x.year===2023)?.value;
   const delta=typeof p2017==='number'&&p2017>0&&typeof p2023==='number'?
    (p2023/p2017-1)*100:null;
   card.append(E('h3','atlas-pop-charttitle',name));
   card.append(E('p','atlas-pop-chartsub','% Variation 2017 → 2023'));
   const span=E('span','atlas-pop-neutral-pill'+(delta!==null?(delta>=0?' atlas-pop-up':' atlas-pop-down'):''),signed(delta));
   card.append(span,graphicChart(records));
   pair.append(card);
  });
  section.append(pair);return section;
 };
 const indicator=(barClass,record,maxShare)=>{
  const content=E('div','atlas-pop-indicator'),stat=E('div','atlas-pop-statline');
  const has=record&&typeof record.value==='number'&&Number.isFinite(record.value);
  stat.append(E('strong','atlas-pop-stat',has?format.format(record.value):'—'));
  const change=has?record.change:null;
  stat.append(E('span','atlas-pop-change'+(typeof change==='number'?
   (change>=0?' atlas-pop-up':' atlas-pop-down'):''),signed(change)));
  stat.append(E('span','atlas-pop-share',has?pct(record.share):'—'));
  content.append(stat);
  const track=E('div','atlas-pop-track');
  const fill=E('div','atlas-pop-fill '+barClass);
  const share=record?.share;
  fill.style.width=typeof share==='number'&&maxShare>0?
   Math.min(100,Math.max(0,share/maxShare*100))+'%':'0%';
  track.append(fill);content.append(track);
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
 const france=(section,state)=>{
  const ref=E('div','atlas-pop-national');
  const national=state.populationData?.sections?.[section.key]?.france;
  const nationalYear=national?.referenceYear||section.franceYear;
  const heading=E('div','atlas-pop-national-header');
  heading.append(E('strong',null,'RÉFÉRENCE FRANCE — RP '+nationalYear));
  heading.append(E('span',null,'part de l’ensemble en %'));
  ref.append(heading);
  const grid=E('div','atlas-pop-national-grid');
  grid.style.setProperty('--atlas-france-cols',String(section.labels.length));
  section.labels.forEach((label,i)=>{
   const cell=E('div','atlas-pop-national-cell');
   cell.append(E('span','atlas-pop-national-label',label),
    E('strong','atlas-pop-national-value',pct(national?.rows?.[i]?.share)));
   grid.append(cell);
  });
  ref.append(grid);return ref;
 };
 const sourceLine=(section,state)=>{
  const foot=E('div','atlas-pop-matrix-footer'),left=E('div');
  const ready=Boolean(state.populationData?.sections?.[section.key]?.commune?.rows?.some(r=>r.value!==null));
  const year=ready?state.populationData?.sections?.[section.key]?.commune?.referenceYear:section.year;
  left.append(E('strong',null,'Sources : Insee'));
  left.append(E('span',null,'EPCI / Commune / Arrondissement / Quartier : RP '+year));
  left.append(E('span',null,ready?'Données issues de l’API officielle INSEE Melodi':
   'Données non disponibles pour la commune sélectionnée'));
  const right=E('div','atlas-pop-dynamics');
  right.append(E('strong',null,'Dynamique :'));
  right.append(E('span',null,'EPCI / Commune / Arrondissement : '+year+' / '+section.prev));
  right.append(E('span',null,'Quartier : 2022 / 2016 (si disponible)'));
  foot.append(left,right);return foot;
 };
 const matrix=(section,state,mode)=>{
  const card=E('section','atlas-pop-matrix');
  card.dataset.populationSection=section.key;
  const top=E('div','atlas-pop-matrix-top'),title=E('div');
  title.append(E('h2','atlas-pop-section-title',section.title));
  title.append(E('p','atlas-pop-section-subtitle',section.subtitle));
  top.append(title);
  if(section.topNote)top.append(E('small','atlas-pop-source-note',
   state.populationData?.sections?.[section.key]?.commune?.rows?.some(r=>r.value!==null)?
    'Source : INSEE RP 2023 (France métropolitaine pour la référence nationale)':section.topNote));
  else {
   const exportHint=E('span','atlas-pop-excel','X');
   exportHint.title='Présentation du bouton d’export de la référence';
   exportHint.setAttribute('aria-hidden','true');
   top.append(exportHint);
  }
  card.append(top);
  if(section.toplabel)card.append(E('div','atlas-pop-uppercase-note',section.toplabel));
  const matrixData=state.populationData?.sections?.[section.key]||{};
  const names=compared(state),table=E('div','atlas-pop-matrix-scroll');
  const shell=E('div','atlas-pop-matrix-data'+(mode==='graphique'?' atlas-pop-graph-mode':''));
  shell.append(matrixHead(names));
  const max={};
  for(const area of ['epci','commune']){
   const vals=matrixData?.[area]?.rows||[];
   max[area]=Math.max(0,...vals.map(v=>typeof v?.share==='number'?v.share:0));
  }
  section.labels.forEach((label,i)=>{
   const row=E('div','atlas-pop-matrix-row');
   row.append(E('div','atlas-pop-rowtitle',label));
   row.append(indicator('atlas-pop-epci-fill',matrixData.epci?.rows?.[i],max.epci));
   row.append(indicator('atlas-pop-commune-fill',matrixData.commune?.rows?.[i],max.commune));
   shell.append(row);
  });
  table.append(shell);card.append(table);
  card.append(france(section,state));
  if(section.key!=='origines')card.append(sourceLine(section,state));
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
 const methodology=(state)=>{
  const panel=E('footer','atlas-pop-methodology');
  panel.append(E('span','atlas-pop-info-icon','ⓘ'));
  const details=E('div'),ready=Boolean(state.populationData);
  details.append(E('p',null,
   'Source : INSEE — Recensement de la population, API Melodi. Séries historiques : population sans doubles comptes de 1968 à 1999, puis population municipale depuis 2006 (concepts précisés par l’INSEE). Catégories par âge, CSP, nationalité et statut d’immigré : RP 2023.'));
  details.append(E('p',null,ready?
   'Effectifs et pourcentages calculés à partir des observations officielles non arrondies ; évolutions fondées sur deux millésimes comparables uniquement. Référence nationale : France métropolitaine. Valeurs indisponibles : —.':
   'Les cases restent vides tant que les observations officielles ne sont pas récupérées.'));
  details.append(E('p',null,'Licence : INSEE — Licence Ouverte 2.0 (API Melodi).'));
  panel.append(details);return panel;
 };
 function render(root,state){
  if(!root)return false;
  root.replaceChildren();
  const refresh=()=>render(root,state);
  root.append(controls(refresh),overview(state));
  SECTIONS.forEach(section=>root.append(matrix(section,state,mode)));
  root.append(methodology(state));
  return true;
 }
 window.AtlasPopulationPage={render,sections:SECTIONS.map(x=>x.key)};
})();