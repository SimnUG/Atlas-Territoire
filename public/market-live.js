'use strict';
const $ = id=>document.getElementById(id);
const requested=new URLSearchParams(location.search).get('adresse')||'';
const state={loc:null,analysis:null,housing:null,rent:null,planning:null,risk:null,tab:'fiche'};
const fmt=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1});
const elem=(tag,cls,value)=>{const a=document.createElement(tag);if(cls)a.className=cls;if(value!==undefined&&value!==null)a.textContent=String(value);return a};
const append=(parent,...children)=>(parent.append(...children.filter(Boolean)),parent);
const num=(value,unit='')=>typeof value==='number'&&Number.isFinite(value)?fmt.format(value)+(unit?' '+unit:''):null;
const arr=a=>Array.isArray(a)?a:[];
const good=x=>x&&x.statut==='disponible'&&typeof x.valeur==='number'&&Number.isFinite(x.valeur);
const cat=id=>arr(state.analysis?.categories?.[id]).filter(good);
const ages=()=>arr(state.analysis?.demographie_detail?.tranches_age).filter(x=>x&&typeof x.valeur==='number');
const homes=()=>arr(state.housing?.commune?.distribution).filter(x=>x&&typeof x.valeur==='number');
const rooms=()=>arr(state.housing?.commune?.pieces).filter(x=>x&&typeof x.valeur==='number');
const rents=()=>arr(state.rent?.types).filter(x=>x&&typeof x.dernier==='number'&&x.dernier>0);
const sales=()=>arr(state.analysis?.dvf?.transactions).filter(x=>x&&(typeof x.valeur==='number'||x.date));
const dpes=()=>arr(state.analysis?.dpe?.enregistrements).filter(x=>x&&x.numero);
const zones=()=>arr(state.planning?.zones).filter(x=>x&&x.libelle);
const risks=()=>arr(state.risk?.risques).filter(x=>typeof x==='string'&&x.trim());
function link(parent,s){
 if(!s||!s.url||!/^https:\/\//.test(s.url))return;
 const a=elem('a','source','Consulter la source officielle');
 a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';parent.append(a);
}
function card(title,description=''){
 return append(elem('section','card'),elem('h2','cardTitle',title),description?elem('p','cardDesc',description):null);
}
function source(node,s,scale,year){
 if(!s?.nom)return;
 node.append(elem('p','source','Source : '+s.nom+(scale?' · '+scale:'')+(year?' · '+year:'')));
 link(node,s);
}
function metricBox(i){
 const x=card(i.nom);
 x.append(elem('div','metric',num(i.valeur,i.unite)));
 source(x,i.source,i.niveau,i.millesime);
 if(i.avertissement)x.append(elem('p','source',i.avertissement));
 return x;
}
function metrics(root,values){
 const rows=arr(values).filter(good);
 if(!rows.length)return;
 const group=elem('div',rows.length>2?'grid3 section':'grid2 section');
 rows.slice(0,12).forEach(x=>group.append(metricBox(x)));
 root.append(group);
}
function chart(root,title,items,s){
 const rows=arr(items).filter(x=>x&&typeof x.valeur==='number'&&Number.isFinite(x.valeur)&&x.valeur>=0&&x.label);
 if(!rows.length)return;
 const x=card(title);const max=Math.max(1,...rows.map(y=>y.valeur));
 rows.forEach((o,i)=>{
  const r=elem('div','barRow');r.style.gridTemplateColumns='minmax(110px,1.3fr) minmax(90px,2fr) minmax(80px,1fr)';
  const track=elem('div','track'),fill=elem('div','fill'+(i===0?' featured':''));
  fill.style.width=Math.min(100,o.valeur/max*100)+'%';track.append(fill);
  append(r,elem('span',null,o.label),track,elem('span','pct',num(o.valeur,o.unit||'')));
  x.append(r);
 });
 source(x,s,s?.niveau,rows[0].millesime);root.append(x);
}
function table(root,title,heads,rows,description,s){
 if(!rows?.length)return;
 const x=card(title,description),wrap=elem('div','tablewrap'),t=elem('table');
 const th=elem('thead'),tr=elem('tr');
 heads.forEach(h=>tr.append(elem('th',null,h)));th.append(tr);t.append(th);
 const tb=elem('tbody');
 rows.forEach(data=>{const row=elem('tr');data.forEach(v=>row.append(elem('td',null,v??'')));tb.append(row)});
 t.append(tb);wrap.append(t);x.append(wrap);source(x,s,s?.niveau);root.append(x);
}
function fiche(root){
 if(!state.loc)return;
 const x=card('Localisation de l’adresse','Identification par le référentiel officiel d’adresses.');
 const g=elem('div','grid2');
 for(const [k,v] of [['Adresse',state.loc.adresse],['Commune',state.loc.commune],['Code INSEE',state.loc.code_insee],['Code postal',state.loc.code_postal],['Latitude',state.loc.latitude],['Longitude',state.loc.longitude]]){
  if(v===null||v===undefined||v==='')continue;
  const tile=elem('div','statusItem');
  append(tile,elem('small',null,k),elem('strong',null,v));g.append(tile);
 }x.append(g);
 source(x,{nom:'Géoplateforme — Base Adresse Nationale',url:'https://www.data.gouv.fr/dataservices/api-geoplateforme-geocodage'},'adresse');
 root.append(x);
 const all=available().filter(v=>v.id!=='fiche'&&v.id!=='sources');
 if(all.length){
  const section=card('Analyses disponibles','Seules les rubriques alimentées par des valeurs exploitables sont accessibles.');
  const buttons=elem('div','grid3');
  all.forEach(v=>{const b=elem('button','newSearch',v.label);b.onclick=()=>pick(v.id);buttons.append(b)});
  section.append(buttons);root.append(section);
 }
}
function population(root){
 metrics(root,cat('population'));
 const trend=arr(state.analysis?.categories?.population_historique).filter(x=>typeof x.population==='number'&&Number.isFinite(x.annee));
 if(trend.length>=2){
  chart(root,'Évolution de la population',trend.map(x=>({label:String(x.annee),valeur:x.population,unit:'habitants',millesime:x.annee})),
  {nom:'INSEE — Populations historiques',url:'https://www.insee.fr/',niveau:'commune'});
 }
 chart(root,'Structure démographique',ages().map(x=>({label:x.libelle,valeur:x.valeur,unit:'habitants',millesime:x.millesime})),state.analysis?.demographie_detail?.source);
}
function logements(root){
 metrics(root,cat('logements'));
 const d=homes();
 if(d.length){
  const x=card('Répartition du parc résidentiel');
  const g=elem('div','housing-ref-grid');
  d.forEach(o=>{
   const n=elem('div','housing-reference-cell');
   append(n,elem('span',null,o.label),elem('strong',null,num(o.part,'%')||num(o.valeur,'logements')));g.append(n);
  });x.append(g);source(x,state.housing?.source,'commune',state.housing?.commune?.annee);root.append(x);
 }
 const epci=arr(state.housing?.epci?.distribution);
 if(d.length&&epci.length){
  const map=new Map(epci.map(x=>[x.key,x]));
  const rows=d.filter(x=>map.has(x.key)).map(x=>[x.label,num(x.valeur),num(map.get(x.key).valeur),num(x.part,'%')||'',num(map.get(x.key).part,'%')||'']);
  table(root,'Comparaison commune / intercommunalité',['Statut','Commune','EPCI','Commune (%)','EPCI (%)'],rows,'Logements recensés selon les mêmes définitions.',state.housing?.source);
 }
 const pieces=rooms(),map=new Map(arr(state.housing?.epci?.pieces).map(x=>[x.piece,x]));
 table(root,'Résidences principales par nombre de pièces',['Nombre de pièces','Commune','EPCI'],
  pieces.map(o=>[o.piece,num(o.valeur),num(map.get(o.piece)?.valeur)||'']),
  'Effectifs observés au recensement.',state.housing?.source);
}
function loyers(root){
 const columns=elem('div','rent-grid');
 const palette=['#293767','#427b9d','#6e5aa4','#d10973'];
 rents().forEach((o,j)=>{
  const x=elem('article','card rent-card');
  append(x,elem('div','rent-head',o.nom),elem('div','rent-value',num(o.dernier,'€/m²/mois')));
  const points=arr(o.serie).filter(p=>typeof p.loyer==='number'&&(p.annee===2025||o.historique_comparable===true));
  if(points.length){
   const chart=elem('div','mini-rent-chart'),max=Math.max(1,...points.map(x=>x.loyer));
   points.forEach(p=>{
    const col=elem('div','mini-rent-column'),bar=elem('div','mini-rent-bar');
    bar.style.height=Math.max(4,80*p.loyer/max)+'px';
    bar.style.background=p.annee===2025?palette[j%4]:palette[j%4]+'aa';
    append(col,elem('span','bar-number',num(p.loyer,'€')),bar,elem('span','year',p.annee));chart.append(col);
   });x.append(chart);
  }
  const record=arr(o.serie).find(x=>x.annee===2025);
  if(record?.niveau_prediction)x.append(elem('p','source','Échelle de l’estimation : '+record.niveau_prediction));
  if(record?.fiabilite)x.append(elem('p','source',record.fiabilite));
  source(x,state.rent?.source,'commune / EPCI / maille',2025);
  columns.append(x);
 });
 if(columns.childElementCount)root.append(columns);
}
function dvf(root){
 metrics(root,cat('prix'));
 const rows=sales().slice(0,25).map(x=>[x.date||'',x.type||'',num(x.valeur,'€')||'',num(x.surface,'m²')||'',num(x.prix_m2,'€/m²')||'']);
 table(root,'Mutations immobilières',['Date','Type','Valeur foncière','Surface bâtie','Prix/m²'],rows,'Une mutation peut regrouper plusieurs biens. Ne constitue pas une estimation du bien recherché.',state.analysis?.dvf?.source);
}
function energie(root){
 const ds=dpes(),classe=new Map(),ges=new Map();
 ds.forEach(x=>{for(const [v,m] of [[String(x.dpe||'').toUpperCase(),classe],[String(x.ges||'').toUpperCase(),ges]]){
  if(/^[A-G]$/.test(v))m.set(v,(m.get(v)||0)+1);
 }});
 const src={nom:'ADEME — DPE logements',url:'https://data.ademe.fr/',niveau:'adresse'};
 chart(root,'Étiquettes DPE',[...classe].sort().map(([label,valeur])=>({label,valeur,unit:'DPE'})),src);
 chart(root,'Étiquettes GES',[...ges].sort().map(([label,valeur])=>({label,valeur,unit:'DPE'})),src);
 table(root,'Diagnostics associés à l’adresse',['Date','DPE','GES','Surface','N° DPE'],ds.map(x=>[x.date||'',x.dpe||'',x.ges||'',x.surface||'',x.numero||'']),'Correspondances d’adresse exactes uniquement.',src);
}
function urbanisme(root){
 const x=card('Zonage identifié au point de l’adresse','Information géographique publiée dans le Géoportail de l’urbanisme.');
 const rows=elem('div','statusGrid');
 zones().forEach(z=>rows.append(append(elem('div','statusItem'),elem('strong',null,z.libelle),z.details?.document?elem('small',null,z.details.document):null)));
 x.append(rows);source(x,state.planning?.source,'point');
 x.append(elem('p','source','Source supplémentaire hors des 14 sources initiales : IGN. Ce zonage n’est pas une confirmation de constructibilité : lire le règlement et les servitudes.'));root.append(x);
}
function risques(root){
 const x=card('Risques recensés dans la commune');
 const g=elem('div','statusGrid');
 risks().forEach(n=>g.append(append(elem('div','statusItem'),elem('strong',null,n))));
 x.append(g);source(x,state.risk?.source,'commune');
 x.append(elem('p','source','Source supplémentaire hors des 14 sources initiales : BRGM / Géorisques. Une présence communale ne confirme pas l’exposition de la parcelle.'));root.append(x);
}
function programmation(root){
 const group=[...cat('population'),...cat('logements'),...cat('permis'),...cat('prix')];
 metrics(root,group);
 if(homes().length)chart(root,'Parc existant',homes().map(x=>({label:x.label,valeur:x.valeur,unit:'logements'})),state.housing?.source);
}
function commercial(root){
 metrics(root,[...cat('prix'),...cat('revenus')]);
 if(rents().length)loyers(root);
 if(sales().length)dvf(root);
}
function provenance(root){
 const objects=[
  ...arr(state.analysis?.indicateurs).filter(good).map(x=>x.source),
  homes().length?state.housing?.source:null,
  rents().length?state.rent?.source:null,
  dpes().length?{nom:'ADEME',url:'https://data.ademe.fr/'}:null,
  zones().length?state.planning?.source:null,
  risks().length?state.risk?.source:null
 ].filter(x=>x?.nom);
 const unique=new Map(objects.map(x=>[x.nom,x]));
 if(!unique.size)return;
 const x=card('Sources des informations affichées');
 [...unique.values()].forEach(s=>{
  const row=elem('div','line');row.append(elem('b',null,s.nom));
  const a=elem('a','source','Source officielle');a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';row.append(a);x.append(row);
 });root.append(x);
}
const tabs=[
 {id:'fiche',label:'Fiche de l’adresse',group:'Étude foncière',has:()=>!!state.loc,render:fiche},
 {id:'urbanisme',label:'Urbanisme',group:'Étude foncière',has:()=>zones().length>0,render:urbanisme},
 {id:'risques',label:'Risques territoriaux',group:'Étude foncière',has:()=>risks().length>0,render:risques},
 {id:'programmation',label:'Programmation',group:'Programmation',has:()=>cat('population').length+cat('logements').length+cat('permis').length+cat('prix').length>=2,render:programmation},
 {id:'commercial',label:'Commercialisation',group:'Programmation',has:()=>cat('prix').length+rents().length>0,render:commercial},
 {id:'population',label:'Population',group:'Socio / Démo',has:()=>cat('population').length+ages().length+arr(state.analysis?.categories?.population_historique).length>0,render:population},
 {id:'emploi',label:'Emploi et activité',group:'Socio / Démo',has:()=>cat('emploi').length>0,render:r=>metrics(r,cat('emploi'))},
 {id:'revenus',label:'Revenus disponibles',group:'Socio / Démo',has:()=>cat('revenus').length>0,render:r=>metrics(r,cat('revenus'))},
 {id:'logements',label:'Logements',group:'Immo',has:()=>cat('logements').length+homes().length+rooms().length>0,render:logements},
 {id:'prix',label:'Prix immobiliers — DVF',group:'Immo',has:()=>cat('prix').length+sales().length>0,render:dvf},
 {id:'loyers',label:'Loyers du parc privé',group:'Immo',has:()=>rents().length>0,render:loyers},
 {id:'permis',label:'Permis de construire',group:'Immo',has:()=>cat('permis').length>0,render:r=>metrics(r,cat('permis'))},
 {id:'dpe',label:'DPE et audits',group:'Énergie et territoire',has:()=>dpes().length>0,render:energie},
 {id:'finances',label:'Finances locales',group:'Énergie et territoire',has:()=>cat('finances').length>0,render:r=>metrics(r,cat('finances'))},
 {id:'sources',label:'Provenance des données',group:'Données',has:()=>arr(state.analysis?.indicateurs).filter(good).length+homes().length+rents().length+zones().length+risks().length+dpes().length>0,render:provenance}
];
const available=()=>tabs.filter(t=>t.has());
function redraw(){
 const selected=available().find(t=>t.id===state.tab)||available()[0];
 if(!selected)return;
 state.tab=selected.id;
 const nav=$('nav');nav.replaceChildren();let group='';
 available().forEach(t=>{
  if(group!==t.group){group=t.group;nav.append(elem('div','navTitle',group))}
  const b=elem('button','navBtn'+(t.id===state.tab?' active':''),t.label);
  b.onclick=()=>pick(t.id);nav.append(b);
 });
 $('category').textContent=selected.group;
 $('pageTitle').textContent=selected.label;
 $('crumbCategory').textContent=selected.label;
 $('description').textContent='Données mesurées ou publiées pour le périmètre géographique indiqué.';
 $('currentAddress').textContent=state.loc?.adresse||requested;
 $('city').textContent=state.loc?.commune||'';
 $('crumbCity').textContent=state.loc?.commune||'';
 $('locationPill').textContent=state.loc?.commune?state.loc.commune+' · '+state.loc.code_insee:'';
 const body=$('analysis');body.replaceChildren();selected.render(body);
}
function pick(id){
 if(!available().some(t=>t.id===id))return;
 state.tab=id;redraw();$('side').classList.remove('show');$('overlay').classList.remove('show');window.scrollTo(0,0);
}
async function get(url,ms=65000){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),ms);
 try{const r=await fetch(url,{signal:c.signal});return r.ok?await r.json():null}
 catch(_){return null}
 finally{clearTimeout(timer)}
}
async function load(){
 if(!requested){location.assign('/');return}
 const geo=await get('/api/analyse?adresse='+encodeURIComponent(requested),13000);
 if(!geo?.localisation){location.assign('/');return}
 state.loc=geo.localisation;redraw();
 const l=state.loc,q=new URLSearchParams({code_insee:l.code_insee,adresse:l.adresse||requested,code_postal:l.code_postal||'',ban_id:l.ban_id||''});
 await Promise.all([
  (async()=>{state.analysis=await get('/api/indicateurs?'+q,93000);redraw()})(),
  (async()=>{state.housing=await get('/api/logements-detail?code_insee='+encodeURIComponent(l.code_insee),65000);redraw()})(),
  (async()=>{state.rent=await get('/api/loyers?code_insee='+encodeURIComponent(l.code_insee),60000);redraw()})(),
  (async()=>{
   if(!Number.isFinite(l.longitude)||!Number.isFinite(l.latitude))return;
   const data=await get('/api/contexte-foncier?code_insee='+encodeURIComponent(l.code_insee)+'&lon='+l.longitude+'&lat='+l.latitude,24000);
   state.planning=data?.urbanisme||null;state.risk=data?.risques||null;redraw()
  })()
 ]);
 if(rents().length){
  const history=await get('/api/loyers?historique=1&code_insee='+encodeURIComponent(l.code_insee),85000);
  if(arr(history?.types).some(t=>typeof t.dernier==='number')){state.rent=history;redraw()}
 }
}
$('newSearch').onclick=()=>location.assign('/');
$('mobileNav').onclick=()=>{$('side').classList.add('show');$('overlay').classList.add('show')};
$('overlay').onclick=()=>{$('side').classList.remove('show');$('overlay').classList.remove('show')};
$('copy').onclick=()=>navigator.clipboard?.writeText(location.href).catch(()=>{});
$('print').onclick=()=>window.print();
$('preset').onchange=redraw;
load();
