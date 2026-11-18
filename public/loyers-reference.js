'use strict';
(function(){
 const kinds=[
  {id:'appartements',label:'Ensemble des appartements',short:'APPARTEMENTS',color:'#263566'},
  {id:'petits',label:'Appartements de 1 à 2 pièces',short:'APPARTEMENTS T1/T2',color:'#487d9f'},
  {id:'grands',label:'Appartements de 3 pièces ou plus',short:'APPARTEMENTS T3 ET PLUS',color:'#7863a5'},
  {id:'maisons',label:'Ensemble des maisons',short:'MAISONS',color:'#db0079'}
 ];
 const sourceURL='https://www.data.gouv.fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025';
 const dvfURL='https://www.data.gouv.fr/datasets/dvfplus-open-data';
 const dataTypes={};
 kinds.forEach(x=>dataTypes[x.id]=x);
 const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined&&value!==null)n.textContent=String(value);return n};
 const add=(node,...children)=>(node.append(...children.filter(Boolean)),node);
 const link=(label,href)=>{const a=el('a',null,label);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a};
 const decimal=(v,fraction=1)=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('fr-FR',{minimumFractionDigits:fraction,maximumFractionDigits:fraction}):'—';
 const euro=(v)=>typeof v==='number'&&Number.isFinite(v)?decimal(v,1)+' €/m²':'—';
 const pc=(v)=>typeof v==='number'&&Number.isFinite(v)?decimal(v,1)+' %':'—';
 const any=v=>typeof v==='number'&&Number.isFinite(v);
 const state={ranking:'appartements',showAll:false};
 let current=null,host=null;
 function sourceRow(kind){
  return current?.rent?.types?.find(x=>x.id===kind)||null;
 }
 function valueFor(kind,year){
  const r=sourceRow(kind)?.serie?.find(x=>x.annee===year);
  return r&&any(r.loyer)&&r.loyer>0?r:null;
 }
 function comparison(kind,year){
  const epci=current?.rentEpciHistory?.references?.[year]?.[kind]||current?.rentEpci?.references?.[year]?.[kind];
  return any(epci?.mediane)?epci.mediane:null;
 }
 function box(title,subtitle,cls=''){
  const p=el('section','rp-panel '+cls);
  if(title)p.append(el('h2',null,title));
  if(subtitle)p.append(el('p','rp-muted',subtitle));
  return p;
 }
 function kpis(root){
  const grid=el('div','rp-grid-four rp-kpis');
  for(let i=0;i<kinds.length;i++){
   const kind=kinds[i],r=valueFor(kind.id,2025),median=comparison(kind.id,2025);
   const card=el('div','rp-kpi');
   card.append(el('small','rp-eyebrow',kind.label.toUpperCase()));
   card.append(el('strong','rp-big'+(i===0?' highlight':''),euro(r?.loyer)));
   let detail='';
   if(r?.borne_basse!==null&&r?.borne_basse!==undefined&&any(r?.borne_haute))
    detail='Intervalle '+decimal(r.borne_basse)+' à '+decimal(r.borne_haute)+' €';
   if(r?.observations!==null&&r?.observations!==undefined)
    detail+=(detail?' · ':'')+r.observations+' annonces communales';
   if(r?.niveau_prediction&& !/^(com|commune|communale)$/i.test(r.niveau_prediction))
    detail+=(detail?' · ':'')+'estimation sur un groupe de communes';
   if(median!==null&&r?.loyer!==null&&r?.loyer!==undefined)
    detail+=(detail?' · ':'')+(r.loyer-median>=0?'+':'')+decimal(r.loyer-median)+' € vs médiane EPCI';
   card.append(el('p','rp-small',detail||'Aucune estimation communale confirmée pour 2025'));
   grid.append(card);
  }
  root.append(grid);
 }
 function chartSvg(points,color,comps,maxOverride=null,isYield=false){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.classList.add('rp-chart');
  svg.setAttribute('viewBox','0 0 350 170');
  svg.setAttribute('role','img');
  svg.setAttribute('aria-label',isYield?'Évolution du rendement brut':'Loyers 2022 à 2025 par année');
  const svgNode=(tag,props={},label)=>{
   const n=document.createElementNS('http://www.w3.org/2000/svg',tag);
   Object.entries(props).forEach(([k,v])=>n.setAttribute(k,String(v)));
   if(label!==undefined)n.textContent=String(label);svg.append(n);return n;
  };
  const values=points.filter(any),cvals=(comps||[]).filter(any);
  const high=Math.max(1,maxOverride||0,...values,...cvals)*1.18;
  const left=36,top=14,bottom=137,height=bottom-top,step=73;
  for(let j=0;j<=3;j++){
   const v=j*high/3,y=bottom-v/high*height;
   svgNode('line',{x1:left,y1:y,x2:345,y2:y,stroke:'#eceef3','stroke-dasharray':'2 2'});
   svgNode('text',{x:left-7,y:y+3,'text-anchor':'end',fill:'#9aa4b4','font-size':9},isYield?decimal(v,0)+' %':decimal(v,0)+' €');
  }
  const nodes=[];
  for(let i=0;i<4;i++){
   const x=left+19+i*step,point=points[i];
   if(any(point)){
    const bh=Math.max(2,point/high*height);
    svgNode('rect',{x,y:bottom-bh,width:35,height:bh,rx:1,fill:i===3?color:'#a3abc2',opacity:i===3?1:.86});
    svgNode('text',{x:x+17.5,y:bottom-bh-7,'text-anchor':'middle',fill:'#243565','font-size':10,'font-weight':'700'},decimal(point,1));
   }
   svgNode('text',{x:x+17.5,y:bottom+17,'text-anchor':'middle',fill:'#8792a2','font-size':10},2022+i);
   const ref=comps?.[i];if(any(ref))nodes.push([x+17.5,bottom-ref/high*height]);
  }
  if(nodes.length>=2){
   const path=nodes.map((p,i)=>(i?'L':'M')+p[0]+','+p[1]).join(' ');
   svgNode('path',{d:path,fill:'none',stroke:'#f2a12c','stroke-width':1.7,'stroke-dasharray':'4 4'});
   nodes.forEach(([x,y])=>svgNode('circle',{cx:x,cy:y,r:2.4,fill:'#f4a236',stroke:'#fff','stroke-width':1}));
  }
  return svg;
 }
 function growthLabel(rows){
  const first=rows.find(v=>v.year===2022)?.value;
  const end=rows.find(v=>v.year===2025)?.value;
  if(!any(first)||!any(end)||first===0)return null;
  return (end>=first?'+':'')+decimal((end/first-1)*100)+' % depuis 2022';
 }
 function historicalCard(kind){
  const p=el('article','rp-small-graph');
  const values=[2022,2023,2024,2025].map(y=>({year:y,value:valueFor(kind.id,y)?.loyer??null}));
  const last=values.at(-1)?.value;
  p.append(el('small','rp-graph-kind',kind.short));
  const title=el('div','rp-series-head');title.append(el('strong',null,euro(last)),el('small',null,'en 2025'));
  const growth=sourceRow(kind.id)?.historique_comparable?growthLabel(values):null;
  if(growth)title.append(el('b','rp-growth',growth));
  p.append(title);
  const early=valueFor(kind.id,2024)?.loyer;
  if(any(last)&&any(early)&&early>0){
   p.append(el('span','rp-delta',((last/early-1)*100>=0?'+':'')+decimal((last/early-1)*100)+' % vs 2024'));
  }
  const refs=[2022,2023,2024,2025].map(y=>comparison(kind.id,y));
  p.append(chartSvg(values.map(v=>v.value),kind.color,refs));
  const missing=values.filter(v=>!any(v.value)).map(v=>v.year);
  if(missing.length){
    const errors=sourceRow(kind.id)?.serie?.filter(x=>missing.includes(x.annee)).map(x=>x.erreur).filter(Boolean)||[];
    p.append(el('p','rp-missing-years','Données indisponibles : '+missing.join(', ')+'. '+(errors.length?'Vérifier la disponibilité du fichier ANIL correspondant.':'')));
  }
  return p;
 }
 function yieldCard(kind){
  const p=el('article','rp-small-graph rp-yield-card');
  p.append(el('small','rp-graph-kind',kind.short));
  const years=[2022,2023,2024,2025];
  const data=years.map(y=>current?.rentYield?.annees?.[y]?.[kind.id]||null);
  const found=data.map(r=>r?.rendement).filter(any);
  if(!found.length){
   const reason=current?.rentYield?.statut==='indisponible'
    ?'Source DVF+ Cerema inaccessible actuellement : aucun rendement calculé.'
    :'Aucune année ne réunit un loyer et un prix de vente au m² vérifiés (au moins 5 ventes du segment).';
   p.append(el('p','rp-missing',!current?.rentYield?'Vérification des prix DVF+ en cours…':reason));
   return p;
  }
  const last=[...data].reverse().find(x=>any(x?.rendement));
  p.append(el('div','rp-series-head',null));
  p.lastChild.append(el('strong',null,pc(last.rendement)),el('small',null,'rendement brut indicatif'));
  p.append(chartSvg(data.map(r=>r?.rendement??null),kind.color,[],8,true));
  const table=el('div','rp-prices');
  for(const [index,year] of years.entries()){
   const row=el('div','rp-price-column');
   row.append(el('small',null,String(year)),el('strong',null,data[index]?.prix_m2?Math.round(data[index].prix_m2)+' €':'—'),
    el('span',null,data[index]?.loyer?Math.round(data[index].loyer*12)+' €':'—'));
   table.append(row);
  }
  p.append(el('p','rp-small','Prix médian DVF au m² / loyer annuel ANIL au m²'));
  p.append(table);
  return p;
 }
 function allCharts(root){
  const main=box('Évolution des loyers et du rendement brut 2022 → 2025',
    'Loyer d’annonce au m², segment par segment, et rendement brut indicatif rapporté aux mutations DVF+.');
  main.append(el('h3','rp-subheading','Loyer au m², charges comprises'));
  const row=el('div','rp-grid-four');
  kinds.forEach(k=>row.append(historicalCard(k)));
  main.append(row);
  main.append(el('h3','rp-subheading','Rendement locatif brut'));
  const bottom=el('div','rp-grid-four');
  kinds.forEach(k=>bottom.append(yieldCard(k)));
  main.append(bottom);
  const legend=el('div','rp-legend');
  legend.append(el('span','rp-line-legend','Médiane des communes de l’intercommunalité, même millésime (si disponible)'));
  main.append(legend);
  main.append(el('p','rp-method','Les variations de loyers entre millésimes ne sont fiables que lorsque le niveau de prédiction reste communal ; les mailles d’estimation peuvent changer d’une année sur l’autre. Le rendement brut = loyer mensuel au m² × 12 ÷ prix de vente médian au m² ; hors charges, taxe foncière, vacance et frais d’acquisition. Les loyers incluent les charges récupérables : le rendement indiqué peut être surévalué.'));
  root.append(main);
 }
 function epciSection(root){
  const epci=current?.rentEpci||current?.rentEpciHistory,details=epci?.epci;
  const title=details?.nom?'Position dans '+details.nom:'Position dans l’intercommunalité';
  const p=box(title,'Classement des communes par loyer d’annonce 2025, du plus élevé au plus faible.');
  const tabs=el('div','rp-tabs');
  const labels={'appartements':'Ensemble des appartements','petits':'1 à 2 pièces','grands':'3 pièces ou plus','maisons':'Ensemble des maisons'};
  for(const kind of kinds){
   const btn=el('button',state.ranking===kind.id?'active':'',labels[kind.id]);
   btn.type='button';btn.onclick=()=>{state.ranking=kind.id;draw()};tabs.append(btn);
  }
  p.append(tabs);
  if(!epci){
   p.append(el('p','rp-empty','Chargement des communes de l’EPCI…'));root.append(p);return;
  }
  const rows=(epci.communes||[]).map(c=>({...c,value:c.annees?.[2025]?.[state.ranking]?.valeur??null}))
    .filter(x=>any(x.value)).sort((a,b)=>b.value-a.value||a.nom.localeCompare(b.nom,'fr'));
  if(!rows.length){
   p.append(el('p','rp-empty',epci.raison||'Aucun classement possible avec les loyers officiels disponibles.'));
   root.append(p);return;
  }
  const target=current?.loc?.code_insee,rank=rows.findIndex(x=>x.code===target)+1;
  const med=comparison(state.ranking,2025);
  p.insertBefore(el('p','rp-rank-note',(rank?current.loc.commune+' se classe '+rank+'e sur '+rows.length+' communes. ':'')+
    (med?'Médiane : '+decimal(med)+' €/m².':'Médiane non disponible.')),tabs);
  const max=Math.max(1,...rows.map(x=>x.value));
  const chosen=rows.find(x=>x.code===target);
  const major=rows.length<=13?rows:rows.slice().sort((a,b)=>(b.population||0)-(a.population||0)).slice(0,12);
  const choices=new Set([...major.map(x=>x.code),...(chosen?[chosen.code]:[])]);
  const shown=state.showAll?rows:rows.filter(x=>choices.has(x.code));
  for(const c of shown){
   const selected=c.code===target,line=el('div','rp-ranking-row'+(selected?' selected':''));
   const name=el('span','rp-rank-name',c.nom),track=el('div','rp-track');
   const fill=el('div','rp-track-fill');fill.style.width=Math.min(100,c.value/max*100)+'%';
   track.append(fill);line.append(name,track,el('b',null,decimal(c.value)+' €'));p.append(line);
  }
  if(rows.length>13){
   const more=el('button','rp-more',state.showAll?'Réduire la liste':'Afficher les '+rows.length+' communes');
   more.type='button';more.onclick=()=>{state.showAll=!state.showAll;draw()};p.append(more);
  }
  p.append(el('p','rp-small','Classement sur '+rows.length+' communes disposant d’un indicateur, parmi '+(epci.communes_total||rows.length)+' communes de l’EPCI. Présentation : 12 communes les plus peuplées et commune étudiée (ou toutes les communes si moins de 14). L’indicateur d’une petite commune peut provenir d’une maille réunissant plusieurs communes.'));
  root.append(p);
 }
 function bottom(root){
  const b=box('Comment lire ces loyers');
  b.append(el('p','rp-description','Ce sont des loyers d’annonce : ils décrivent le marché pour un logement remis en location aujourd’hui. Les baux en cours, souvent plus anciens et moins chers, ne sont pas comptés. Le loyer moyen effectivement payé par les locataires est donc généralement différent.'));
  b.append(el('p','rp-description','Plus l’intervalle de prédiction est large, moins l’estimation est sûre. Les petites communes sans annonces suffisantes partagent parfois la valeur d’un même groupe de communes voisines. Comparer les loyers d’un millésime à l’autre ne permet pas systématiquement de mesurer une augmentation des loyers à périmètre constant.'));
  root.append(b);
  const foot=el('div','rp-foot');
  foot.append(el('span',null,'ⓘ'));
  const text=el('p');
  text.append(document.createTextNode('Carte des loyers 2022 à 2025 — ANIL / DGALN (Ministère chargé du Logement). Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin. Loyers mensuels charges comprises, par m², pour des logements loués vides. '));
  text.append(link('ANIL 2025',sourceURL));
  for(const year of [2022,2023,2024]){
    text.append(document.createTextNode(' · '));
    text.append(link('ANIL '+year,'https://www.data.gouv.fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-'+year));
  }
  text.append(document.createTextNode(' · Rendement : données DVF+ DGFiP / Cerema. '));
  text.append(link('Jeu de données DVF+',dvfURL));
  text.append(document.createTextNode(' · Licence Ouverte 2.0. Traitement : Atlas Territoires.'));
  foot.append(text);root.append(foot);
 }
 function draw(){
  if(!host||!current)return;
  host.replaceChildren();host.className='rp-root';
  host.append(el('p','rp-eyebrow rp-head-kicker','IMMO'));
  host.append(el('h1',null,'Loyers du parc locatif privé'));
  host.append(el('p','rp-intro','Loyers d’annonce au m², charges comprises — '+(current.loc?.commune||'Commune recherchée')+' (carte des loyers 2025)'));
  kpis(host);allCharts(host);epciSection(host);bottom(host);
 }
 function render(root,site){
  host=root;current=site;draw();return true;
 }
 window.AtlasLoyersPage={render};
})();
