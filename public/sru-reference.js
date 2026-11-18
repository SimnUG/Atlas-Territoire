'use strict';
(function(){
 const SOURCE='https://www.data.gouv.fr/datasets/communes-et-inventaire-sru/';
 const el=(tag,className,value)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(value!==undefined&&value!==null)node.textContent=String(value);
  return node;
 };
 const decimal=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1});
 const money=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
 const percent=x=>typeof x==='number'&&Number.isFinite(x)?decimal.format(x)+' %':'—';
 const euro=x=>typeof x==='number'&&Number.isFinite(x)?money.format(x)+' €':'—';
 function render(root,state){
  root.classList.add('sru-root');
  const d=state.sruData,has=d?.statut==='disponible';
  const city=state.loc?.commune||d?.commune||'Commune recherchée';
  const rate=has?d.taux_sru:null,goal=has?d.taux_cible:null,paid=has?d.prelevement_net:null;
  const progress=typeof rate==='number'&&typeof goal==='number'&&goal>0
   ?Math.max(0,Math.min(100,rate/goal*100)):null;

  const license=el('p','sru-license');
  license.append(document.createTextNode('Ministère du Logement — Licence Ouverte 2.0 ('));
  const dataset=el('a',null,'page du jeu');dataset.href=SOURCE;
  dataset.target='_blank';dataset.rel='noopener noreferrer';license.append(dataset,document.createTextNode(')'));
  root.append(license);

  root.append(el('h1',null,'Loi SRU'));
  root.append(el('p','sru-intro','Obligations de logements sociaux — '+city+' (Au 1er janvier 2025)'));

  const kpis=el('div','sru-kpis');
  function kpi(label,value,desc,cls){
   const block=el('div','sru-kpi');
   block.append(el('span','sru-kpi-label',label));
   block.append(el('strong','sru-kpi-value '+cls,value));
   block.append(el('small','sru-kpi-sub',desc));
   return block;
  }
  kpis.append(kpi('TAUX SRU ACTUEL',percent(rate),'taux cible : '+percent(goal),'pink'));
  kpis.append(kpi('PRÉLÈVEMENT NET DONT MAJORATION',euro(paid),
   paid===null?'non publié pour cette commune':'montant à régler','orange'));
  root.append(kpis);

  const objective=el('section','sru-panel sru-progress');
  objective.append(el('h2',null,'Progression vers le taux cible'));
  objective.append(el('p','sru-muted','Objectif : '+(goal===null?'non renseigné':percent(goal)+' de logements sociaux')));
  const line=el('div','sru-progress-line'),track=el('div','sru-progress-track'),fill=el('div','sru-progress-fill');
  fill.style.width=(progress===null?0:progress)+'%';track.append(fill);
  line.append(track,el('span','sru-progress-value',percent(rate)+' / '+percent(goal)));
  objective.append(line);
  root.append(objective);

  const situation=el('section','sru-panel sru-situation');
  const row=el('div','sru-situation-top');
  const left=el('div');
  left.append(el('h2',null,'Situation de la commune'));
  left.append(el('p','sru-muted','Obligations SRU'));
  const tag=el('span','sru-source-tag','Source : Inventaire SRU');
  row.append(left,tag);situation.append(row);
  const report=el('div','sru-status-row');
  report.append(el('span',null,'Bilan au 1er janvier 2025'));
  let status='—',cls='neutral';
  if(d?.statut==='hors_perimetre'){status='Commune non répertoriée';}
  else if(has){
   status=d.situation||'Statut non publié';
   if(d.exemptee||/exempt/i.test(status))cls='neutral';
   else if(/deficit|carenc/i.test(status))cls='deficit';
   else if(/atteint|conform|respect/i.test(status))cls='success';
  }else if(!d){status='Chargement des données…';}
  else{status='Données indisponibles';}
  report.append(el('span','sru-status '+cls,status));situation.append(report);
  if(d?.statut==='hors_perimetre')
   situation.append(el('p','sru-explanation',d.message||'Cette commune ne figure pas dans le dernier inventaire SRU.'));
  if(d?.statut==='indisponible')
   situation.append(el('p','sru-explanation','Le fichier officiel ne peut pas être chargé actuellement. Aucune valeur n’est estimée.'));
  root.append(situation);

  const foot=el('div','sru-footnote');
  foot.append(el('span','sru-info','ⓘ'));
  const description=el('p');
  description.append(document.createTextNode('Source : Inventaire SRU (loi Solidarité et Renouvellement Urbain, art. 55) — Ministère chargé du Logement, périmètre des communes suivies en 2026 (bilan au 1er janvier 2025). Le taux cible dépend du régime applicable à la commune (20 % ou 25 %). Le prélèvement net inclut la majoration lorsqu’elle est publiée. Les communes absentes du fichier ne sont pas automatiquement considérées comme conformes. Publication : août 2026. Traitement : Atlas Territoires. '));
  const link=el('a',null,'Consulter le jeu officiel');link.href=SOURCE;link.target='_blank';link.rel='noopener noreferrer';
  description.append(link,document.createTextNode('. Licence : Ministère du Logement — Licence Ouverte 2.0.'));
  foot.append(description);root.append(foot);
  return true;
 }
 window.AtlasSruPage={render};
})();
