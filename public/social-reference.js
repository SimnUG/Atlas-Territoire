'use strict';
(function(){
 const NF=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
 const DF=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1});
 const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined&&txt!==null)n.textContent=String(txt);return n};
 const svg=(tag,props={})=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(props).forEach(([k,v])=>n.setAttribute(k,String(v)));return n};
 const number=n=>typeof n==='number'&&Number.isFinite(n)?NF.format(n):'—';
 const dec=n=>typeof n==='number'&&Number.isFinite(n)?DF.format(n):'—';
 const pc=n=>typeof n==='number'&&Number.isFinite(n)?dec(n)+' %':'—';
 const euros=n=>typeof n==='number'&&Number.isFinite(n)?dec(n)+' €':'—';
 const color=['#0ba48d','#3b6ed3','#f5a12e','#ec533a','#9ca6b7','#7d54d9'];
 const btn=(text,css,fn)=>{const b=el('button',css,text);b.type='button';b.onclick=fn;return b};
 const sum=(rows)=>rows.reduce((a,r)=>a+(typeof r.nombre==='number'?r.nombre:0),0);
 function section(root,title,sub){
  const t=el('div','rs-section');t.append(el('h2',null,title));if(sub)t.append(el('p',null,sub));root.append(t);
 }
 function kpi(root,main,desc,right,rightSub,tone='pink',icon='▦'){
  const bar=el('div','rs-kpi'),left=el('div','rs-kpi-left'),disc=el('div','rs-kpi-icon '+tone,icon),central=el('div');
  central.append(el('strong',null,main),el('small',null,desc));left.append(disc,central);bar.append(left);
  if(right!==null&&right!==undefined){const side=el('div','rs-kpi-right');side.append(el('strong',null,right));if(rightSub)side.append(el('small',null,rightSub));bar.append(side)}
  root.append(bar);
 }
 function panel(heading,sub){
  const c=el('section','rs-panel');c.append(el('h3',null,heading));
  if(sub)c.append(el('p','rs-muted',sub));return c;
 }
 function two(root,a,b,wide=''){
  const pair=el('div','rs-two '+wide);pair.append(a,b);root.append(pair);
 }
 function tableBars(root,rows,total,colors=color){
  const head=el('div','rs-list-head');head.append(el('span',null,'SITUATION / TYPOLOGIE'),el('span',null,'NOMBRE'),el('span',null,'PART'));root.append(head);
  for(let i=0;i<rows.length;i++){
   const r=rows[i],c=colors[i%colors.length],line=el('div','rs-stat-row');
   const left=el('div','rs-name'),dot=el('i');dot.style.background=c;left.append(dot,el('span',null,r.label));
   line.append(left,el('strong',null,number(r.nombre)),el('span','rs-stat-percent',pc(r.part)));
   const track=el('div','rs-bar-track'),fill=el('div','rs-bar-fill');
   fill.style.width=Math.min(100,Math.max(0,r.part||0))+'%';fill.style.background=c;track.append(fill);line.append(track);root.append(line);
  }
  const footer=el('div','rs-table-total');footer.append(el('i',null,'Total'),el('b',null,number(total)),el('span',null,'100,0 %'));root.append(footer);
 }
 function donut(root,percentage){
  const graph=el('div','rs-donut');graph.style.setProperty('--pct',Math.max(0,Math.min(100,percentage||0))+'%');
  const inside=el('div');inside.append(el('strong',null,pc(percentage)),el('small',null,'occupés'));graph.append(inside);root.append(graph);
 }
 function occupancy(root,d){
  section(root,'Occupation du parc',"Répartition des logements sociaux selon leur situation d'occupation.");
  kpi(root,number(d.total),'logements sociaux','100 %','du parc RPLS communal');
  const a=panel("Situation d'occupation",'Répartition des biens du parc social.');
  tableBars(a,d.occupation.rows,d.total,['#13a48b','#4073d2','#f7a434','#e95741','#98a2b6']);
  const b=panel("Synthèse d'occupation",'Logements occupés, vacants ou vides.');
  donut(b,d.occupation.occupied_pct);
  for(const [label,count,pctValue,c] of [
   ['Logements occupés',d.occupation.occupied,d.occupation.occupied_pct,'#12a18b'],
   ['Vacants et vides',d.occupation.vacants,100-d.occupation.occupied_pct,'#f4a333']
  ]){
   const row=el('div','rs-legend-row'),dot=el('i');dot.style.background=c;row.append(dot,el('span',null,label),el('b',null,number(count)),el('small',null,pc(pctValue)));b.append(row);
  }
  two(root,a,b,'rs-wide-left');
 }
 function typologie(root,d){
  section(root,'Typologie des biens','Lecture de la nature du parc et de la répartition par nombre de pièces.');
  kpi(root,number(d.total),'logements sociaux','Une lecture structurelle','nature du bâti et taille des logements');
  const a=panel('Nature du parc','Collectif ou individuel.');
  tableBars(a,d.typologie.nature,d.total,['#0fa890','#3c6fd2']);
  const b=panel('Typologie des logements','Répartition par nombre de pièces.');
  tableBars(b,d.typologie.pieces,d.total,['#8caae6','#3b6ed2','#426bd0','#273769','#eb0078']);
  two(root,a,b);
 }
 function age(root,d){
  const age=d.anciennete;
  section(root,'Âge du parc',"Répartition du parc social selon l'ancienneté de construction.");
  const important=age.rows.find(x=>x.label==='Entre 20 et 40 ans');
  kpi(root,number(important?.nombre), 'logements construits entre 20 et 40 ans',
   pc(important?.part),'du parc communal','mint','▦');
  const a=panel('Ancienneté du parc','Données en nombre et en pourcentage du parc total.');
  tableBars(a,age.rows,d.total,['#109e86','#50bda9','#8aa6eb','#3b6fca','#263665','#8254da']);
  const b=panel('Lecture immédiate','');
  const wrap=el('div','rs-age-summary');wrap.append(el('strong',null,pc(d.total?age.forty_plus/d.total*100:null)));
  wrap.append(el('p',null,'des logements ont plus de 40 ans, soit '+number(age.forty_plus)+' logements.'),
   el('small',null,'Synthèse des tranches « 40 à 60 ans » et « plus de 60 ans ».'));
  b.append(wrap);two(root,a,b,'rs-wide-left');
 }
 function polyline(points,px,py){
  if(!points.length)return '';
  let d='M'+px(0).toFixed(2)+' '+py(points[0].valeur).toFixed(2);
  for(let i=1;i<points.length;i++){
   const prev=points[i-1],curr=points[i],prior=points[Math.max(i-2,0)],next=points[Math.min(i+1,points.length-1)];
   const p1=[px(i-1)+(px(i)-px(Math.max(i-2,0)))/6,py(prev.valeur)+(py(curr.valeur)-py(prior.valeur))/6];
   const p2=[px(i)-(px(Math.min(i+1,points.length-1))-px(i-1))/6,py(curr.valeur)-(py(next.valeur)-py(prev.valeur))/6];
   d+=' C'+p1[0].toFixed(2)+' '+p1[1].toFixed(2)+' '+p2[0].toFixed(2)+' '+p2[1].toFixed(2)+' '+px(i).toFixed(2)+' '+py(curr.valeur).toFixed(2);
  }
  return d;
 }
 function drawLine(root,points,colorHex,format='nombre'){
  const rows=points.filter(r=>typeof r.valeur==='number'&&Number.isFinite(r.valeur));
  if(rows.length!==points.length||rows.length<2){root.append(el('p','rs-muted','Série RPLS officielle indisponible pour cette commune.'));return}
  const width=880,height=236,margin={l:48,r:18,t:26,b:31},iw=width-margin.l-margin.r,ih=height-margin.t-margin.b;
  let low=Math.min(...rows.map(x=>x.valeur)),high=Math.max(...rows.map(x=>x.valeur)),delta=high-low;
  low= format==='nombre'?Math.max(0,Math.floor((low-Math.max(5,delta*.2))/10)*10):Math.max(0,low-Math.max(.25,delta*.15));
  high=high+Math.max(format==='nombre'?10:.25,delta*.16);
  if(high===low)high=low+1;
  const x=i=>margin.l+i*iw/(rows.length-1),y=v=>margin.t+ih*(1-(v-low)/(high-low));
  const chart=svg('svg',{viewBox:'0 0 '+width+' '+height,role:'img','aria-label':'Courbe des données RPLS de 2013 à 2025',class:'rs-line-chart'});
  const defs=svg('defs'),gradient=svg('linearGradient',{id:'rsGradient'+colorHex.slice(1),x1:'0',x2:'0',y1:'0',y2:'1'});
  for(const [offset,opacity] of [['0%','0.2'],['100%','0.015']])gradient.append(svg('stop',{offset,'stop-color':colorHex,'stop-opacity':opacity}));
  defs.append(gradient);chart.append(defs);
  for(let i=0;i<=4;i++){
   const v=low+(high-low)*i/4,yy=y(v);
   chart.append(svg('line',{x1:margin.l,x2:width-margin.r,y1:yy,y2:yy,stroke:'#eaedf2','stroke-dasharray':'2 3'}));
   const lbl=svg('text',{x:margin.l-7,y:yy+3,'text-anchor':'end','font-size':10,fill:'#8290a4'});
   lbl.textContent=format==='nombre'?number(Math.round(v)):format==='euros'?dec(v)+' €':dec(v)+' %';
   chart.append(lbl);
  }
  const line=polyline(rows,x,y);
  const area=line+' L'+x(rows.length-1)+' '+(height-margin.b)+' L'+x(0)+' '+(height-margin.b)+' Z';
  chart.append(svg('path',{d:area,fill:'url(#rsGradient'+colorHex.slice(1)+')'}));
  chart.append(svg('path',{d:line,stroke:colorHex,'stroke-width':2.3,fill:'none','stroke-linecap':'round'}));
  rows.forEach((r,i)=>{
   const xx=x(i),yy=y(r.valeur),date=svg('text',{x:xx,y:height-9,'text-anchor':'middle','font-size':10,fill:'#8c97a6'});
   date.textContent=r.annee;chart.append(date);
   const dot=svg('circle',{cx:xx,cy:yy,r:3,stroke:colorHex,'stroke-width':1.5,fill:'#fff'});
   const tip=svg('title');tip.textContent=r.annee+' : '+(format==='nombre'?number(r.valeur):format==='euros'?euros(r.valeur):pc(r.valeur));
   dot.append(tip);chart.append(dot);
   const label=svg('text',{x:xx,y:Math.max(11,yy-8),'text-anchor':'middle','font-size':9.5,'font-weight':700,fill:colorHex});
   label.textContent=format==='nombre'?number(r.valeur):format==='euros'?dec(r.valeur)+' €':dec(r.valeur)+' %';chart.append(label);
  });
  root.append(chart);
 }
 function annualRows(root,rows,unit,variant='pct'){
  const grid=el('div','rs-annual-grid');
  for(let i=0;i<rows.length;i++){
   const p=rows[i],prev=i?rows[i-1].valeur:null,current=p.valeur;
   const item=el('div','rs-year-pill');
   item.append(el('small',null,p.annee),el('strong',null,unit==='nombre'?number(current):unit==='euros'?euros(current):pc(current)));
   let gap=null;
   if(typeof prev==='number'&&typeof current==='number'){
    const dif=current-prev;
    gap=variant==='pct'?dif:prev?100*dif/prev:null;
   }
   const sign=el('span','rs-year-gap '+(gap===null||gap===0?'neutral':gap>0?'positive':'negative'),
    gap===null?'—':(gap>0?'+':'')+dec(gap)+(variant==='pct'?' pt':' %'));
   item.append(sign);grid.append(item);
  }
  root.append(grid);
 }
 function history(root,d){
  section(root,'Évolution du parc','Évolution du nombre de logements sociaux et variation annuelle N / N-1.');
  const years=d.evolution.valeurs,latest=years.at(-1),prev=years.at(-2),delta=prev?.valeur>0?100*(latest.valeur/prev.valeur-1):null;
  kpi(root,number(d.total),'logements sociaux en 2025',delta!==null?(delta===0?'Stable':(delta>0?'↑ +':'↓ ')+pc(delta)):'—','par rapport à 2024','blue','⌁');
  const a=panel('Évolution du nombre de logements sociaux','Série 2013–2025.');
  drawLine(a,years,'#27376b','nombre');
  const b=panel('Valeur et évolution annuelle','');
  annualRows(b,years,'nombre','growth');two(root,a,b,'rs-wide-left');
 }
 function rates(root,d){
  section(root,'Vacance et mobilité','Évolution annuelle des taux de vacance et de mobilité au sein du parc social.');
  const a=panel('Taux de vacance','Données au 1er janvier de chaque année.');
  a.append(el('span','rs-chart-tag',pc(d.vacance.actuel)+' en 2025'));
  drawLine(a,d.vacance.valeurs,'#e4007e','pct');
  annualRows(a,d.vacance.valeurs,'pct','pct');
  const b=panel('Taux de mobilité','Données au 1er janvier de chaque année.');
  b.append(el('span','rs-chart-tag',pc(d.mobilite.actuel)+' en 2025'));
  drawLine(b,d.mobilite.valeurs,'#00a589','pct');
  annualRows(b,d.mobilite.valeurs,'pct','pct');two(root,a,b);
 }
 function funding(root,d){
  section(root,'Financements','Répartition du parc par mode de financement et loyers moyens associés.');
  const count=d.financements.rows.filter(r=>r.nombre>0).length;
  kpi(root,number(d.total),'logements sociaux',count+' modes de financement','volumes, parts et loyers moyens','mint','◌');
  const a=panel('Mode de financement du parc','Nombre de logements et poids dans le parc total.');
  tableBars(a,d.financements.rows,d.total,['#12a58e','#51bdab','#e90075','#f5a52c','#7b57e3']);
  const b=panel('Loyer moyen au m² selon le financement','Valeurs mensuelles par m² de surface habitable.');
  const plot=el('div','rs-finance-chart'),max=Math.max(1,...d.financements.rows.map(r=>r.loyer||0));
  d.financements.rows.forEach((r,i)=>{
   const col=el('div','rs-finance-col');
   col.append(el('strong',null,euros(r.loyer)));
   const track=el('div','rs-finance-track'),bar=el('div','rs-finance-bar');
   bar.style.height=Math.max(2,(r.loyer||0)/max*120)+'px';bar.style.background=['#11a58e','#51bdab','#e30075','#f4a434','#7b55df'][i];
   track.append(bar);col.append(track,el('small',null,r.label),el('span',null,number(r.nombre)+' logts'));plot.append(col);
  });b.append(plot);two(root,a,b);
 }
 function rent(root,d){
  section(root,'Loyers',"Évolution du loyer moyen et comparaison selon l'ancienneté du parc.");
  const change=d.loyers.variation;
  kpi(root,euros(d.loyers.actuel)+'/m²','loyer moyen en 2025',
   change===null?'—':(change>0?'↑ +':'↓ ')+pc(change),'par rapport à 2024','pink','€');
  const a=panel('Évolution du loyer moyen','Série annuelle 2013–2025 et évolution N / N-1.');
  drawLine(a,d.loyers.valeurs,'#e6007b','euros');
  annualRows(a,d.loyers.valeurs,'euros','growth');
  const b=panel('Loyer moyen par ancienneté du parc','Comparaison des six tranches d’âge de construction.');
  const max=Math.max(1,...d.loyers.par_anciennete.map(r=>r.loyer||0));
  d.loyers.par_anciennete.forEach((r,i)=>{
   const line=el('div','rs-age-rent-row');line.append(el('span',null,r.label));
   const track=el('div','rs-bar-track'),fill=el('div','rs-bar-fill');fill.style.width=((r.loyer||0)/max*100)+'%';
   fill.style.background=['#10a48e','#50bbaa','#89a8ed','#3c6ed1','#27366a','#8657d9'][i];
   track.append(fill);line.append(track,el('strong',null,euros(r.loyer)+'/m²'));b.append(line);
  });two(root,a,b,'rs-wide-left');
 }
 const BINS=[
  {id:'u5',label:'Moins de 5 logements',color:'#173e67',test:x=>x<5},
  {id:'5to14',label:'De 5 à 14 logements',color:'#3a91b7',test:x=>x>=5&&x<=14},
  {id:'15to24',label:'De 15 à 24 logements',color:'#18b49e',test:x=>x>=15&&x<=24},
  {id:'25to49',label:'De 25 à 49 logements',color:'#f3c042',test:x=>x>=25&&x<=49},
  {id:'50to99',label:'De 50 à 99 logements',color:'#f38930',test:x=>x>=50&&x<=99},
  {id:'100plus',label:'Plus de 100 logements',color:'#df0076',test:x=>x>=100}
 ];
 const PERIODS=[
  {id:'pre1940',label:'Avant 1940',test:x=>x<1940},
  {id:'1940_1970',label:'1940 à 1970',test:x=>x>=1940&&x<1970},
  {id:'1970_1990',label:'1970 à 1990',test:x=>x>=1970&&x<1990},
  {id:'1990_2000',label:'1990 à 2000',test:x=>x>=1990&&x<2000},
  {id:'2000_2010',label:'2000 à 2010',test:x=>x>=2000&&x<=2010},
  {id:'post2010',label:'Après 2010',test:x=>x>2010},
  {id:'unknown',label:'Non renseignée',test:x=>x===null||x===undefined}
 ];
 let leafletPromise=null;
 function getLeaflet(){
  if(window.L?.map)return Promise.resolve(window.L);
  if(leafletPromise)return leafletPromise;
  leafletPromise=new Promise((resolve,reject)=>{
   if(!document.querySelector('link[data-rpls-leaflet]')&&!document.querySelector('link[data-atlas-leaflet]')){
    const css=document.createElement('link');css.rel='stylesheet';css.dataset.rplsLeaflet='1';
    css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.append(css);
   }
   const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.async=true;
   s.onload=()=>window.L?.map?resolve(window.L):reject(Error('Leaflet non initialisé'));
   s.onerror=()=>reject(Error('Bibliothèque de cartes indisponible'));document.head.append(s);
  });return leafletPromise;
 }
 function basemap(L,m){
  const ign='https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png';
  const primary=L.tileLayer(ign,{maxZoom:19,attribution:'© IGN — Plan IGN'});
  const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'});
  primary.on('tileerror',()=>{if(m.hasLayer(primary)){m.removeLayer(primary);osm.addTo(m)}});
  primary.addTo(m);
  L.control.layers({'Plan IGN':primary,'Plan OpenStreetMap':osm},null,{collapsed:true}).addTo(m);
 }
 function exportGeo(points,code){
  const cells=[['Latitude','Longitude','Nombre de logements RPLS','Année de construction moyenne','Précision indicative (m)'],
   ...points.map(x=>[x.lat,x.lng,x.nombre,x.annee??'',x.precision_m??''])];
  const csv=cells.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const u=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=u;a.download='RPLS-2025-points-'+code+'.csv';a.click();
  setTimeout(()=>URL.revokeObjectURL(u),1200);
 }
 function map(root,d,state){
  section(root,'Carte géolocalisée','Localisation des logements sociaux par point RPLS, filtrable selon le nombre de logements et la période de construction.');
  const wrapper=el('div','rs-map-layout'),filter=el('div','rs-map-filters'),body=el('div','rs-map-body');
  filter.append(el('h3',null,'Filtres'));
  const size=new Set(BINS.map(a=>a.id)),years=new Set(PERIODS.map(a=>a.id)),inputs=[];
  const controls=el('div','rs-filters-title');controls.append(el('span',null,'NOMBRE DE LOGEMENTS'));filter.append(controls);
  for(const cat of BINS){
   const row=el('label','rs-checkbox'),input=el('input');input.type='checkbox';input.checked=true;
   const dot=el('i');dot.style.background=cat.color;row.append(input,dot,el('span',null,cat.label));filter.append(row);
   inputs.push({input,set:size,id:cat.id});
  }
  filter.append(el('div','rs-filters-title','PÉRIODE DE CONSTRUCTION'));
  for(const cat of PERIODS){
   const row=el('label','rs-checkbox'),input=el('input');input.type='checkbox';input.checked=true;
   const dot=el('i');dot.style.background='#23366e';row.append(input,dot,el('span',null,cat.label));filter.append(row);
   inputs.push({input,set:years,id:cat.id});
  }
  const reset=btn('Réinitialiser','rs-reset',()=>{
   inputs.forEach(({input,set,id})=>{input.checked=true;set.add(id)});apply();
  });filter.append(reset);
  const mapDiv=el('div','rs-leaflet-map');body.append(mapDiv);
  const info=el('div','rs-map-bottom');body.append(info);
  const exportButton=btn('↓ Export CSV','rs-export',()=>exportGeo(current,d.code_insee));filter.append(exportButton);
  wrapper.append(filter,body);root.append(wrapper);
  const all=d.geo?.points||[];
  let current=all.slice(),markers=null, leafletMap=null,Llib=null;
  const markerColor=p=>BINS.find(b=>b.test(p.nombre))?.color||'#253c62';
  const selected=p=>BINS.some(cat=>size.has(cat.id)&&cat.test(p.nombre))&&PERIODS.some(cat=>years.has(cat.id)&&cat.test(p.annee));
  const apply=()=>{
   current=all.filter(selected);
   info.textContent=d.code_insee+' — '+number(current.length)+' positions, '+number(current.reduce((a,p)=>a+p.nombre,0))+' logements représentés. '+
    'Source : RPLS 2025 — positions indicatives, certaines localisations pouvant être imprécises.';
   if(!leafletMap||!Llib)return;
   if(markers)markers.clearLayers();
   else{markers=Llib.layerGroup().addTo(leafletMap)}
   const canvas=Llib.canvas({padding:.4});
   for(const p of current){
    const dot=Llib.circleMarker([p.lat,p.lng],{renderer:canvas,radius:Math.max(4,Math.min(9,3+Math.sqrt(p.nombre))),
     color:'#fff',weight:1,fillColor:markerColor(p),fillOpacity:.88});
    const text=el('div');text.append(el('strong',null,number(p.nombre)+' logements sociaux'));
    text.append(el('div',null,'Construction moyenne : '+(p.annee||'non renseignée')));
    if(p.precision_m!==null)text.append(el('small',null,'Précision indicative : '+number(p.precision_m)+' m'));
    dot.bindPopup(text);markers.addLayer(dot);
   }
  };
  inputs.forEach(({input,set,id})=>input.onchange=()=>{if(input.checked)set.add(id);else set.delete(id);apply()});
  apply();
  if(!all.length){
   mapDiv.append(el('p','rs-no-geo','Aucun point RPLS géolocalisé publié pour ce territoire. Les indicateurs communaux restent disponibles.'));
   return;
  }
  getLeaflet().then(async L=>{
   if(!mapDiv.isConnected)return;
   Llib=L;leafletMap=L.map(mapDiv,{preferCanvas:true,scrollWheelZoom:false,zoomControl:true});
   basemap(L,leafletMap);
   const bounds=L.latLngBounds(all.map(p=>[p.lat,p.lng]));
   leafletMap.fitBounds(bounds.pad(.25),{maxZoom:14});
   try{
    const res=await fetch('https://geo.api.gouv.fr/communes/'+encodeURIComponent(d.code_insee)+'?geometry=contour&format=geojson');
    if(res.ok&&mapDiv.isConnected){
     const feature=await res.json();
     L.geoJSON(feature,{style:{color:'#233b6e',weight:2,fillOpacity:0,opacity:.85}}).addTo(leafletMap);
    }
   }catch(_){}
   if(!mapDiv.isConnected)return;
   const point=state.loc;
   if(typeof point?.latitude==='number'&&typeof point?.longitude==='number'){
    const mark=L.circleMarker([point.latitude,point.longitude],{radius:9,color:'#facc15',weight:3,
     fillColor:'#df0075',fillOpacity:1});mark.bindPopup(el('span',null,'Adresse étudiée'));mark.addTo(leafletMap);
   }
   apply();requestAnimationFrame(()=>{if(mapDiv.isConnected)leafletMap.invalidateSize()});
  }).catch(e=>{mapDiv.replaceChildren();mapDiv.append(el('p','rs-no-geo','Le fond de carte ne peut pas être chargé : '+e.message))});
  const legend=el('div','rs-map-legend');legend.append(el('b',null,'Nombre de logements par position :'));
  BINS.forEach(b=>{const row=el('span');const dot=el('i');dot.style.background=b.color;row.append(dot,el('span',null,b.label));legend.append(row)});
  root.append(legend);
 }
 function render(root,state){
  root.replaceChildren();root.classList.add('rs-root');
  const d=state.socialData;
  root.append(el('p','rs-license','SDES — Licence Ouverte 2.0'));
  root.append(el('h1',null,'Répertoire du parc locatif social'));
  root.append(el('p','rs-intro',(state.loc?.commune||'Commune')+' · Source : RPLS 2025 · Mise à jour : janvier 2025'));
  if(!d||d.statut!=='disponible'){
   const message=d?.statut==='absent'?'Aucun enregistrement RPLS 2025 publié pour cette commune.':'Chargement des données officielles RPLS 2025…';
   root.append(el('div','rs-pending',message));return true;
  }
  occupancy(root,d);typologie(root,d);age(root,d);history(root,d);rates(root,d);funding(root,d);rent(root,d);map(root,d,state);
  const note=el('footer','rs-footer');
  const a=el('a',null,'Source : SDES — RPLS au 1er janvier 2025');a.href=d.source.url;a.target='_blank';a.rel='noopener noreferrer';
  note.append(a,el('p',null,'La carte localise des coordonnées RPLS agrégées : leur précision varie et elles ne doivent pas être assimilées à des bâtiments cadastraux certains. Les effectifs communaux sont issus du tableau national publié par le SDES.'),
   el('small',null,'Licence Ouverte 2.0 — Ministère de la Transition écologique'));
  root.append(note);return true;
 }
 window.AtlasSocialPage={render};
})();
