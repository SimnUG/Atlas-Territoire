'use strict';
(function(){
 const sourceURL='https://www.data.gouv.fr/datasets/liste-des-permis-de-construire-et-autres-autorisations-durbanisme';
 const colors={Autorisé:'#9ba3b1',Commencé:'#4b6fe5',Terminé:'#e00078'};
 const rooms=['Studio / T1','T2','T3','T4','T5','T6 et plus'];
 const roomColors=['#e00078','#e6499d','#7f5cd9','#4b6fe5','#273465','#141935'];
 const number=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
 const decimal=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1});
 const f=n=>typeof n==='number'&&Number.isFinite(n)?number.format(n):'—';
 const pct=n=>typeof n==='number'&&Number.isFinite(n)?decimal.format(n)+' %':'—';
 const elem=(tag,cls,t)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(t!==undefined&&t!==null)n.textContent=String(t);return n};
 const append=(p,...nodes)=>(p.append(...nodes.filter(Boolean)),p);
 const link=(txt,url,cls)=>{const a=elem('a',cls,txt);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a};
 const state={period:'all',type:'apartments',size:5,measure:'logements',display:'nombre',statusDisplay:'part',tyMeasure:'logements',tyDisplay:'nombre',selected:null};
 let map=null,markers=null,currentMapWrap=null,rootRef=null,sourceState=null,geo=new Map(),geoRequested=new Set(),leafletPromise=null,drawToken=0;
 function entryNum(r){return state.type==='apartments'?r.col:state.type==='houses'?r.ind:r.nombre}
 function filterRows(rows){
  let yrmin=2013,yrmax=2026;
  if(state.period==='recent5')yrmin=2022;
  if(state.period==='recent10')yrmin=2017;
  if(state.period==='until2025')yrmax=2025;
  return rows.map(r=>({record:r,qty:entryNum(r)})).filter(x=>x.record.annee>=yrmin&&x.record.annee<=yrmax&&
   typeof x.qty==='number'&&x.qty>0&&x.qty>=state.size);
 }
 function yearRange(){return state.period==='recent5'?[2022,2026]:state.period==='recent10'?[2017,2026]:state.period==='until2025'?[2013,2025]:[2013,2026]}
 function cumulative(rows){return rows.reduce((sum,r)=>sum+r.qty,0)}
 function median(xs){const sorted=xs.filter(Number.isFinite).sort((a,b)=>a-b);if(!sorted.length)return null;const i=Math.floor(sorted.length/2);return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2}
 function duration(r){
  if(!r.date_doc||!r.date_autorisation)return null;
  const a=Date.parse(r.date_autorisation+'T12:00:00Z'),b=Date.parse(r.date_doc+'T12:00:00Z');
  const months=(b-a)/86400000/30.4375;
  return months>=0&&months<300?months:null;
 }
 function title(text,subtitle){
  const h=elem('div','pc-section-head');append(h,elem('h2',null,text),elem('p',null,subtitle||''));return h;
 }
 function card(name,tag='section'){
  const node=elem(tag,'pc-panel');if(name)node.append(elem('h3',null,name));return node;
 }
 function ctr(value,items,extraClass=''){
  const wrap=elem('div','pc-segmented '+extraClass);
  items.forEach(([v,label])=>{const b=elem('button',value===v?'selected':'',label);b.type='button';b.onclick=()=>{if(extraClass==='pc-displays')state.display=v;else if(extraClass==='pc-measures')state.measure=v;else if(extraClass==='pc-type-displays')state.tyDisplay=v;else if(extraClass==='pc-type-measures')state.tyMeasure=v;else if(extraClass==='pc-status-displays')state.statusDisplay=v;draw()};wrap.append(b)});
  return wrap;
 }
 function option(label,value){const opt=elem('option',null,label);opt.value=value;return opt}
 function dropdown(label,items,current,callback,cls=''){
  const s=elem('select','pc-select '+cls);s.setAttribute('aria-label',label);
  for(const [value,text] of items)s.append(option(text,value));
  s.value=String(current);s.onchange=()=>{callback(s.value);draw()};
  return s;
 }
 function heading(city,data){
  const top=elem('div','pc-topline');
  const left=elem('div');
  append(left,elem('small','pc-eyebrow','TERRITOIRE DE RÉFÉRENCE'));
  const name=elem('div','pc-commune');
  append(name,elem('h1',null,city),elem('span','pc-pink-tag','2026 partiel'));
  left.append(name,elem('p','pc-muted','Période 2013–2026 · Source : Sit@del · '+(data?.dossiers?.length??'—')+' permis PC créant des logements'));
  const right=elem('div','pc-top-right');
  right.append(elem('small','pc-eyebrow','QUARTIER À AFFICHER'));
  const quart=dropdown('Quartier à afficher',[['commune','Commune seule']],'commune',()=>{},'pc-quarter');
  quart.disabled=true;
  quart.title='Comparaison par quartier en attente d’un découpage IRIS officiel vérifié';
  right.append(quart);top.append(left,right);return top;
 }
 function selectorLine(){
  const bar=elem('div','pc-filterbar');
  const options=elem('div','pc-filters');
  options.append(dropdown('Période',[
   ['all','Période : 2013–2026'],['until2025','Période : 2013–2025'],
   ['recent10','Période : 2017–2026'],['recent5','Période : 2022–2026']
  ],state.period,v=>state.period=v));
  options.append(dropdown('Types de logements',[
   ['apartments','Types de logements : Appartements'],
   ['houses','Types de logements : Maisons'],['all','Types de logements : Tous les logements']
  ],state.type,v=>state.type=v,'pink'));
  options.append(dropdown('Taille des opérations',[
   [0,'Taille : toutes tailles'],[2,'Taille : 2 logements et +'],[5,'Taille : 5 logements et +'],
   [10,'Taille : 10 logements et +'],[20,'Taille : 20 logements et +']
  ],state.size,v=>state.size=Number(v),'pink'));
  const reset=elem('button','pc-reset','⟲  Réinitialiser');
  reset.onclick=()=>{Object.assign(state,{period:'all',type:'apartments',size:5,measure:'logements',display:'nombre',statusDisplay:'part',tyMeasure:'logements',tyDisplay:'nombre',selected:null});draw()};
  bar.append(options,reset);return bar;
 }
 function kpi(label,value,foot,pink=false){
  const e=elem('div','pc-kpi'+(pink?' pink-border':''));
  append(e,elem('strong','pc-kpi-heading',label),elem('small','pc-kpi-scope','COMMUNE'),
    elem('b','pc-kpi-number',value),elem('span','pc-kpi-foot',foot));
  return e;
 }
 function kpiSet(rows){
  const sum=cumulative(rows),total=rows.length;
  const med=median(rows.map(x=>x.qty));
  const apartment=rows.reduce((s,x)=>s+(x.record.col||0),0);
  const known=rows.filter(x=>duration(x.record)!==null).map(x=>duration(x.record));
  const noDoc=rows.filter(x=>!x.record.date_doc);
  const lost=cumulative(noDoc);
  const block=elem('div','pc-kpi-grid');
  block.append(kpi('Logements autorisés',f(sum),f(total)+' opérations retenues',true));
  block.append(kpi('Opérations',f(total),'permis de construire (PC)'));
  block.append(kpi('Taille médiane',f(med),'logements par opération'));
  block.append(kpi('Poids des appartements',pct(sum?apartment/sum*100:null),'des logements retenus'));
  block.append(kpi('Délai médian d’ouverture',known.length?decimal.format(median(known))+' mois':'—','Base : '+f(known.length)+' opérations'));
  block.append(kpi('Sans ouverture renseignée',f(lost),f(noDoc.length)+' opérations concernées',true));
  return block;
 }
 function statusCard(rows,city){
  const p=card('Situation actuelle des logements');
  const control=elem('div','pc-status-control');
  control.append(ctr(state.statusDisplay,[['nombre','Nombre'],['part','Part (%)']],'pc-status-displays'));
  p.append(control);
  p.append(elem('p','pc-mini-sub','Dernier événement connu dans Sit@del, tous millésimes de la période confondus.'));
  p.append(elem('strong','pc-label','Commune — '+city));
  const counts={'Autorisé':0,'Commencé':0,'Terminé':0};
  for(const r of rows)counts[r.record.status]+=r.qty;
  const sum=cumulative(rows);
  const track=elem('div','pc-statusbar');
  for(const status of ['Autorisé','Commencé','Terminé']){
   const amount=counts[status];
   const label=state.statusDisplay==='nombre'?f(amount):Math.round((sum?amount/sum:0)*100)+' %';
   const s=elem('div','pc-status-section',sum&&amount/sum>0.09?label:'');
   s.style.background=colors[status];s.style.width=(sum?amount/sum*100:0)+'%';
   s.title=status+' : '+f(amount)+' logements';track.append(s);
  }
  p.append(track);
  const legend=elem('div','pc-legend');
  Object.entries(colors).forEach(([key,color])=>{const n=elem('span',null,key);n.style.setProperty('--color',color);legend.append(n)});
  p.append(legend);return p;
 }
 function summaryCard(rows){
  const p=card('Comparaison immédiate');
  p.append(elem('p','pc-mini-sub','Quatre repères pour la commune. La comparaison apparaît dès qu’un quartier officiel est disponible.'));
  const stats=elem('div','pc-comparison-grid');
  const count=cumulative(rows),noDoc=cumulative(rows.filter(x=>!x.record.date_doc));
  const known=rows.map(x=>duration(x.record)).filter(x=>x!==null);
  const vals=[['Part des logements',f(count),'logements autorisés'],['Part des opérations',f(rows.length),'opérations retenues'],
   ['Sans DOC renseignée',pct(count?noDoc/count*100:null),'des logements concernés'],
   ['Délai médian',known.length?decimal.format(median(known))+' mois':'—','entre autorisation et chantier']];
  for(const [title,value,foot] of vals){const box=elem('div','pc-mini-card');append(box,elem('strong',null,title),elem('b',null,value),elem('small',null,foot));stats.append(box)}
  p.append(stats);return p;
 }
 function statRows(rows,measure='logements',byType=false){
  const [a,b]=yearRange(),years=[];
  for(let y=a;y<=b;y++){
   const year=rows.filter(x=>x.record.annee===y);
   const cats=byType?rooms:['Autorisé','Commencé','Terminé'];
   const sums=Object.fromEntries(cats.map(k=>[k,0]));
   for(const op of year){
    if(byType){
      // Pour les permis mixtes, les pièces ne sont pas ventilées entre maison et collectif.
      // Ne pas attribuer fictivement les T à un type de logement.
      if(state.type!=='all'&&op.record.typologie==='mixte')continue;
      for(let i=0;i<rooms.length;i++)sums[rooms[i]]+=(measure==='operations'?(op.record.pieces?.[i]>0?1:0):(op.record.pieces?.[i]||0));
    }else sums[op.record.status]+=measure==='logements'?op.qty:1;
   }
   years.push({year:y,sums,total:Object.values(sums).reduce((x,y)=>x+y,0)});
  }
  return years;
 }
 function svgBars(container,rows,{measure,display,typology=false}={}){
  const series=statRows(rows,measure,typology),cats=typology?rooms:['Autorisé','Commencé','Terminé'];
  const palette=typology?Object.fromEntries(rooms.map((z,i)=>[z,roomColors[i]])):colors;
  const max=Math.max(1,...series.map(r=>r.total));
  const width=1150,height=250,pad={left:31,right:10,top:19,bottom:39},inner=height-pad.top-pad.bottom,bar=(width-pad.left-pad.right)/series.length;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('role','img');
  svg.setAttribute('aria-label',typology?'Production par typologie selon l’année':'Production selon l’année d’autorisation');
  svg.classList.add('pc-chart');
  const node=(tag,props={},text)=>{
   const el=document.createElementNS('http://www.w3.org/2000/svg',tag);
   for(const [k,v] of Object.entries(props))el.setAttribute(k,String(v));
   if(text!==undefined)el.textContent=String(text);svg.append(el);return el;
  };
  for(let i=0;i<=4;i++){
   const y=pad.top+inner*(1-i/4),t=display==='part'?25*i:max*i/4;
   node('line',{x1:pad.left,y1:y,x2:width-pad.right,y2:y,stroke:'#ecedf2','stroke-dasharray':'2 3'});
   node('text',{x:pad.left-5,y:y+4,'text-anchor':'end',fill:'#8c94a4','font-size':'9'},Math.round(t));
  }
  const grand=series.reduce((sum,r)=>sum+r.total,0);
  let previous=null;
  for(let i=0;i<series.length;i++){
   const r=series[i],center=pad.left+bar*(i+.5);
   let top=pad.top+inner,overall=0;
   let visibleTotal=r.total;
   if(display==='part')visibleTotal=grand?r.total/grand*100:0;
   if(display==='evolution'){
    visibleTotal=previous!==null&&previous>0?(r.total-previous)/previous*100:null;
   }
   if(display==='evolution'){
    if(visibleTotal!==null){
     const positive=visibleTotal>=0;
     const baseline=pad.top+inner/2;
     const h=Math.min(inner/2,Math.abs(visibleTotal)/Math.max(10,...series.map((v,i)=>i?Math.abs((v.total-(series[i-1].total||0))/Math.max(1,series[i-1].total)*100):0))*inner/2);
     node('rect',{x:center-bar*.33,y:positive?baseline-h:baseline,width:bar*.66,height:Math.max(2,h),fill:positive?'#4b6fe5':'#e00078',rx:2});
     node('text',{x:center,y:positive?baseline-h-5:baseline+h+11,'font-size':'8','text-anchor':'middle',fill:'#273465'},Math.round(visibleTotal)+' %');
    }
   }else{
    for(const cat of cats){
     const raw=r.sums[cat]||0;
     const amount=display==='part'?(grand?raw/grand*100:0):raw;
     const h=amount/(display==='part'?100:max)*inner;
     if(h<=0)continue;
     top-=h;
     node('rect',{x:center-bar*.34,y:top,width:bar*.68,height:h,fill:palette[cat],rx:1});
     if(h>15)node('text',{x:center,y:top+h/2+3,'text-anchor':'middle',fill:'#fff','font-size':'8','font-weight':'700'},Math.round(amount));
     overall+=amount;
    }
    if(r.total)node('text',{x:center,y:Math.max(12,top-6),'text-anchor':'middle','font-size':'9','font-weight':'700',fill:'#1c2d53'},display==='part'?pct(overall):f(r.total));
   }
   node('text',{x:center,y:height-18,'text-anchor':'middle','font-size':'9',fill:'#7c879b'},r.year===2026?'2026 (prov.)':r.year);
   previous=r.total;
  }
  container.append(svg);
  const legend=elem('div','pc-legend');
  Object.entries(palette).forEach(([name,color])=>{const e=elem('span',null,name);e.style.setProperty('--color',color);legend.append(e)});
  container.append(legend);
 }
 function graphCard(rows,city,typology=false){
  const p=card(typology?'Production par typologie selon l’année d’autorisation':'Production selon l’année d’autorisation');
  const bar=elem('div','pc-graph-head');
  const h=elem('div','pc-graph-actions');
  const group=(txt,control)=>{const div=elem('div','pc-graph-control');div.append(elem('small',null,txt),control);return div};
  h.append(group('MESURE',ctr(typology?state.tyMeasure:state.measure,[['logements','Logements'],['operations','Opérations']],typology?'pc-type-measures':'pc-measures')));
  h.append(group('AFFICHAGE',ctr(typology?state.tyDisplay:state.display,typology?[['nombre','Nombre'],['part','Part (%)']]:[['nombre','Nombre'],['part','Part (%)'],['evolution','Évolution']],typology?'pc-type-displays':'pc-displays')));
  bar.append(elem('span','pc-mini-sub',typology?'Répartition des logements par nombre de pièces déclaré.':'Dimension affichée : statut. Choisissez les mesures pour changer la ventilation.'),h);
  p.append(bar,elem('strong','pc-label','Commune — '+city));
  svgBars(p,rows,{measure:typology?state.tyMeasure:state.measure,display:typology?state.tyDisplay:state.display,typology});
  if(typology)p.append(elem('p','pc-mini-sub',state.tyMeasure==='operations'?'Chaque opération est comptée dans une typologie dès qu’elle contient au moins un logement de ce nombre de pièces ; une opération peut figurer dans plusieurs catégories.':'Les typologies non renseignées et les permis mixtes non ventilables sont exclus du détail par pièces, mais comptés dans les totaux.'));
  return p;
 }
 function housingTypes(rows){
  const p=card('Quelles tailles de logements ?');
  const total=cumulative(rows),totals=rooms.map(()=>0);
  let unassigned=0;
  for(const x of rows){
   const v=x.record.pieces||[];
   if(state.type!=='all'&&x.record.typologie==='mixte'){unassigned+=x.qty;continue}
   const sum=v.reduce((a,b)=>a+(b||0),0);
   if(sum===0){unassigned+=x.qty;continue}
   for(let i=0;i<6;i++)totals[i]+=(v[i]||0);
   if(x.qty>sum)unassigned+=x.qty-sum;
  }
  const known=totals.reduce((a,b)=>a+b,0);
  p.append(elem('p','pc-mini-sub','Répartition par nombre de pièces des logements autorisés — typologie inconnue pour '+pct(total?Math.max(0,total-known)/total*100:null)+' des logements retenus.'));
  const scale=Math.max(1,...totals);
  rooms.forEach((name,i)=>{
   const row=elem('div','pc-typ-row');
   const l=elem('strong','pc-typ-label',name),track=elem('div','pc-typ-track'),fill=elem('div','pc-typ-fill');
   fill.style.width=(totals[i]/scale*100)+'%';track.append(fill);
   row.append(l,track,elem('strong','pc-typ-pct',pct(known?totals[i]/known*100:null)),elem('small',null,f(totals[i])+' lgts'));
   p.append(row);
  });
  p.append(elem('div','pc-legend',null));
  p.lastChild.append(elem('span',null,'Détail disponible : '+f(known)+' logements. Sans détail : '+f(Math.max(0,total-known))+'.'));
  return p;
 }
 function loadLeaflet(){
  if(window.L?.map)return Promise.resolve(window.L);
  if(leafletPromise)return leafletPromise;
  leafletPromise=new Promise((ok,err)=>{
   if(!document.querySelector('link[data-pc-leaflet]')&&!document.querySelector('link[data-atlas-leaflet]')&&!document.querySelector('link[data-rpls-leaflet]')){
    const css=document.createElement('link');css.rel='stylesheet';css.dataset.pcLeaflet='1';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.append(css);
   }
   const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.async=true;
   script.onload=()=>window.L?.map?ok(window.L):err(Error('Leaflet non chargé'));
   script.onerror=()=>err(Error('Fond de carte inaccessible'));
   document.head.append(script);
  });return leafletPromise;
 }
 function showDetail(root,r){
  root.replaceChildren();
  if(!r){root.append(elem('div','pc-detail-empty','Cliquez sur un point de la carte ou une ligne du tableau pour afficher la fiche du permis : dates, volumes, typologie, demandeur et parcelles.'));return}
  const list=[
   ['Permis',r.id],['État',r.status],['Autorisation',r.date_autorisation],
   ['Ouverture du chantier',r.date_doc],['Achèvement',r.date_daact],
   ['Nombre de logements',r.nombre],['Logements individuels',r.ind],['Logements collectifs',r.col],
   ['Demandeur',r.demandeur],['Adresse',r.adresse],['Parcelles',r.parcelles?.join(' · ')],['Surface du terrain',r.surface_terrain?f(r.surface_terrain)+' m²':null]
  ];
  for(const [name,value] of list){const row=elem('div','pc-detail-row');append(row,elem('span',null,name),elem('strong',null,value===null||value===undefined||value===''?'—':String(value)));root.append(row)}
 }
 function mapBox(rows,loc){
  const container=elem('div','pc-map-layout'),mapcard=card('Implantation des opérations résidentielles'),
    detail=card('Détail d’une opération');
  const city=loc.commune||'Commune';
  const pointBox=elem('div','pc-map');
  mapcard.append(elem('p','pc-mini-sub','Seules les opérations localisées par la Base Adresse Nationale sont affichées.'));
  mapcard.append(pointBox);
  const foot=elem('p','pc-mini-sub','Les opérations sans géolocalisation validée restent comptées dans les indicateurs.');
  mapcard.append(foot);
  const detailBody=elem('div','pc-details');detail.append(detailBody);
  showDetail(detailBody,rows.find(x=>x.record.id===state.selected)?.record||null);
  container.append(mapcard,detail);
  const code=loc.code_insee,filtered=rows.slice(0,80).map(x=>x.record);
  if(!filtered.length||!Number.isFinite(loc.latitude)||!Number.isFinite(loc.longitude)){
    pointBox.append(elem('div','pc-map-empty','Carte indisponible ou aucune opération pour ces filtres.'));return container;
  }
  currentMapWrap=pointBox;
  const markerCodes=new Set(filtered.map(x=>x.id));
  // Différer pour laisser le DOM être attaché avant l'initialisation Leaflet.
  Promise.resolve().then(async()=>{
   if(!pointBox.isConnected)return;
   try{
    const L=await loadLeaflet();
    if(!pointBox.isConnected)return;
    map=L.map(pointBox,{zoomControl:true,attributionControl:true}).setView([loc.latitude,loc.longitude],13);
    const ign='https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png';
    const tiles=L.tileLayer(ign,{maxZoom:19,attribution:'© IGN — Plan IGN'});
    const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'});
    tiles.on('tileerror',()=>{if(map?.hasLayer(tiles)){map.removeLayer(tiles);osm.addTo(map)}});
    tiles.addTo(map);L.control.layers({'Plan IGN':tiles,'Plan OpenStreetMap':osm},null,{collapsed:true}).addTo(map);
    markers=L.featureGroup().addTo(map);
    const refresh=()=>{
     if(!map||!pointBox.isConnected)return;
     markers.clearLayers();
     const hits=[];
     for(const r of filtered){
      const pos=geo.get(code+'/'+r.id);
      if(!pos)continue;
      const marker=L.circleMarker([pos.lat,pos.lon],{radius:7,weight:2,color:'#fff',fillColor:colors[r.status],fillOpacity:0.95});
      marker.bindTooltip((r.adresse||r.id)+' · '+f(r.nombre)+' logements');
      marker.on('click',()=>{state.selected=r.id;showDetail(detailBody,r)});
      marker.addTo(markers);hits.push([pos.lat,pos.lon]);
      if(state.selected===r.id)marker.openTooltip();
     }
     if(hits.length>1)map.fitBounds(hits,{padding:[28,28],maxZoom:15});
     else if(hits.length===1)map.setView(hits[0],15);
     foot.textContent=f(hits.length)+' opérations géolocalisées sur '+f(filtered.length)+' demandées, à partir de la BAN.';
    };
    refresh();
    const ask=filtered.filter(x=>x.adresse&&!geo.has(code+'/'+x.id)&&!geoRequested.has(code+'/'+x.id)).slice(0,50);
    if(ask.length){
     ask.forEach(r=>geoRequested.add(code+'/'+r.id));
     const params=new URLSearchParams({code_insee:code,commune:city,ids:ask.map(r=>r.id).join(',')});
     fetch('/api/permis-sitadel-geocode?'+params,{signal:AbortSignal.timeout(105000)})
      .then(r=>r.ok?r.json():null).then(d=>{
       for(const point of d?.points||[])geo.set(code+'/'+point.id,point);
       if(pointBox.isConnected)refresh();
       else if(rootRef?.isConnected&&sourceState?.tab==='permis')draw();
      }).catch(()=>{if(pointBox.isConnected)foot.textContent='Certaines opérations ne peuvent pas être géocodées actuellement.'});
    }
    setTimeout(()=>{if(pointBox.isConnected)map?.invalidateSize()},110);
   }catch(_){if(pointBox.isConnected)pointBox.append(elem('div','pc-map-empty','La carte interactive est momentanément indisponible.'))}
  });
  return container;
 }
 function table(rows){
  const p=card('Liste des opérations'),sc=elem('p','pc-mini-sub',f(rows.length)+' opérations · cliquez sur une ligne pour afficher le détail sur la carte.');
  p.append(sc);
  const exportButton=elem('button','pc-export','Exporter CSV');exportButton.onclick=()=>{
   const header=['Permis','Année','Statut','Logements','Logements individuels','Logements collectifs','Demandeur','Adresse','DOC','Parcelles'];
   const data=rows.map(({record:r,qty})=>[r.id,r.annee,r.status,qty,r.ind,r.col,r.demandeur,r.adresse,r.date_doc,r.parcelles?.join(' / ')]);
   const csv=[header,...data].map(x=>x.map(c=>'"'+String(c??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
   const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
   const a=elem('a');a.href=url;a.download='permis-sitadel-'+(sourceState?.loc?.code_insee||'commune')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  p.append(exportButton);
  const wrap=elem('div','pc-table-wrap'),t=elem('table','pc-table'),head=elem('thead'),tr=elem('tr');
  ['Périmètre','Année ↓','Statut','Logements','Demandeur','Localisation','Délai','Géoloc.'].forEach(x=>tr.append(elem('th',null,x)));
  head.append(tr);t.append(head);const body=elem('tbody');
  rows.slice().sort((a,b)=>b.record.annee-a.record.annee).forEach(({record:r,qty})=>{
   const row=elem('tr',state.selected===r.id?'pc-row-active':'');
   const delay=duration(r),geoloc=geo.get(r.code_insee+'/'+r.id);
   const cells=['Commune',r.annee,r.status,f(qty),r.demandeur||'—',r.adresse||'—',delay===null?'—':decimal.format(delay)+' mois',geoloc?'✓':'—'];
   for(const [i,x] of cells.entries()){
    const td=elem('td',i===2?'pc-state-'+r.status.toLowerCase():'',x);
    row.append(td);
   }
   row.onclick=()=>{
    state.selected=r.id;
    const details=rootRef?.querySelector('.pc-details');
    if(details)showDetail(details,r);
    rootRef?.querySelectorAll('.pc-table tr').forEach(x=>x.classList.toggle('pc-row-active',x===row));
    const point=geo.get(r.code_insee+'/'+r.id);
    if(point&&map)map.setView([point.lat,point.lon],15);
    document.querySelector('.pc-map-layout')?.scrollIntoView({behavior:'smooth',block:'center'});
   };
   body.append(row);
  });
  t.append(body);wrap.append(t);p.append(wrap);
  return p;
 }
 function draw(){
  if(!rootRef||!sourceState)return;
  if(map){map.remove();map=null;markers=null}
  rootRef.replaceChildren();
  rootRef.className='pc-root';
  const d=sourceState.permisData,loc=sourceState.loc||{},city=loc.commune||'Commune';
  rootRef.append(heading(city,d));
  rootRef.append(selectorLine());
  const note=elem('p','pc-filter-note','● CTA rose = dimension affichée dans le graphique  · chevron = filtrer les modalités');
  if(state.type!=='all'||state.size>0)note.append(elem('strong',null,' · Filtres actifs : '+(state.type==='apartments'?'Appartements':state.type==='houses'?'Maisons':'Tous')+(state.size?' · Taille ≥ '+state.size+' logements':'')));
  rootRef.append(note);
  rootRef.append(title('Vue d’ensemble et dynamique de production','Volumes, composition et rythme de production de la commune.'));
  if(!d){
   rootRef.append(elem('div','pc-loading','Chargement des données Sit@del du SDES…'));return;
  }
  if(d.statut!=='disponible'){
   rootRef.append(elem('div','pc-loading','Les données Sit@del sont momentanément indisponibles. Aucune opération n’est inventée.'));
   rootRef.append(footnote());return;
  }
  const data=filterRows(d.dossiers||[]);
  rootRef.append(kpiSet(data));
  const split=elem('div','pc-split');
  split.append(statusCard(data,city),summaryCard(data));rootRef.append(split);
  rootRef.append(graphCard(data,city));
  rootRef.append(title('Typologie des logements autorisés','Le nombre de pièces des logements, sur toute la période puis année par année.'));
  rootRef.append(housingTypes(data),graphCard(data,city,true));
  rootRef.append(title('Carte et opérations','Visualiser l’implantation des programmes et accéder au détail des permis.'));
  const summary=elem('div','pc-bottom-kpis');
  const known=data.map(x=>duration(x.record)).filter(x=>x!==null);
  summary.append(kpi('Logements',f(cumulative(data)),'sur le périmètre filtré',true));
  summary.append(kpi('Opérations',f(data.length),'permis retenus'));
  summary.append(kpi('Taille médiane',f(median(data.map(x=>x.qty))),'logements par opération'));
  summary.append(kpi('Sans ouverture renseignée',f(cumulative(data.filter(x=>!x.record.date_doc))),f(data.filter(x=>!x.record.date_doc).length)+' opérations',true));
  rootRef.append(summary,mapBox(data,loc),table(data),footnote());
 }
 function footnote(){
  const div=elem('div','pc-footnote');
  div.append(elem('span',null,'ⓘ'),elem('p',null,'Source : Sitadel (SDES — Ministère de la Transition écologique) · Permis de construire créant des logements, depuis 2013. L’état final enregistré est autorisé, commencé ou terminé ; les PC annulés et les déclarations préalables sont exclus. Les logements mixtes ne sont comptés que pour le type choisi. Les données 2026 sont provisoires et ne doivent pas être assimilées aux statistiques DR++ estimées. La géolocalisation repose sur la Base Adresse Nationale ; une opération non géocodée reste comptée dans les indicateurs. '));
  div.lastChild.append(link('Source officielle et licence Sitadel',sourceURL));
  div.lastChild.append(document.createTextNode(' · Géocodage : '));
  div.lastChild.append(link('Géoplateforme — IGN / BAN','https://data.geopf.fr/geocodage/search'));
  div.lastChild.append(document.createTextNode(' — Licence Ouverte 2.0.'));
  return div;
 }
 function render(root,siteState){
  rootRef=root;sourceState=siteState;
  draw();return true;
 }
 window.AtlasPermisPage={render,filterRows};
})();