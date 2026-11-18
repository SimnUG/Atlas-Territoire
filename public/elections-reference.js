'use strict';
(function(){
const fmt=new Intl.NumberFormat('fr-FR'),pct=n=>typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('fr-FR',{maximumFractionDigits:1})+' %':'—';
const n=v=>typeof v==='number'&&Number.isFinite(v)?fmt.format(v):'—';
const ratio=(a,b)=>b>0?a*100/b:null;
const el=(tag,cls,t)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(t!==undefined)x.textContent=String(t);return x};
const append=(p,...nodes)=>(p.append(...nodes.filter(Boolean)),p);
const makeBtn=(label,klass,click)=>{const x=el('button',klass,label);x.type='button';if(click)x.onclick=click;return x};
const panel=(root,name,desc)=>{const p=el('section','el-card');p.append(el('h2',null,name));if(desc)p.append(el('p','el-sub',desc));root.append(p);return p};
const sorted=(a)=>[...a].sort((x,y)=>y.annee-x.annee||x.tour-y.tour);
function winner(r){
 if(!r?.candidats?.length)return null;
 return [...r.candidats].sort((a,b)=>b.voix-a.voix)[0];
}
function nuance(c){return c?.nuance||'Non renseignée'}
function nuanceColor(code){
 const x=(code||'').toUpperCase();
 if(x.includes('DVG')||x.includes('SOC')||x.includes('UG')||x.includes('EXG'))return '#ed88bd';
 if(x.includes('DVR')||x.includes('DVD')||x.includes('LR')||x.includes('UD')||x.includes('EXD'))return '#4e91d5';
 if(x.includes('MDM')||x.includes('ENS')||x.includes('CEN'))return '#e5ac15';
 return '#c6c8cc';
}
function voteBar(root,values,expressed){
 const bar=el('div','el-vote-bar'),legend=el('div','el-vote-legend');
 for(const c of values){
  const width=expressed>0?100*c.voix/expressed:0;
  const color=nuanceColor(c.nuance);
  const seg=el('span');seg.style.width=width+'%';seg.style.background=color;seg.textContent=width>12?pct(width):'';bar.append(seg);
  const txt=el('div'),bullet=el('i');bullet.style.background=color;
  append(txt,bullet,el('span',null,c.nom+' · '+n(c.voix)+' ('+pct(ratio(c.voix,expressed))+')'));
  legend.append(txt);
 }
 root.append(bar,legend);
}
function lineBar(parent,label,count,share,color='#c8ccda'){
 const row=el('div','el-line'),lab=el('span',null,label),back=el('span','el-line-track'),fill=el('i');
 fill.style.width=(typeof share==='number'&&Number.isFinite(share)?Math.max(1,Math.min(100,share)):0)+'%';fill.style.background=color;back.append(fill);
 append(row,lab,back,el('b',null,n(count)),el('small',null,pct(share)));parent.append(row);
}
function createTable(parent,headers,rows){
 const scroll=el('div','el-table-scroll'),table=el('table','el-table'),thead=el('thead'),tr=el('tr');
 for(const h of headers)tr.append(el('th',null,h));thead.append(tr);table.append(thead);
 const tbody=el('tbody');
 for(const values of rows){const r=el('tr');for(const v of values)r.append(el('td',null,v??'—'));tbody.append(r)}
 table.append(tbody);scroll.append(table);parent.append(scroll);
}
function section(root,title,fn,open=false){
 const box=el('section','el-accordion'),head=makeBtn(title,'el-acc-head');
 const body=el('div','el-acc-body');body.hidden=!open;
 head.append(el('span','el-acc-chevron',open?'⌃':'⌄'));head.onclick=()=>{body.hidden=!body.hidden;head.querySelector('.el-acc-chevron').textContent=body.hidden?'⌄':'⌃'};
 box.append(head,body);root.append(box);fn(body);return box;
}
function mapFrame(root,city,lat,lon,caption){
 const box=el('div','el-map-box');
 if(Number.isFinite(lat)&&Number.isFinite(lon)){
  const pad=.045;
  const f=el('iframe','el-map-frame');
  f.title='Carte géographique de '+city;
  f.loading='lazy';f.referrerPolicy='no-referrer';
  f.src='https://www.openstreetmap.org/export/embed.html?bbox='+[lon-pad,lat-pad,lon+pad,lat+pad].join('%2C')+'&layer=mapnik&marker='+lat+'%2C'+lon;
  box.append(f);
 }else box.append(el('div','el-map-placeholder','Localisation cartographique non disponible'));
 box.append(el('p','el-map-note',caption));root.append(box);
}
async function renderEpciMap(root,state){
 const holder=el('div','el-epci-map');root.append(holder);
 holder.append(el('p','el-muted','Chargement des contours communaux officiels et des nuances municipales 2026…'));
 try{
  const code=state.loc?.code_insee;
  let epci=state.admin?.epci?.code||state.admin?.commune?.code_epci;
  if(!epci){
   const req=await fetch('https://geo.api.gouv.fr/communes/'+encodeURIComponent(code)+'?fields=codeEpci,nom');
   if(!req.ok)throw Error('Référentiel communal indisponible');
   epci=(await req.json()).codeEpci;
  }
  if(!/^[0-9]{9}$/.test(epci||''))throw Error('Périmètre EPCI introuvable');
  const req=await fetch('https://geo.api.gouv.fr/epcis/'+encodeURIComponent(epci)+'/communes?geometry=contour&format=geojson');
  if(!req.ok)throw Error('Contours communaux indisponibles');
  const json=await req.json(),features=Array.isArray(json?.features)?json.features:[];
  if(!features.length)throw Error('Géométries communales indisponibles');
  const vertices=[];
  const rings=geometry=>{
   if(geometry?.type==='Polygon')return geometry.coordinates||[];
   if(geometry?.type==='MultiPolygon')return(geometry.coordinates||[]).flat();
   return [];
  };
  for(const feature of features)for(const ring of rings(feature.geometry))
   for(const [x,y] of ring)if(Number.isFinite(x)&&Number.isFinite(y))vertices.push([x,y]);
  if(!vertices.length)throw Error('Coordonnées communales absentes');
  const minX=Math.min(...vertices.map(x=>x[0])),maxX=Math.max(...vertices.map(x=>x[0]));
  const minY=Math.min(...vertices.map(x=>x[1])),maxY=Math.max(...vertices.map(x=>x[1]));
  const w=850,h=420,scale=Math.min((w-35)/Math.max(.001,maxX-minX),(h-35)/Math.max(.001,maxY-minY));
  const px=x=>(x-minX)*scale+(w-(maxX-minX)*scale)/2;
  const py=y=>h-((y-minY)*scale+(h-(maxY-minY)*scale)/2);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.setAttribute('role','img');
  svg.setAttribute('aria-label','Carte des communes de l’EPCI et nuances municipales 2026');
  const votes=state.electionsData?.nuances_departement_2026||{};
  const selected=el('div','el-map-detail','Sélectionnez une commune pour voir sa nuance municipale officielle');
  for(const feature of features){
   const code=feature.properties?.code||feature.id||'';
   const name=feature.properties?.nom||code;
   const winner=votes[code];
   const fill=winner?nuanceColor(winner.nuance):'#d8dadd';
   let d='';
   for(const ring of rings(feature.geometry)){ring.forEach(([x,y],i)=>{
    d+=(i?' L':' M')+px(x).toFixed(1)+' '+py(y).toFixed(1);
   });d+=' Z'}
   const shape=document.createElementNS('http://www.w3.org/2000/svg','path');
   shape.setAttribute('d',d);shape.setAttribute('fill',fill);
   shape.setAttribute('stroke',code===state.loc?.code_insee?'#25395e':'#fff');
   shape.setAttribute('stroke-width',code===state.loc?.code_insee?'3':'1.5');
   shape.setAttribute('tabindex','0');shape.setAttribute('role','button');
   const content=name+' · '+(winner?winner.nuance+' · '+winner.liste:'Résultat 2026 non indexé');
   const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=content;shape.append(title);
   shape.addEventListener('click',()=>{selected.textContent=content});
   shape.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selected.textContent=content}});
   svg.append(shape);
  }
  const leg=el('div','el-epci-legend');
  for(const [lab,color] of [['Divers gauche','#ed88bd'],['Divers droite','#4e91d5'],['Centre','#e5ac15'],['Autre / non indexé','#c6c8cc']]){
   const block=el('span');const dot=el('i');dot.style.background=color;block.append(dot,el('span',null,lab));leg.append(block);
  }
  holder.replaceChildren(svg,leg,selected,
   el('p','el-muted','Contours : API Géo du gouvernement. Couleurs : nuance de la liste arrivée en tête au premier tour des municipales 2026 selon le ministère de l’Intérieur ; gris lorsque le code ou la nuance n’est pas disponible.'));
 }catch(_){
  holder.replaceChildren();
  mapFrame(holder,state.loc?.commune||'',state.loc?.latitude,state.loc?.longitude,
   'Fond OpenStreetMap. Le coloriage électoral des communes n’est pas disponible pour ce périmètre.');
 }
}
function r2026(data){return data.find(x=>x.annee===2026&&x.tour===1)}
function commune(root,state,rs){
 const p=panel(root,'Résumé des résultats des dernières élections municipales','Commune · Municipales');
 createTable(p,['Municipales','Victoire','Gagnant','Nuance politique','Abstention'],rs.map(x=>{
  const w=winner(x);return [x.annee+' · T'+x.tour,x.tour===1?'Premier tour':'Deuxième tour',
   w?w.nom+' ('+pct(ratio(w.voix,x.exprimes))+')':'—',w?nuance(w):'—',pct(ratio(x.abstentions,x.inscrits))];
 }));
 const map=panel(root,'Situation de la commune au sein de son EPCI','Fond cartographique officiel OSM ; la couleur électorale n’est appliquée qu’aux territoires dont les résultats sont établis.');
 renderEpciMap(map,state);
 const behavior=section(root,'Comportements électoraux',b=>behavioral(b,rs),false);
 const candidates=section(root,'Résultats par candidats/nuances',b=>candidateHistory(b,rs),false);
 const persona=section(root,'Personae — portrait de la commune',b=>personaContent(b,state),false);
}
function behavioral(root,rs){
 const rounds=sorted(rs);
 root.append(el('h3',null,"Évolution du nombre d'inscrits"));
 const max=Math.max(1,...rounds.map(x=>x.inscrits||0));
 for(const r of rounds)lineBar(root,r.annee+' · T'+r.tour,r.inscrits,ratio(r.inscrits,max),'#c9cede');
 root.append(el('h3',null,"Évolution de l'abstention — premier et deuxième tour"));
 for(const r of rounds)lineBar(root,r.annee+' · T'+r.tour,r.abstentions,ratio(r.abstentions,r.inscrits),r.tour===2?'#ed92bf':'#c9cede');
 root.append(el('h3',null,"Taux d'abstention — série historique municipale"));
 createTable(root,['Indicateur',...rounds.map(r=>r.annee+' T'+r.tour)],
 [['Abstention',...rounds.map(r=>pct(ratio(r.abstentions,r.inscrits)))],
 ['Inscrits',...rounds.map(r=>n(r.inscrits))],
 ['Exprimés',...rounds.map(r=>n(r.exprimes))]]);
 root.append(el('h3',null,'Évolution du nombre de bulletins blancs et nuls'));
 for(const r of rounds)lineBar(root,r.annee+' · T'+r.tour,
  r.blancs!=null&&r.nuls!=null?r.blancs+r.nuls:null,
  r.blancs!=null&&r.nuls!=null?ratio(r.blancs+r.nuls,r.votants):null);
 root.append(el('p','el-muted','Les élections législatives et les bureaux dont les bulletins blancs et nuls ne sont pas distincts ne sont pas artificiellement complétés.'));
}
function candidateHistory(root,rs){
 root.append(el('h3',null,'Évolution de la couleur politique du candidat élu | Série longue'));
 const rounds=sorted(rs);
 createTable(root,['Année','Tour','Nuance gagnante','Voix','Score exprimés','Abstention'],rounds.map(r=>{
  const w=winner(r);return [r.annee,r.tour,nuance(w),n(w?.voix),pct(ratio(w?.voix,r.exprimes)),pct(ratio(r.abstentions,r.inscrits))];
 }));
 for(const r of rounds){
  const box=el('div','el-year-block');box.append(el('h3',null,r.annee+' · '+(r.tour===1?'Premier tour':'Deuxième tour')));
  box.append(el('p','el-vote-abst','Abstention : '+n(r.abstentions)+' voix ('+pct(ratio(r.abstentions,r.inscrits))+')'));
  if(r.candidats?.length)voteBar(box,r.candidats,r.exprimes);
  const w=winner(r);
  box.append(el('p','el-round-outcome',r.candidats.length===1?'Une seule liste candidate — 100 % des suffrages exprimés':
    w?.nom+' en tête · '+pct(ratio(w?.voix,r.exprimes))));
  root.append(box);
 }
}
function personaContent(root,state){
 const data=state.analysis;
 root.append(el('p','el-muted','Portrait de la commune établi exclusivement à partir des statistiques INSEE disponibles, sans profil électoral individuel déduit.'));
 const age=data?.demographie_detail?.tranches_age||[];
 if(Array.isArray(age)&&age.length){
  root.append(el('h3',null,'Population par tranche d’âge — INSEE'));
  const max=Math.max(1,...age.map(x=>x.valeur||0));
  for(const x of age)lineBar(root,x.libelle||x.label||'Tranche d’âge',x.valeur,ratio(x.valeur,max),'#f2d300');
 }else root.append(el('p','el-muted','Les tableaux INSEE du portrait ne sont pas encore disponibles pour cette adresse.'));
}
function bureauOverview(root,state,rs){
 const latest=r2026(rs)||rs[0];
 const offices=latest?.bureaux||[];
 const filter=panel(root,'Résultats par candidat et par bureau de vote','Le score de chaque liste, bureau par bureau, en % des exprimés · Municipales '+latest?.annee);
 const options=el('div','el-filter-line');
 let selected=winner(latest)?.nom||'';
 const people=latest?.candidats||[];
 const status=el('div','el-vote-selection');
 for(const person of people){
  const b=makeBtn(person.nom+' · '+nuance(person),'el-choice'+(person.nom===selected?' active':''));
  b.onclick=()=>{selected=person.nom;options.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));renderRanking()};
  options.append(b);
 }
 filter.append(options,status);
 const best=panel(root,'Où '+(selected||'le candidat sélectionné')+' fait ses meilleurs scores','Bureaux classés par score réel, sans interpolation des adresses des électeurs.');
 const holder=el('div','el-bureau-columns'),map=el('div'),ranking=el('div');
 mapFrame(map,state.loc?.commune||'',state.loc?.latitude,state.loc?.longitude,
 'Point central de la commune ; les électeurs ne sont pas géolocalisés.');
 holder.append(map,ranking);best.append(holder);
 function renderRanking(){
  ranking.replaceChildren();status.textContent='Candidat étudié : '+selected;
  const rows=offices.map(o=>{const c=o.candidats.find(y=>y.nom===selected);return {o,c,score:ratio(c?.voix,o.exprimes)}})
   .sort((a,b)=>(b.score??-1)-(a.score??-1));
  for(let i=0;i<rows.length;i++){
   const r=rows[i];lineBar(ranking,(i+1)+'. Bureau '+r.o.code,r.c?.voix,r.score,'#ed8fc0');
  }
 }
 renderRanking();
 const bureau=panel(root,'La commune bureau par bureau','Tous les candidats, tous les bureaux. Trier par numéro de bureau ou score des listes.');
 const body=el('div','el-table-grid');
 const items=()=>offices.map(o=>{
  const cells=o.candidats.map(c=>c.nom+': '+n(c.voix)+' ('+pct(ratio(c.voix,o.exprimes))+')').join(' · ');
  return [o.code,n(o.inscrits),pct(ratio(o.abstentions,o.inscrits)),n(o.exprimes),cells];
 });
 createTable(body,['Bureau','Inscrits','Abstention','Exprimés','Résultats des listes'],items());
 bureau.append(body);
}
function bureauDetailed(root,rs){
 const latest=r2026(rs)||rs[0];const offices=[...(latest?.bureaux||[])].sort((a,b)=>a.code.localeCompare(b.code));
 const info=panel(root,'Résultats du dernier candidat élu dans les bureaux de vote','Résultats réellement publiés par le ministère de l’Intérieur');
 const checks=el('div','el-filter-line');
 for(const kind of ['Large victoire','Victoire disputée','Courte défaite','Large défaite'])checks.append(el('span','el-legend-item','● '+kind));
 info.append(checks);
 root.append(el('h3',null,'Nombre total de bureaux de vote : '+n(offices.length)));
 const sort=el('div','el-filter-line'),target=el('div');
 for(const field of ['Numéro de bureau','Nombre d’inscrits','Taux d’abstention']){
  const b=makeBtn(field,'el-choice');
  b.onclick=()=>{if(field==='Nombre d’inscrits')offices.sort((a,b)=>(b.inscrits||0)-(a.inscrits||0));
   else if(field==='Taux d’abstention')offices.sort((a,b)=>ratio(b.abstentions,b.inscrits)-ratio(a.abstentions,a.inscrits));
   else offices.sort((a,b)=>a.code.localeCompare(b.code));draw()};
  sort.append(b);
 }
 root.append(sort,target);
 function draw(){
  target.replaceChildren();
  for(const b of offices){
   const c=el('article','el-bureau-card');
   c.append(el('h3',null,'BUREAU N°'+b.code));
   createTable(c,['Inscrits','Abstentions','Votants','Exprimés','Blancs','Nuls'],
    [[n(b.inscrits),pct(ratio(b.abstentions,b.inscrits)),n(b.votants),n(b.exprimes),n(b.blancs),n(b.nuls)]]);
   voteBar(c,b.candidats,b.exprimes);target.append(c);
  }
 }
 draw();
}
function typologies(root,state,rs){
 const latest=r2026(rs)||rs[0],offices=latest?.bureaux||[];
 const p=panel(root,'Résultats du dernier candidat élu agrégés par typologie de victoire','Typologie calculée uniquement à partir des suffrages exprimés par bureau');
 const legend=el('div','el-filter-line');['Large victoire','Victoire disputée','Courte défaite','Large défaite','Sans opposition'].forEach(x=>legend.append(el('span','el-legend-item',x)));p.append(legend);
 const candidates=latest?.candidats||[];
 for(const candidate of candidates.slice(0,3)){
  section(root,candidate.nom+' — résultats par bureau',body=>{
   mapFrame(body,state.loc?.commune||'',state.loc?.latitude,state.loc?.longitude,
    'Les cartes géographiques correspondent à la localisation de la commune, pas aux adresses des électeurs.');
   const rows=offices.map(b=>({b,score:ratio(b.candidats.find(x=>x.nom===candidate.nom)?.voix,b.exprimes)}));
   createTable(body,['Bureau de vote','Score du candidat','Typologie'],rows.map(({b,score})=>[
    b.code,pct(score),candidates.length===1?'Sans opposition':score>=60?'Large victoire':score>=50?'Victoire disputée':score>=40?'Courte défaite':'Large défaite'
   ]));
   behavioral(body,rs);
  },candidate===candidates[0]);
 }
}
function render(root,state){
 root.classList.add('election-root');
 const data=state.electionsData,rs=Array.isArray(data?.scrutins)?sorted(data.scrutins):[];
 const intro=el('div','el-top-filter');intro.append(el('span','el-tag','Municipales'));root.append(intro);
 const layout=el('div','el-layout'),nav=el('aside','el-local-nav'),body=el('div','el-election-content');
 const title=el('div','el-local-city','⌖  '+(state.loc?.commune||'Commune étudiée'));nav.append(title,el('h4',null,'COMMUNE'));
 const links=[['commune',"Résultats de l'élection municipale"],['vision',"Vision d'ensemble"],['details','Résultats détaillés'],['typologies','Résultats détaillés typologies de score']];
 let active='commune';
 const area=el('div');
 function draw(){
  area.replaceChildren();
  if(!rs.length){const p=panel(area,'Résultats municipaux officiels',null);
   p.append(el('p','el-muted',data?.statut==='indisponible'?
   'Aucun résultat officiel chargé pour cette commune.':'Récupération des données officielles de la commune…'));
   return;
  }
  if(active==='commune')commune(area,state,rs);
  if(active==='vision')bureauOverview(area,state,rs);
  if(active==='details')bureauDetailed(area,rs);
  if(active==='typologies')typologies(area,state,rs);
 }
 for(const [id,name] of links){
  if(id==='vision')nav.append(el('h4',null,'BUREAU DE VOTE'));
  const b=makeBtn(name,'el-local-button'+(id===active?' active':''));
  b.onclick=()=>{active=id;nav.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));draw()};
  nav.append(b);
 }
 body.append(area);layout.append(nav,body);root.append(layout);
 const foot=el('div','el-foot');
 foot.append(el('p',null,'Sources : ministère de l’Intérieur, résultats des élections municipales, fichiers officiels diffusés sur data.gouv.fr. Couverture et définition des bureaux susceptibles de varier entre les années.'));
 if(data?.sources)for(const source of data.sources){const a=el('a',null,'Municipales '+source.annee+' T'+source.tour);a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';foot.append(a)}
 root.append(foot);
 draw();
 return true;
}
window.AtlasElectionsPage={render};
})();