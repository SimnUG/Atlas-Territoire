'use strict';
/*
 * ATLAS Territoires — Plan et points d'adresses BAN.
 * Les points ne représentent ni des électeurs, ni un vote à l'adresse.
 * Google Maps (ROADMAP) uniquement si une clé navigateur autorisée est configurée.
 * Sinon, fond Plan OpenStreetMap interactif via Leaflet.
 */
(function(){
 const urlPoints=code=>'/api/elections-address-points?code_insee='+encodeURIComponent(code);
 let pointsCache=new Map(),configPromise=null,googlePromise=null,leafletPromise=null;
 const num=x=>typeof x==='number'&&Number.isFinite(x);
 const add=(p,tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;p.append(e);return e};
 async function getPoints(code){
  if(!/^(?:\d{5}|2[AB]\d{3})$/i.test(code||''))return [];
  if(!pointsCache.has(code))pointsCache.set(code,fetch(urlPoints(code)).then(r=>r.ok?r.json():null).then(d=>
   Array.isArray(d?.points)?d.points.filter(p=>num(p.lat)&&num(p.lng)):[]).catch(()=>[]));
  return pointsCache.get(code);
 }
 function getConfig(){
  if(!configPromise)configPromise=fetch('/api/google-maps-config').then(r=>r.ok?r.json():{}).catch(()=>({}));
  return configPromise;
 }
 function getGoogle(key){
  if(window.google?.maps?.Map)return Promise.resolve(window.google);
  if(!key)return Promise.reject(new Error('Clé Google absente'));
  if(googlePromise)return googlePromise;
  googlePromise=new Promise((resolve,reject)=>{
   const callback='__atlasMapsReady';
   const script=document.createElement('script');
   let settled=false;
   const t=setTimeout(()=>{if(!settled){settled=true;reject(Error('Délai Google Maps dépassé'))}},14000);
   window[callback]=()=>{if(settled)return;settled=true;clearTimeout(t);resolve(window.google);delete window[callback]};
   script.onerror=()=>{if(settled)return;settled=true;clearTimeout(t);reject(Error('Google Maps inaccessible'))};
   script.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&v=weekly&loading=async&callback='+callback;
   script.async=true;document.head.append(script);
  });
  return googlePromise;
 }
 function loadLeaflet(){
  if(window.L?.map)return Promise.resolve(window.L);
  if(leafletPromise)return leafletPromise;
  leafletPromise=new Promise((resolve,reject)=>{
   if(!document.querySelector('link[data-atlas-leaflet]')){
    const css=document.createElement('link');css.rel='stylesheet';css.dataset.atlasLeaflet='1';
    css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.append(css);
   }
   const script=document.createElement('script');
   script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
   script.onload=()=>window.L?.map?resolve(window.L):reject(Error('Leaflet non initialisé'));
   script.onerror=()=>reject(Error('Le fond de plan ne peut pas être chargé'));
   document.head.append(script);
  });
  return leafletPromise;
 }
 function overlayMessage(container,number,color){
  const legend=add(container,'div','atlas-map-overlays');
  const pill=add(legend,'span','atlas-map-point-pill',number.toLocaleString('fr-FR')+' points d’adresses réels');
  pill.style.borderLeftColor=color;
  add(legend,'span','atlas-map-point-label','Source : Base Adresse Nationale (IGN / data.gouv.fr)');
  return legend;
 }
 async function drawGoogle(div,points,lat,lng,color,key){
  const maps=(await getGoogle(key)).maps;
  if(!div.isConnected)throw Error('Carte retirée');
  const base={lat,lng};
  const map=new maps.Map(div,{center:base,zoom:13,mapTypeId:'roadmap',streetViewControl:false,
   fullscreenControl:true,clickableIcons:false,mapTypeControl:true,mapTypeControlOptions:{mapTypeIds:['roadmap','satellite']}});
  const features=points.map((p,i)=>({type:'Feature',id:String(i),geometry:{type:'Point',coordinates:[p.lng,p.lat]},properties:{adresse:p.adresse||'Adresse BAN'}}));
  map.data.addGeoJson({type:'FeatureCollection',features});
  const pin={path:maps.SymbolPath.CIRCLE,scale:2.4,fillColor:color,fillOpacity:.85,
   strokeColor:'#ffffff',strokeOpacity:.55,strokeWeight:.6};
  map.data.setStyle({icon:pin,clickable:true});
  const info=new maps.InfoWindow();
  map.data.addListener('click',e=>{
   const name=e.feature.getProperty('adresse')||'Point BAN';
   const node=document.createElement('div');node.style.fontSize='12px';node.textContent=name+' · Adresse BAN (pas un électeur)';
   info.setContent(node);info.setPosition(e.latLng);info.open({map});
  });
  if(points.length){const bounds=new maps.LatLngBounds();points.forEach(p=>bounds.extend({lat:p.lat,lng:p.lng}));map.fitBounds(bounds,22)}
 }
 async function drawLeaflet(div,points,lat,lng,color){
  const L=await loadLeaflet();
  if(!div.isConnected)throw Error('Carte retirée');
  const m=L.map(div,{preferCanvas:true,zoomControl:true,scrollWheelZoom:false}).setView([lat,lng],13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,attribution:'© OpenStreetMap contributors'
  }).addTo(m);
  const renderer=L.canvas({padding:.5});
  const layer=L.featureGroup();
  for(const p of points){
   const dot=L.circleMarker([p.lat,p.lng],{renderer,radius:2.7,color:'#fff',
    weight:.5,opacity:.6,fillColor:color,fillOpacity:.92});
   dot.bindPopup((p.adresse||'Adresse BAN')+' — point géographique BAN, pas un électeur');
   layer.addLayer(dot);
  }
  layer.addTo(m);
  if(points.length)m.fitBounds(layer.getBounds().pad(.08),{maxZoom:15});
  requestAnimationFrame(()=>{if(div.isConnected)m.invalidateSize()});
 }
 async function render(root,options={}){
  const code=options.code,lat=num(options.lat)?options.lat:46.739,lng=num(options.lng)?options.lng:-1.385;
  const color=options.color||'#ee86b9';
  const box=add(root,'div','atlas-point-map');
  const heading=add(box,'div','atlas-point-map-toolbar');
  add(heading,'strong',null,'Plan et points géographiques');
  add(heading,'small',null,'Fond de carte interactif · zoom et déplacement');
  const div=add(box,'div','atlas-point-map-canvas');
  div.setAttribute('aria-label','Carte des points géolocalisés d’adresses BAN, sans information sur les électeurs');
  const note=add(box,'div','atlas-point-map-disclaimer',
   'Chaque point correspond à une adresse géographique BAN, et non à un électeur ou à un bulletin de vote. '+
   'Les scores électoraux restent agrégés au bureau de vote, sans attribution à une adresse.');
  let alive=true;
  try{
   const points=await getPoints(code);
   if(!box.isConnected||!alive)return;
   if(!points.length){div.replaceChildren();add(div,'p','atlas-map-unavailable',
    'Points BAN non disponibles pour cette commune.');return}
   const cfg=await getConfig();if(!box.isConnected)return;
   const key=typeof cfg?.key==='string'?cfg.key.trim():'';
   try{
    if(key)await drawGoogle(div,points,lat,lng,color,key);
    else await drawLeaflet(div,points,lat,lng,color);
   }catch(e){
    // En présence d'une clé Google, utiliser le fond de plan alternatif si la clé est refusée.
    if(key){div.replaceChildren();await drawLeaflet(div,points,lat,lng,color)}
    else throw e;
   }
   if(box.isConnected)overlayMessage(box,points.length,color);
  }catch(e){
   if(box.isConnected){div.replaceChildren();add(div,'p','atlas-map-unavailable',
    'Impossible de charger le fond de plan : '+e.message)}
  }
 }
 window.AtlasElectionPointMaps={render};
})();
