'use strict';
(function(){
 const SOURCE='https://www.data.gouv.fr/datasets/liste-des-communes-selon-le-zonage-abc/';
 const MAP='https://www.ecologie.gouv.fr/sites/default/files/documents/Carte_France_zonage_ABC_2026.pdf';
 const LEGAL='https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054306084';
 const zones=[
  {code:'A bis',titre:'Tension très forte',details:'Paris et communes à très forte tension'},
  {code:'A',titre:'Tension forte',details:'Grandes agglomérations, Genevois français, Côte d’Azur'},
  {code:'B1',titre:'Tension marquée',details:'Grandes villes et communes chères'},
  {code:'B2',titre:'Tension modérée',details:'Villes moyennes'},
  {code:'C',titre:'Marché détendu',details:'Reste du territoire'}
 ];
 function make(tag,cls,label){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(label!==undefined&&label!==null)node.textContent=String(label);
  return node;
 }
 function link(label,url,cls){
  const a=make('a',cls,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
 }
 const plain=d=>d===true?'Oui':d===false?'Non':'—';
 function render(root,state){
  root.classList.add('za-root');
  const d=state.zonageData;
  const confirmed=d?.statut==='disponible'&&zones.some(z=>z.code===d.zone);
  const loc=state.loc||{};
  const current=confirmed?d.zone:null;
  const department=confirmed?d.departement:(loc?.code_insee&&/^\d{5}$/.test(loc.code_insee)?loc.code_insee.slice(0,2):null);
  const city=loc.commune||'Commune recherchée';
  const caption=make('div','za-license');
  caption.append(document.createTextNode('Ministère du Logement — Licence Ouverte 2.0 ('),
    link('page du jeu',SOURCE),document.createTextNode(')'));
  root.append(caption);
  root.append(make('h1',null,'Zonage ABC'));
  root.append(make('p','za-intro','Tension du marché du logement — '+city));

  const cards=make('div','za-kpis');
  function kpi(heading,value,sub,color=''){
   const box=make('div','za-kpi');
   box.append(make('div','za-label',heading),make('strong','za-value '+color,value),make('small','za-sub',sub));
   return box;
  }
  const sector=zones.find(z=>z.code===current);
  cards.append(kpi('ZONE DE LA COMMUNE',current||'—',
    sector?sector.titre:(d?.statut==='indisponible'?'Donnée indisponible':'Chargement…'),'green'));
  cards.append(kpi('RECLASSEMENT JUIN 2026',confirmed?plain(d.reclassement_juin_2026):'—',
    confirmed?(d.reclassement_juin_2026?'zone modifiée par l’arrêté du 23 juin 2026':'zone inchangée'):'En attente du classement officiel'));
  cards.append(kpi('DÉPARTEMENT',department||'—','code département'));
  root.append(cards);

  const section=make('section','za-panel');
  const head=make('div','za-panel-head');
  const left=make('div');
  left.append(make('h2',null,'Position de la commune dans le zonage'),
    make('p','za-muted','Les dispositifs d’aide (plafonds de loyer et de ressources) suivent cette classification'));
  head.append(left,make('span','za-chip','DHUP — juin 2026'));
  section.append(head);

  const list=make('div','za-list');
  for(const zone of zones){
   const selected=current===zone.code;
   const row=make('div','za-zone-row'+(selected?' selected':''));
   const chip=make('span','za-zone-chip',zone.code);
   const desc=make('div','za-zone-desc');
   desc.append(make('strong',null,zone.titre),make('small',null,zone.details));
   const end=make('div','za-zone-end');
   end.append(link('Voir le périmètre',MAP,'za-map-link'));
   if(selected)end.append(make('span','za-selected-tag','Commune analysée'));
   row.append(chip,desc,end);list.append(row);
  }
  section.append(list);
  if(d?.statut==='indisponible')section.append(make('p','za-warning',
    'Le zonage de cette commune n’a pas pu être confirmé dans la base officielle. Les cinq classes restent visibles sans sélection.'));
  root.append(section);

  const bottom=make('div','za-footer');
  bottom.append(make('span','za-icon','ⓘ'));
  const text=make('p');
  text.append(document.createTextNode('Source : zonage A/B/C en vigueur depuis le 26 juin 2026 — Ministère de la Transition écologique et du Logement (arrêté du 23 juin 2026). Le zonage conditionne les plafonds de plusieurs dispositifs d’aide au logement. La révision de juin 2026 concerne uniquement Alfortville (94) ; l’arrêté de septembre 2025 avait reclassé 468 communes. Traitement : Atlas Territoires. '));
  text.append(link('Liste officielle des communes',SOURCE),document.createTextNode(' · '));
  text.append(link('Arrêté du 23 juin 2026',LEGAL),document.createTextNode(' · Licence : Ministère du Logement — Licence Ouverte 2.0.'));
  bottom.append(text);root.append(bottom);
  return true;
 }
 window.AtlasZonagePage={render};
})();
