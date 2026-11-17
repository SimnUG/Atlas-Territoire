'use strict';
(function(){
const SOURCE='https://www.insee.fr/fr/statistiques/8998241';
const integer=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(n);
const pct=(n,d)=>d>0?(n/d*100).toLocaleString('fr-FR',{maximumFractionDigits:1})+' %':'—';
const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x};
const add=(parent,...nodes)=>{parent.append(...nodes);return parent};
const mk=(tag,cls,text)=>el(tag,cls,text);
function card(parent,title,desc){
 const c=mk('section','mig-card'),head=mk('div','mig-title',title);
 c.append(head);if(desc)c.append(mk('p','mig-desc',desc));parent.append(c);return c;
}
function rows(container,entries,total,maxItems){
 const all=entries.filter(x=>Number.isFinite(x.valeur)&&x.valeur>0);
 const wrap=mk('div','mig-bars');container.append(wrap);
 let showAll=false;
 const render=()=>{
  wrap.replaceChildren();
  const max=Math.max(1,...all.map(x=>x.valeur));
  const items=showAll?all:all.slice(0,maxItems||10);
  items.forEach(x=>{
   const r=mk('div','mig-row'),track=mk('div','mig-track'),fill=mk('span','mig-fill');
   fill.style.width=Math.max(1,x.valeur/max*100)+'%';track.append(fill);
   add(r,mk('span','mig-lab',x.nom),track,mk('b','mig-num',integer(Math.round(x.valeur))),mk('small','mig-pct',pct(x.valeur,total)));
   wrap.append(r);
  });
  if(all.length>maxItems){
   const more=mk('button','mig-more',showAll?'Voir moins':'Voir les '+(all.length-maxItems)+' suivants');
   more.type='button';more.onclick=()=>{showAll=!showAll;render()};wrap.append(more);
  }
 };
 render();
}
function marker(v,label,sub,active=false){
 return add(mk('div','mig-stat'+(active?' is-active':'')),mk('small',null,label),mk('strong',null,v),mk('span',null,sub));
}
function profileUnavailable(section){
 section.append(mk('div','mig-explain','Les ventilations CSP, âge, statut d’occupation et taille du ménage nécessitent le fichier détail national INSEE MIGCOM 2023. Aucun profil n’est déduit des simples flux de communes.'));
 const select=mk('select','mig-select');
 ['CSP','Âge de la personne de référence','Statut d’occupation actuel','Taille du ménage'].forEach(s=>select.append(mk('option',null,s)));
 select.disabled=true;select.setAttribute('aria-label','Profils INSEE indisponibles');section.append(select);
 const info=mk('p','mig-hint','Le filtre sera activé dès que le fichier détail aura été relié et validé.');section.append(info);
}
function flowViz(panel,info){
 const items=info.origines.slice(0,10);
 if(!items.length)return;
 const box=mk('div','mig-diagram'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 720 480');svg.setAttribute('role','img');
 svg.setAttribute('aria-label','Diagramme des flux résidentiels vers '+info.commune);
 const n=items.length,center={x:360,y:230};
 const point=(i)=>({x:center.x+280*Math.cos(2*Math.PI*i/n-Math.PI/2),y:center.y+168*Math.sin(2*Math.PI*i/n-Math.PI/2)});
 const max=Math.max(...items.map(x=>x.valeur),1);
 items.forEach((o,i)=>{
  const p=point(i),angle=Math.atan2(center.y-p.y,center.x-p.x);
  const x1=p.x+Math.cos(angle)*55,y1=p.y+Math.sin(angle)*18;
  const x2=center.x-Math.cos(angle)*27,y2=center.y-Math.sin(angle)*27;
  const line=document.createElementNS('http://www.w3.org/2000/svg','line');
  [['x1',x1],['y1',y1],['x2',x2],['y2',y2],['stroke','#e31381'],['stroke-width',String(1.5+7*o.valeur/max)],['stroke-linecap','round'],['marker-end','url(#mig-arrow)']].forEach(([k,v])=>line.setAttribute(k,v));svg.append(line);
 });
 const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
 defs.innerHTML='<marker id="mig-arrow" markerWidth="6" markerHeight="6" refX="5.5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="#e31381"/></marker>';svg.prepend(defs);
 const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
 [['cx',center.x],['cy',center.y],['r','43'],['fill','#e31381']].forEach(([k,v])=>circle.setAttribute(k,v));svg.append(circle);
 const t=document.createElementNS('http://www.w3.org/2000/svg','text');
 t.setAttribute('x',center.x);t.setAttribute('y',center.y+5);t.setAttribute('text-anchor','middle');t.setAttribute('fill','white');
 t.setAttribute('font-size','12');t.setAttribute('font-weight','700');t.textContent=info.commune.length>20?info.commune.slice(0,18)+'…':info.commune;svg.append(t);
 items.forEach((o,i)=>{
  const p=point(i),g=document.createElementNS('http://www.w3.org/2000/svg','g');
  const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');
  [['x',p.x-73],['y',p.y-22],['width',146],['height',45],['rx',10],['fill','#fff'],['stroke','#e8eaf1']].forEach(([k,v])=>rect.setAttribute(k,v));g.append(rect);
  const name=document.createElementNS('http://www.w3.org/2000/svg','text');
  [['x',p.x],['y',p.y-4],['text-anchor','middle'],['font-size','11'],['fill','#293654']].forEach(([k,v])=>name.setAttribute(k,v));
  name.textContent=o.nom.length>22?o.nom.slice(0,20)+'…':o.nom;g.append(name);
  const value=document.createElementNS('http://www.w3.org/2000/svg','text');
  [['x',p.x],['y',p.y+13],['text-anchor','middle'],['font-size','15'],['font-weight','700'],['fill','#d70b7b']].forEach(([k,v])=>value.setAttribute(k,v));
  value.textContent=integer(Math.round(o.valeur));g.append(value);svg.append(g);
 });
 box.append(svg);panel.append(box);
}
function render(root,state){
 const data=state.migrationsData;
 root.classList.add('migration-root');
 if(!state.loc?.code_insee){root.append(mk('p','mig-hint','Choisissez une adresse pour afficher les migrations de sa commune.'));return true}
 if(!data){
  const c=card(root,'Migrations résidentielles','Recensement INSEE 2023 · recherche des flux de la commune');
  c.append(mk('p','mig-hint',state.migrationsRequest?'Chargement des données officielles en cours…':'Connexion à la base INSEE en attente.'));
  return true;
 }
 if(data.statut!=='disponible'){
  const c=card(root,'Données de migrations indisponibles');
  c.append(mk('p','mig-hint',data.raison||'Le fichier officiel INSEE n’a pas pu être exploité pour cette commune.'));
  return true;
 }
 const total=data.total,internal=data.mobiliteIntra,incoming=data.entrants;
 const moved=internal+incoming,stay=Number.isFinite(total)?Math.max(0,total-moved):null;
 const top=mk('div','mig-grid');
 const a=card(top,'Mobilité résidentielle des habitants de '+data.commune,'Personnes âgées de 1 an ou plus · Recensement 2023');
 const stats=mk('div','mig-stats');
 if(Number.isFinite(total))stats.append(marker(integer(Math.round(total)),'Population étudiée','100 %'));
 if(stay!==null)stats.append(marker(integer(Math.round(stay)),'Sans changement de logement',pct(stay,total)));
 stats.append(marker(integer(Math.round(moved)),'Ayant changé de logement',pct(moved,total),true));
 stats.append(marker(integer(Math.round(incoming)),'Entrants extra-communaux',pct(incoming,total)));
 a.append(stats);
 const bands=mk('div','mig-band');
 if(internal>0){const x=mk('span','mig-band-intra');x.style.flex=String(internal);bands.append(x)}
 if(incoming>0){const x=mk('span','mig-band-outer');x.style.flex=String(incoming);bands.append(x)}
 a.append(mk('h3','mig-minititle','Répartition des mobilités identifiées'),bands,mk('p','mig-hint','Dans la commune : '+integer(Math.round(internal))+' · Depuis une autre commune : '+integer(Math.round(incoming))+'.'));
 const b=card(top,'Qui sont les personnes ayant changé de logement ?','Filtres de profil — fichier détail national INSEE');
 profileUnavailable(b);
 root.append(top);
 const middle=card(root,'Quels sont les mouvements résidentiels et quel est leur profil ?','Mouvements intra-communaux et provenances extra-communales vers '+data.commune);
 const cols=mk('div','mig-grid');
 const ranking=card(cols,'Top des communes de provenance','Cliquez une commune pour mettre en valeur sa contribution aux entrées');
 const ordered=[{code:data.code_insee,nom:data.commune+' — intra-communal',valeur:internal},...data.origines];
 rows(ranking,ordered,moved,10);
 const selected=card(cols,'Profil selon le mouvement sélectionné','Analyse par provenance : données de flux 2023');
 const selectedText=mk('div','mig-selection','Sélectionnez une commune dans le classement.');selected.append(selectedText);
 const list=ranking.querySelector('.mig-bars');
 list.addEventListener('click',ev=>{
  const row=ev.target.closest('.mig-row');if(!row)return;
  const index=[...row.parentElement.children].filter(x=>x.classList.contains('mig-row')).indexOf(row);
  const chosen=ordered[index];if(!chosen)return;
  selectedText.textContent=chosen.nom+' : '+integer(Math.round(chosen.valeur))+' personnes · '+pct(chosen.valeur,moved)+' des mobilités identifiées.';
 });
 selected.append(mk('p','mig-hint','La ventilation des profils individuels n’est pas fournie par la seule base des flux.'));
 cols.append(ranking,selected);middle.append(cols);
 const lower=mk('div','mig-grid mig-flow-grid');
 const map=card(lower,'Carte des flux entrants vers '+data.commune,'Diagramme des 10 principales provenances · largeur des flèches proportionnelle aux flux');
 flowViz(map,data);
 const right=card(lower,'Analyse des flux entrants','Origines d’un autre territoire de destination : '+data.commune);
 const top10=data.origines.slice(0,10);rows(right,top10,incoming,10);
 right.append(mk('p','mig-hint','Origines affichées : '+integer(Math.round(top10.reduce((s,x)=>s+x.valeur,0)))+' sur '+integer(Math.round(incoming))+' entrants.'));
 lower.append(map,right);root.append(lower);
 const foot=mk('p','mig-foot');
 foot.textContent='Source : INSEE — recensement de la population 2023, base flux des migrations résidentielles. Estimations pondérées ; la résidence antérieure est celle d’un an avant le recensement. Source Ville-Data non nécessaire pour ces flux.';
 const link=mk('a',null,' Consulter les données INSEE');link.href=SOURCE;link.target='_blank';link.rel='noopener noreferrer';foot.append(link);
 root.append(foot);
 return true;
}
window.AtlasMigrationsPage={render};
})();
