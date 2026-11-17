'use strict';
(function(){
const INSEE='https://www.insee.fr/fr/statistiques/8998241';
const DETAILS='https://www.insee.fr/fr/statistiques/9004805';
const nf=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
const pf=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1});
const mk=(tag,cls,content)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(content!==undefined)x.textContent=String(content);return x};
const add=(p,...children)=>(p.append(...children.filter(Boolean)),p);
const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const num=n=>valid(n)?nf.format(Math.round(n)):'—';
const percent=(n,d)=>valid(n)&&valid(d)&&d>0?pf.format(n/d*100)+' %':'—';
function panel(parent,title,subtitle,klass=''){
 const p=mk('section','mr-card '+klass),heading=mk('div','mr-card-heading');
 heading.append(mk('h2','',title));
 if(subtitle)heading.append(mk('p','',subtitle));
 p.append(heading);parent.append(p);return p;
}
function button(label,cls,handler){const b=mk('button',cls,label);b.type='button';if(handler)b.onclick=handler;return b}
function meter(parent,label,value,denom,max,color){
 const r=mk('div','mr-bar-row'),track=mk('span','mr-bar-track'),fill=mk('span','mr-bar-fill');
 fill.style.width=valid(value)?Math.max(2,100*value/Math.max(1,max))+'%':'0%';
 if(color)fill.style.background=color;
 track.append(fill);
 add(r,mk('span','mr-bar-name',label),track,mk('b','mr-bar-count',num(value)),mk('span','mr-bar-share',percent(value,denom)));
 parent.append(r);return r;
}
function profileGrid(parent,profileData){
 const grid=mk('div','mr-profiles');
 for(const title of ['Répartition par CSP de la personne de référence','Âge de la personne de référence du ménage','Statut d’occupation actuel du logement','Taille du ménage']){
  const col=mk('div','mr-profile');
  col.append(mk('h4',null,title));
  const labels=title.startsWith('Répartition')?['Ouvriers','Professions intermédiaires','Employés','Chômeurs','Retraités','Cadres et prof. intellectuelles supérieures']:title.startsWith('Âge')?['25 à 39 ans','40 à 54 ans','55 à 64 ans']:title.startsWith('Statut')?['Propriétaire','Locataire du parc privé','Locataire du parc social']:['1 personne','2 personnes','3 personnes','4 personnes','5 personnes','6 personnes ou plus'];
  for(const label of labels){
   const table=title.startsWith('Répartition')?'csp':title.startsWith('Âge')?'age':title.startsWith('Statut')?'occupation':'menage';
   const found=profileData?.distributions?.[table]?.find(x=>x.label===label);
   const values=profileData?.distributions?.[table]||[];
   meter(col,label,found?.valeur??null,profileData?.total??null,Math.max(1,...values.map(x=>x.valeur)));
  }
  grid.append(col);
 }
 parent.append(grid);
}
function placeholderLegend(parent){
 const leg=mk('div','mr-legend');
 const categories=[
 ['Dans la même commune','#d4117b'],
 ['Même département (hors commune)','#ee2b91'],
 ['Autre département de la région','#ef7eb2'],
 ['Autre région (métropole)','#f5b0d1'],
 ['Étranger','#f9d9e9']
 ];
 for(const [label,color] of categories){const x=mk('span');const dot=mk('i');dot.style.background=color;x.append(dot,mk('span',null,label));leg.append(x)}
 parent.append(leg);
}
function showRows(parent,items,denom,select){
 let expanded=false,selected=0;
 const holder=mk('div','mr-movements-list'),count=mk('div','mr-list-footer');
 parent.append(holder,count);
 const draw=()=>{
  holder.replaceChildren();
  holder.append(add(mk('div','mr-movements-header'),mk('span',null,'Territoire / mouvement'),mk('span',null,'Personnes'),mk('span',null,'Part')));
  const visible=expanded?items:items.slice(0,10);
  visible.forEach((o,i)=>{
   const row=mk('button','mr-movement'+(selected===i?' active':''));
   row.type='button';
   add(row,mk('span','mr-move-name',(i+1)+'.　'+o.nom),mk('strong',null,num(o.valeur)),mk('b',null,percent(o.valeur,denom)));
   row.onclick=()=>{selected=i;draw();select(o,denom)};
   holder.append(row);
  });
  count.replaceChildren();
  if(items.length>10)count.append(button(expanded?'Voir moins':'⊕  Voir les '+(items.length-10)+' suivantes','mr-see-more',()=>{expanded=!expanded;draw()}));
 };
 draw();if(items.length)select(items[0],denom);
}
function infoChip(label,number,sub,active){
 return add(mk('div','mr-kpi'+(active?' active':'')),mk('small',null,label),mk('strong',null,num(number)),mk('span',null,sub));
}
function arrowChart(parent,city,items){
 const wrap=mk('div','mr-flux-canvas');
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 820 555');
 svg.setAttribute('role','img');svg.setAttribute('aria-label','Diagramme de flux entrants vers '+city);
 const ns='http://www.w3.org/2000/svg',s=(tag,props,text)=>{
  const n=document.createElementNS(ns,tag);Object.entries(props||{}).forEach(([k,v])=>n.setAttribute(k,String(v)));
  if(text!==undefined)n.textContent=text;return n;
 };
 const real=items.length>0,list=real?items.slice(0,10):Array.from({length:10},(_,i)=>({nom:'Commune d’origine',valeur:null}));
 const center=[410,260],positions=[
 [410,46],[580,78],[713,183],[716,323],[579,442],
 [410,480],[237,442],[103,323],[106,183],[237,78]
 ];
 const defs=s('defs');defs.append(s('marker',{id:'mr-end',viewBox:'0 0 10 10',refX:8,refY:5,markerWidth:5,markerHeight:5,orient:'auto-start-reverse'}));
 defs.firstChild.append(s('path',{d:'M0 0 L10 5 L0 10 Z',fill:'#e01883'}));svg.append(defs);
 const mx=Math.max(1,...list.map(x=>x.valeur||0));
 list.forEach((o,i)=>{
  const p=positions[i],dx=center[0]-p[0],dy=center[1]-p[1],dist=Math.hypot(dx,dy),ux=dx/dist,uy=dy/dist;
  svg.append(s('line',{x1:p[0]+ux*53,y1:p[1]+uy*25,x2:center[0]-ux*38,y2:center[1]-uy*38,
   stroke:real?'#e01883':'#f5bfdc','stroke-width':real?Math.max(2,7*(o.valeur||0)/mx):2,'stroke-linecap':'round','marker-end':'url(#mr-end)'}));
 });
 svg.append(s('circle',{cx:center[0],cy:center[1],r:43,fill:'#df0a77'}));
 svg.append(s('text',{x:center[0],y:center[1],fill:'#fff','font-size':13,'font-weight':800,'text-anchor':'middle','dominant-baseline':'middle'},city.length>19?city.slice(0,18)+'…':city));
 list.forEach((o,i)=>{
  const [x,y]=positions[i];
  const group=s('g');
  group.append(s('rect',{x:x-72,y:y-22,width:144,height:44,rx:9,fill:'#fff',stroke:'#e4e7ef'}));
  group.append(s('text',{x,y:y-5,'text-anchor':'middle',fill:'#324160','font-size':11,'font-weight':700},real?(o.nom.length>23?o.nom.slice(0,21)+'…':o.nom):'—'));
  group.append(s('text',{x,y:y+13,'text-anchor':'middle',fill:'#d90d79','font-size':16,'font-weight':800},num(o.valeur)));
  svg.append(group);
 });
 wrap.append(svg);parent.append(wrap);
 const l=mk('div','mr-flux-legend');l.append(mk('b',null,'Légende'),mk('p',null,'Largeur des flèches : nombre de personnes'));
 for(const thickness of [2,4,8]){const item=mk('div');const line=mk('i');line.style.height=thickness+'px';item.append(line,mk('span',null,real?'Flux proportionnels aux valeurs observées':'Données à compléter'));l.append(item)}
 parent.append(l);
}
function render(root,state){
 root.classList.add('migration-root');
 const city=state.loc?.commune||'Commune étudiée',data=state.migrationsData?.statut==='disponible'?state.migrationsData:null;
 const detail=state.migrationsDetail?.statut==='disponible'?state.migrationsDetail:null;
 const baseOrigins=Array.isArray(data?.origines)?data.origines.filter(x=>valid(x.valeur)&&x.valeur>0):[];
 const origins=baseOrigins.length?baseOrigins:
   Object.entries(detail?.profilsParOrigine||{}).filter(([code])=>code!==state.loc?.code_insee)
    .map(([code,p])=>({code,nom:code==='99999'?'Étranger':'Commune '+code,valeur:p.total}))
    .sort((a,b)=>b.valeur-a.valeur);
 const incoming=valid(data?.entrants)?data.entrants:
 detail?Object.entries(detail.repartition).filter(([k])=>['3','4','5','6','7','8','9'].includes(k)).reduce((s,[,v])=>s+v,0):null;
 const intra=valid(detail?.intra)?detail.intra:valid(data?.mobiliteIntra)?data.mobiliteIntra:null;
 const moved=valid(detail?.mobiles?.total)?detail.mobiles.total:valid(intra)&&valid(incoming)?intra+incoming:null;
 const total=valid(detail?.total)?detail.total:valid(data?.total)?data.total:null;
 const stable=valid(detail?.memeLogement)?detail.memeLogement:null;
 const intro=mk('div','mr-intro');
 add(intro,mk('span','mr-kicker','INSEE — Licence Ouverte 2.0 (page du jeu)'),mk('h1',null,'Migrations résidentielles'),
  mk('p',null,'Mobilité résidentielle sur un an — '+city+' · INSEE, recensement 2023'));
 const method=button('ⓘ  Informations méthodologiques','mr-method',()=>{
  const element=root.querySelector('.mr-footer');element?.scrollIntoView({behavior:'smooth'});
 });
 intro.append(method);root.append(intro);
 const first=mk('div','mr-top-grid'),left=panel(first,'Mobilité résidentielle des habitants de '+city,'','mr-overview'),
 right=panel(first,'Qui sont les personnes ayant changé de logement ?','Lecture selon les caractéristiques de la personne de référence du ménage','mr-persons');
 const kpis=mk('div','mr-kpis');
 kpis.append(infoChip('Population étudiée',total,'100,0 %'),infoChip('Même logement',stable,percent(stable,total)),
   infoChip('A changé de logement',moved,percent(moved,total),true),infoChip('Rattaché hors logement ordinaire',detail?.horsOrdinaire??null,percent(detail?.horsOrdinaire,total)));
 left.append(kpis);
 left.append(mk('h3','mr-section-label','Répartition des mobilités résidentielles identifiables'));
 const band=mk('div','mr-band');
 const color=['#d20b78','#e72c8c','#ee79b1','#f3acd0','#f9d7e8'];
 if(detail&&valid(moved)&&moved>0){
  const values=['2','3','4','5','6','7','8','9'].map(k=>detail.repartition[k]||0);
  for(let n=0;n<values.length;n++){const v=values[n];if(!v)continue;const seg=mk('span');
   seg.style.background=color[Math.min(color.length-1,Math.floor(n/2))];seg.style.width=100*v/moved+'%';seg.title=['Même commune','Même département','Même région','Autre région','DOM','COM','UE','Hors UE'][n]+ ' : '+num(v);band.append(seg)}
 }else if(valid(intra)&&valid(incoming)&&moved>0){
  for(const [n,v] of [intra,incoming].entries()){const seg=mk('span');seg.style.background=color[n];seg.style.width=100*v/moved+'%';band.append(seg)}
 }else for(const [i,w] of [42,20,17,13,8].entries()){const seg=mk('span');seg.style.width=w+'%';seg.style.background=color[i];seg.className='mr-empty-seg';band.append(seg)}
 left.append(band);placeholderLegend(left);
 const small=mk('div','mr-inline-summary');
 add(small,mk('strong',null,'Mobilité intra-communale : '+num(intra)+' personnes'),mk('strong',null,'Entrants extra-communaux : '+num(incoming)+' personnes'));
 left.append(small);
 const chips=mk('div','mr-choice-chips');let current='CSP';
 for(const label of ['CSP','Âge de la personne de référence','Statut d’occupation actuel','Taille du ménage']){
  const b=button(label,'mr-pill'+(label===current?' selected':''),()=>{
   current=label;chips.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));
   const title=right.querySelector('.mr-profile-heading');if(title)title.textContent='Répartition par '+label.toLowerCase();fillMainProfile();
  });chips.append(b);
 }
 right.append(chips,mk('h3','mr-profile-heading','Répartition par CSP'));
 const defaults=['Ouvriers','Professions intermédiaires','Employés','Chômeurs','Retraités','Cadres et prof. intellectuelles supérieures','Artisans, commerçants, chefs d’entreprise','Hors logement ordinaire'];
 const profile=mk('div','mr-profile-bars');
 const fillMainProfile=()=>{
  profile.replaceChildren();
  const type=current==='CSP'?'csp':current==='Âge de la personne de référence'?'age':current==='Statut d’occupation actuel'?'occupation':'menage';
  const values=detail?.mobiles?.distributions?.[type]||[];
  const top=Math.max(1,...values.map(v=>v.valeur));
  if(values.length)for(const v of values)meter(profile,v.label,v.valeur,detail.mobiles.total,top);
  else for(const label of defaults)meter(profile,label,null,null,1);
 };
 fillMainProfile();right.append(profile);
 right.append(add(mk('div','mr-profile-total'),mk('strong',null,'Total personnes mobiles : '+num(moved))));
 first.append(left,right);root.append(first);
 const movements=panel(root,'Quels sont les mouvements résidentiels et quel est leur profil ?',
  'Analyse des mobilités intra-communales et des provenances extra-communales vers '+city,'mr-movement-section');
 const contents=mk('div','mr-movement-grid'),ranking=mk('div','mr-sub-card'),selected=mk('div','mr-sub-card');
 ranking.append(mk('h3',null,'Top Ten Mouvements intra et extra communaux'),
  mk('p','mr-sub-caption','Personnes mobiles : '+num(moved)),mk('p','mr-pink-caption','Cliquez sur la commune que vous souhaitez explorer.'));
 const selectArea=mk('div','mr-selected'),title=mk('h3',null,'Profil selon le mouvement sélectionné'),
 heading=mk('p','mr-selected-label','Mouvement sélectionné : —'),
 count=mk('p','mr-sub-caption','— personnes · — % des personnes mobiles');
 selected.append(title,heading,count,mk('label','mr-select-label','1. Choisissez une CSP'));
 const select=document.createElement('select');select.className='mr-select';
 const cspOptions=[['_T','Ensemble des CSP'],['6','Ouvriers'],['4','Professions intermédiaires'],['5','Employés'],['12','Chômeurs'],['3','Cadres'],['2','Artisans, commerçants et chefs d’entreprise'],['1','Agriculteurs exploitants'],['21','Retraités'],['autres','Autres personnes']];
 for(const [value,label] of cspOptions){const o=mk('option',null,label);o.value=value;select.append(o)}
 select.disabled=true;selected.append(select,mk('p','mr-muted','Profil pondéré par IPONDI — données du recensement 2023.'));
 const selectedGrid=mk('div');selected.append(selectedGrid);
 selected.append(mk('p','mr-muted','Dénominateur : personnes concernées par le mouvement sélectionné.'));
 const selectMovement=(o,d)=>{
  heading.textContent='Mouvement sélectionné : '+o.nom;
  const detailProfile=detail?.profilsParOrigine?.[o.code];selectedGrid.dataset.origin=o.code||'';select.value='_T';
  count.textContent=num(detailProfile?.total??o.valeur)+' personnes · '+percent(detailProfile?.total??o.valeur,d)+' des personnes mobiles';
  selectGridUpdate(detailProfile);
 };
 function selectGridUpdate(data){
   const selectedProfile=select.value==='_T'?data:data?.parCsp?.[select.value];
   selectedGrid.replaceChildren();profileGrid(selectedGrid,selectedProfile||null);
   select.disabled=!data;
 }
 select.onchange=()=>{const chosen=selectedGrid.dataset.origin;
   selectGridUpdate(detail?.profilsParOrigine?.[chosen]||null)};

 const list=[{code:state.loc?.code_insee,nom:city+' – intra-communal',valeur:intra},...origins];
 if(list.length===1&&!valid(intra))for(let i=1;i<11;i++)list.push({nom:'Commune à renseigner',valeur:null});
 showRows(ranking,list,moved,selectMovement);
 ranking.append(add(mk('div','mr-inline-summary'),mk('strong',null,'Mobilité intra-communale : '+num(intra)+' personnes'),mk('strong',null,'Entrants extra-communaux : '+num(incoming)+' personnes')));
 contents.append(ranking,selected);movements.append(contents);
 const view=button('Voir la carte des flux ↓','mr-map-button',()=>root.querySelector('.mr-flow-section')?.scrollIntoView({behavior:'smooth'}));
 movements.append(add(mk('div','mr-map-button-wrap'),view));
 const lower=mk('div','mr-flow-section'),flowMap=mk('div','mr-flow-graphic'),side=mk('div','mr-flow-side');
 arrowChart(flowMap,city,origins);
 const sideTitle=mk('h2',null,'Analyse des flux entrants vers '+city);
 side.append(sideTitle,mk('p','mr-muted','Arrivées venues d’un autre territoire à destination de '+city));
 const statrow=mk('div','mr-flow-stats');
 const shown=origins.slice(0,10).reduce((s,x)=>s+x.valeur,0);
 statrow.append(infoChip('Arrivées d’un autre territoire',incoming,'personnes'),
 infoChip('Origines affichées',origins.length?Math.min(10,origins.length):null,'TOP 10'),
 infoChip('Flux représentés',origins.length?shown:null,percent(shown,incoming)));
 side.append(statrow,mk('h3','mr-section-label','Principales provenances'));
 const rankRows=mk('div','mr-flux-bars');if(origins.length)for(const o of origins.slice(0,10))meter(rankRows,o.nom,o.valeur,incoming,Math.max(1,origins[0].valeur));
 else for(let i=0;i<10;i++)meter(rankRows,'Commune d’origine',null,null,1);
 side.append(rankRows);
 const link=button('⊕  Voir les provenances suivantes','mr-see-more',()=>{const last=side.querySelector('.mr-more-origins');if(last){last.remove();return}
 const more=mk('div','mr-more-origins');for(const o of origins.slice(10))meter(more,o.nom,o.valeur,incoming,Math.max(1,origins[0].valeur));side.append(more)});
 side.append(link,mk('p','mr-flow-note','Les 10 origines affichées représentent '+num(origins.length?shown:null)+' personnes, soit '+percent(origins.length?shown:null,incoming)+' des entrants.'));
 lower.append(flowMap,side);root.append(lower);
 const foot=mk('div','mr-footer');
 foot.append(mk('p',null,'ⓘ Sources : INSEE, Recensement 2023. Mobilités et profils individuels issus du fichier MIGCOM en géographie 2025, pondérés par IPONDI ; flux entre communes issus de la base des flux en géographie 2026. Les deux géographies peuvent différer pour les communes modifiées. Les indicateurs affichent « — » lorsqu’aucune donnée vérifiée n’est disponible.'));
 const refs=mk('div');for(const [name,url] of [['Base de flux INSEE',INSEE],['Fichier détail INSEE',DETAILS],['Ville-Data (référence complémentaire)', 'https://ville-data.com/']]){
 const a=mk('a',null,name);a.href=url;a.target='_blank';a.rel='noopener noreferrer';refs.append(a)}
 foot.append(refs);root.append(foot);
 return true;
}
window.AtlasMigrationsPage={render};
})();