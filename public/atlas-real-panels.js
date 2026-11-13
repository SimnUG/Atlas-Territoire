'use strict';
/*
 * Le squelette et les composants graphiques suivent la maquette HTML approuvée.
 * Chaque valeur provient d'une observation officielle reçue ou d'un calcul
 * déterministe documenté. Jamais de pourcentage T1–T5 fictif.
 */
(function(){
const nf=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1});
const f=(n,unit='')=>typeof n==='number'&&Number.isFinite(n)?nf.format(n)+(unit?' '+unit:''):'';
const list=x=>Array.isArray(x)?x:[];
const text=(tag,cls,value)=>{
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(value!==undefined&&value!==null)n.textContent=String(value);
 return n;
};
const valid=x=>x&&x.statut==='disponible'&&typeof x.valeur==='number'&&Number.isFinite(x.valeur);
const levels=s=>list(s.analysis?.indicateurs).filter(valid);
const cat=(s,k)=>list(s.analysis?.categories?.[k]).filter(valid);
const history=s=>list(s.analysis?.categories?.population_historique)
 .filter(x=>typeof x.population==='number'&&x.population>0&&typeof x.annee==='number')
 .sort((a,b)=>a.annee-b.annee);
const age=s=>list(s.analysis?.demographie_detail?.tranches_age)
 .filter(x=>x.libelle&&typeof x.valeur==='number');
const houses=s=>list(s.housing?.commune?.distribution).filter(x=>typeof x.valeur==='number');
const rooms=s=>list(s.housing?.commune?.pieces).filter(x=>typeof x.valeur==='number');
const rents=s=>list(s.rent?.types).filter(x=>typeof x.dernier==='number'&&x.dernier>0);
const tx=s=>list(s.analysis?.dvf?.transactions).filter(x=>x&&(x.date||typeof x.valeur==='number'));
const dpes=s=>list(s.analysis?.dpe?.enregistrements).filter(x=>x&&x.numero);
const financed=s=>cat(s,'finances');
function record(name,value,unit='',source=null,year=null,scope='commune'){
 return {name,value,unit,source,year,scope};
}
function asKpi(x){return record(x.nom,x.valeur,x.unite||'',x.source,x.millesime,x.niveau)}
function numeric(v){return typeof v==='number'&&Number.isFinite(v)}
function newPanel(title,desc,tag){
 const p=text('section','card'),h=text('div','panel-head'),lhs=text('div');
 lhs.append(text('div','panel-title',title));
 if(desc)lhs.append(text('div','panel-desc',desc));
 h.append(lhs);
 if(tag)h.append(text('div','tag',tag));
 p.append(h);return p;
}
function barRows(data,unit=''){
 const out=text('div');
 const rows=list(data).filter(x=>x&&x.label&&numeric(x.value)&&x.value>=0);
 if(!rows.length)return out;
 const max=Math.max(1,...rows.map(x=>x.value));
 for(const r of rows){
  const row=text('div','barrow'),t=text('div','track'),fill=text('div','fill');
  fill.style.width=Math.min(100,r.value/max*100)+'%';
  t.append(fill);
  row.append(text('span','barrow-label',r.label),t,text('span','barrow-value',f(r.value,r.unit||unit)));
  out.append(row);
 }
 return out;
}
function lineChart(points){
 const svgNS='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(svgNS,'svg');
 svg.setAttribute('viewBox','0 0 530 215');
 svg.setAttribute('class','figure');
 const w=530,h=215,m=24;
 const vals=points.map(x=>x.value);
 let mx=Math.max(...vals),mn=Math.min(...vals);
 if(mx===mn){mx+=1;mn-=1}else{const padding=(mx-mn)*.12;mx+=padding;mn-=padding}
 const dx=(w-2*m)/Math.max(1,points.length-1);
 for(let i=0;i<4;i++){
  const line=document.createElementNS(svgNS,'line');
  [['x1',m],['x2',w-m],['y1',m+(h-2*m)*i/3],['y2',m+(h-2*m)*i/3],
   ['stroke','#e9edf4'],['stroke-width','1']].forEach(([k,v])=>line.setAttribute(k,v));
  svg.append(line);
 }
 const p=vals.map((v,i)=>[m+i*dx,h-m-(v-mn)/(mx-mn)*(h-2*m)]);
 const poly=document.createElementNS(svgNS,'path');
 const area='M '+p[0][0]+' '+(h-m)+' L '+p.map(a=>a.join(' ')).join(' L ')
  +' L '+p[p.length-1][0]+' '+(h-m)+' Z';
 poly.setAttribute('d',area);poly.setAttribute('fill','#dfebf8');poly.setAttribute('opacity','.65');svg.append(poly);
 const path=document.createElementNS(svgNS,'path');
 path.setAttribute('d','M '+p.map(a=>a.join(' ')).join(' L '));
 path.setAttribute('fill','none');path.setAttribute('stroke','#d30a71');
 path.setAttribute('stroke-width','3.5');path.setAttribute('stroke-linecap','round');svg.append(path);
 p.forEach(([x,y],i)=>{
  const c=document.createElementNS(svgNS,'circle');
  [['cx',x],['cy',y],['r',i===p.length-1?'6':'4'],['fill','#fff'],
   ['stroke','#d30a71'],['stroke-width','3']].forEach(([k,v])=>c.setAttribute(k,v));
  svg.append(c);
  const caption=document.createElementNS(svgNS,'text');
  caption.setAttribute('x',x);caption.setAttribute('y',h-6);
  caption.setAttribute('text-anchor','middle');
  caption.textContent=String(points[i].label);
  svg.append(caption);
 });
 return svg;
}
function kpiSection(root,kpis){
 const values=list(kpis).filter(x=>x&&(numeric(x.value)||typeof x.value==='string'&&x.value));
 if(!values.length)return;
 const grid=text('div','kpis');
 values.slice(0,4).forEach(x=>{
  const item=text('div','card');
  item.append(text('div','kpi-title',x.name),
    text('div','kpi-value',numeric(x.value)?f(x.value,x.unit):String(x.value)),
    text('div','kpi-change',[
      x.year?'Millésime '+x.year:null,x.scope,x.source?.nom
    ].filter(Boolean).join(' · ')));
  grid.append(item);
 });root.append(grid);
}
function addSource(panel,source){
 if(!source?.nom)return;
 const block=text('div','source-line');
 block.append(text('strong',null,'Source : '),text('span',null,source.nom));
 if(source.url&&/^https:\/\//.test(source.url)){
  const a=text('a','source',' Consulter');
  a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';
  block.append(a);
 }panel.append(block);
}
function barPanel(o){
 if(!o?.rows?.some(r=>numeric(r.value)))return null;
 const p=newPanel(o.title,o.desc||'Données observées avec une définition commune',o.tag||'GRAPHIQUE');
 p.append(barRows(o.rows));addSource(p,o.source);return p;
}
function seriesPanel(o){
 if(!o||!list(o.rows).filter(x=>numeric(x.value)).length)return null;
 const data=o.rows.filter(x=>numeric(x.value));
 if(data.length<2)return null;
 const p=newPanel(o.title,o.desc||'Série chronologique issue de données publiées','ÉVOLUTION');
 p.append(lineChart(data));addSource(p,o.source);return p;
}
function tablePanel(o){
 if(!o||!list(o.rows).length)return null;
 const p=newPanel(o.title,o.desc||'',o.tag||'TABLEAU');
 const wrap=text('div','tablewrap'),tbl=text('table'),thead=text('thead'),tr=text('tr');
 o.heads.forEach(label=>tr.append(text('th',null,label)));thead.append(tr);tbl.append(thead);
 const body=text('tbody');
 o.rows.slice(0,35).forEach(vals=>{
  const row=text('tr');vals.forEach(v=>row.append(text('td',null,v??'')));body.append(row);
 });
 tbl.append(body);wrap.append(tbl);p.append(wrap);addSource(p,o.source);return p;
}
function insightPanel(message,source){
 if(!message||!message.title)return null;
 const p=text('section','insight'),container=text('div');
 container.append(text('div','insight-head','◈  Lecture pour le développement foncier'),
  text('h3',null,message.title));
 if(message.detail)container.append(text('p',null,message.detail));
 p.append(container);
 p.append(text('small',null,
  source?.nom?'Interprétation à partir de '+source.nom:'Analyse descriptive — aucune donnée simulée'));
 return p;
}
function realMapPanel(s,title){
 const l=s.loc||{};
 const lat=Number(l.latitude),lon=Number(l.longitude);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<40||lat>52||lon< -6||lon>11)return null;
 const p=newPanel(title||'Situation autour de l’adresse','Cartographie réelle centrée sur l’adresse géocodée','CARTE');
 const view=text('div','map-sketch live-map');
 // L’iframe OSM provient d’un fournisseur distinct, cité explicitement.
 const iframe=document.createElement('iframe');
 const qp=new URLSearchParams({
  bbox:[lon-.012,lat-.007,lon+.012,lat+.007].join(','),
  layer:'mapnik',marker:lat+','+lon
 });
 iframe.src='https://www.openstreetmap.org/export/embed.html?'+qp.toString();
 iframe.loading='lazy';iframe.title='Carte OpenStreetMap autour du terrain';
 iframe.referrerPolicy='no-referrer';iframe.setAttribute('allowfullscreen','');
 view.append(iframe);p.append(view);
 addSource(p,{nom:'© OpenStreetMap contributors — fond cartographique',
 url:'https://www.openstreetmap.org/copyright'});
 return p;
}
function locationPanel(s,title){
 const l=s.loc||{},a=s.admin||{};
 const facts=[
 ['Commune',l.commune],['Code INSEE',l.code_insee],
 ['Intercommunalité',a.epci?.nom],['Département',a.departement?.nom],
 ['Région',a.region?.nom],['Adresse',l.adresse]
 ].filter(x=>x[1]!==null&&x[1]!==undefined&&String(x[1]).trim());
 if(!facts.length)return null;
 const p=newPanel(title||'Fiche du territoire','Référentiel administratif et géocodage de l’adresse','SYNTHÈSE');
 const wrap=text('div','two-col-summary');
 facts.forEach(([name,val])=>{
  const entry=text('div','summary-stat');
  entry.append(text('strong',null,val),text('span',null,name));wrap.append(entry);
 });
 p.append(wrap);
 addSource(p,{nom:'Référentiel administratif national — data.gouv.fr',
 url:'https://geo.api.gouv.fr/'});
 return p;
}
function sourcesPanel(s,id){
 const sources=new Map(),add=x=>{if(x?.nom)sources.set(x.nom,x)};
 const d=s.analysis||{};
 list(d.indicateurs).filter(x=>x.statut==='disponible').forEach(x=>add(x.source));
 if(s.housing?.commune?.distribution?.length)add(s.housing.source);
 if(s.rent?.types?.some(x=>numeric(x.dernier)))add(s.rent.source);
 if(list(d.dpe?.enregistrements).length)add({nom:'ADEME — DPE',url:'https://data.ademe.fr/'});
 if(s.extras?.zonage)add(s.extras.zonage.source);
 if(s.extras?.ecoles)add(s.extras.ecoles.source);
 if(s.extras?.eau)add(s.extras.eau.source);
 if(s.planning?.zones?.length)add(s.planning.source);
 if(s.risk?.risques?.length)add(s.risk.source);
 if(!sources.size)return null;
 const rows=[...sources.values()].map(x=>[x.nom,x.url||'—']);
 return {title:'Traçabilité des données',heads:['Producteur de la donnée','Site officiel'],
 rows,source:{nom:'Sources citées par les connecteurs du site'}};
}
function execute(s,id){
 const analysis=s.analysis||{};
 const extras=s.extras||{},geo=s.loc||{};
 const A=cat(s,'population').map(asKpi),
  I=cat(s,'revenus').map(asKpi),L=cat(s,'logements').map(asKpi),
  E=cat(s,'emploi').map(asKpi),P=cat(s,'permis').map(asKpi),
  F=financed(s).map(asKpi),V=cat(s,'prix').map(asKpi),
  H=houses(s),AG=age(s),R=rents(s),S=tx(s),D=dpes(s),
  ht=history(s);
 const obj={kpi:[],bar1:null,bar2:null,series:null,table:null,map:false,insight:null,source:null};
 const inn={nom:'INSEE — Recensement de la population',url:'https://www.insee.fr/'};
 const med={nom:'Ministère chargé du logement',url:'https://www.ecologie.gouv.fr/'};
 const houseSrc=s.housing?.source||inn;
 const adminSrc=s.admin?.source;
 const popVal=A.find(x=>/Population municipale|Population légale|Population/.test(x.name));
 const pctH=H.filter(x=>numeric(x.part)).map(x=>({label:x.label,value:x.part,unit:'%'}));
 const ageRows=AG.map(x=>({label:x.libelle,value:x.valeur,unit:'habitants'}));
 const houseRows=H.map(x=>({label:x.label,value:x.valeur,unit:'logements'}));
 const rentRows=R.map(x=>({label:x.nom,value:x.dernier,unit:'€/m²'}));
 const txRows=S.slice(0,20).map(x=>[x.date||'—',x.type||'—',f(x.surface,'m²')||'—',f(x.valeur,'€')||'—']);
 const trxSource=s.analysis?.dvf?.source||{nom:'DVF+ — DGFiP / Cerema',url:'https://www.data.gouv.fr/datasets/dvfplus-open-data'};
 const tranTable=()=>txRows.length?{
  title:'Mutations observées',heads:['Date','Type déclaré','Surface bâtie','Valeur foncière'],
  rows:txRows,source:trxSource,
  desc:'Ces mutations ne constituent pas une estimation du bien étudié.'}:null;
 const ageBar=()=>ageRows.length?{title:'Répartition par âge',rows:ageRows,source:inn}:null;
 const housingBar=()=>pctH.length?{title:'Composition du parc résidentiel',rows:pctH,source:houseSrc}:null;
 const roomsBar=()=>rooms(s).length?{
 title:'Nombre de pièces des résidences principales',
 rows:rooms(s).map(x=>({label:x.piece,value:x.valeur,unit:'logements'})),source:houseSrc}:null;
 const popLine=()=>ht.length>1?{title:'Évolution de la population',rows:ht.slice(-6).map(x=>({label:x.annee,value:x.population})),source:inn}:null;
 const dpeCounts=()=>{
  const counts={};for(const d of D){const c=String(d.dpe||'').toUpperCase();
   if(/^[A-G]$/.test(c))counts[c]=(counts[c]||0)+1}
  return Object.entries(counts).sort((a,b)=>a[0].localeCompare(b[0])).map(([label,value])=>({label,value,unit:'diagnostics'}));
 };
 const schoolSrc=extras.ecoles?.source;
 const schoolBar=extras.ecoles?.types?{title:'Établissements scolaires par type',
  rows:Object.entries(extras.ecoles.types).map(([label,value])=>({label,value,unit:'étab.'})),source:schoolSrc}:null;
 const schoolKpi=extras.ecoles?.total?record('Établissements scolaires recensés',extras.ecoles.total,'établissements',schoolSrc):null;
 const abc=extras.zonage;
 switch(id){
 case 'programmation':
  obj.kpi=[...A,...L,...P,...V].slice(0,4);
  obj.bar1=housingBar()||ageBar();
  obj.bar2=roomsBar()||ageBar();
  obj.series=popLine();
  obj.table=tranTable();
  if(H.length&&H.some(x=>x.key==='principales')){
    const val=H.find(x=>x.key==='principales');
    obj.insight={title:'Le parc comprend '+f(val.valeur)+' résidences principales',
     detail:'Cette donnée communale peut orienter une première lecture du marché, mais ne permet pas à elle seule de chiffrer une programmation T1–T5.'};
  }
  obj.source=houseSrc;break;
 case 'commercialisation':
  obj.kpi=[...V,...I,...R.slice(0,2).map(x=>record('Loyer '+x.nom,x.dernier,'€/m²/mois',s.rent?.source,2025))].slice(0,4);
  obj.bar1=rentRows.length?{title:'Loyers estimés par typologie',rows:rentRows,source:s.rent?.source}:null;
  obj.table=tranTable();obj.map=true;
  obj.source=trxSource;break;
 case 'toutes':
  obj.kpi=[
   record('Indicateurs vérifiés',levels(s).length,'valeurs',null),
   record('Rubriques du tableau de bord',27,'onglets',null),
   record('Périmètres de comparaison',list(s.admin?.comparaisons).length,'territoires',adminSrc),
   ...A.slice(0,1)].slice(0,4);
  obj.bar1=housingBar()||ageBar();
  obj.bar2=schoolBar;obj.table=sourcesPanel(s,id);
  obj.source=adminSrc;break;
 case 'focus':
  obj.kpi=[...A.slice(0,1),...L.slice(0,1),...V.slice(0,1),...I.slice(0,1)];
  if(!obj.kpi.length && s.admin?.commune?.population)
   obj.kpi=[record('Population administrative',s.admin.commune.population,'habitants',adminSrc)];
  obj.bar1=housingBar()||ageBar();
  obj.map=true;obj.source=adminSrc;break;
 case 'population':
  obj.kpi=A;
  if(ht.length>=2){
   const x=ht[0],y=ht[ht.length-1];
   const yrs=y.annee-x.annee;
   if(x.population>0&&yrs>0){
    obj.kpi.push(record('Croissance observée',Math.round(1000*(y.population/x.population-1))/10,'%',inn,y.annee));
    obj.kpi.push(record('Croissance annuelle moyenne',
      Math.round(10000*(Math.pow(y.population/x.population,1/yrs)-1))/100,'%/an',inn,y.annee));
   }
  }
  obj.series=popLine();obj.bar1=ageBar();
  obj.source=inn;break;
 case 'familles':
  obj.kpi=[...A.slice(0,1),...L.slice(0,1)];
  obj.bar1=ageBar();obj.bar2=roomsBar();
  obj.source=inn;break;
 case 'emploi':
  obj.kpi=E;obj.bar1=E.length?{title:'Indicateurs de l’emploi recensés',
   rows:E.map(x=>({label:x.name,value:x.value,unit:x.unit})),source:inn}:null;
  obj.source=inn;break;
 case 'salaires':
  obj.kpi=I.slice(0,2);obj.bar1=null;obj.source=inn;break;
 case 'revenus':
  obj.kpi=I;obj.bar1=I.length?{title:'Indicateurs de revenu et de pauvreté',
   rows:I.filter(x=>x.unit==='%').map(x=>({label:x.name,value:x.value,unit:'%'})),source:inn}:null;
  obj.source=inn;break;
 case 'migrations':
  obj.kpi=[...A.slice(0,1)];
  obj.series=popLine();obj.map=true;obj.source=inn;break;
 case 'elections':
  obj.kpi=[];obj.map=true;
  obj.source={nom:'Ministère de l’Intérieur',url:'https://www.interieur.gouv.fr/'};
  break;
 case 'equipements':
  if(schoolKpi)obj.kpi=[schoolKpi];
  obj.bar1=schoolBar;
  obj.table=extras.ecoles?.établissements?.length?{
   title:'Établissements identifiés dans la commune',
   heads:['Établissement','Catégorie','Secteur'],
   rows:extras.ecoles.établissements.slice(0,28).map(x=>[x.nom,x.type,x.public_prive||'—']),
   source:schoolSrc
  }:null;
  obj.map=true;obj.source=schoolSrc;break;
 case 'logements':
  obj.kpi=[...L];
  const main=H.find(x=>x.key==='principales'),vac=H.find(x=>x.key==='vacants');
  if(main)obj.kpi.push(record('Résidences principales',main.valeur,'logements',houseSrc,s.housing?.commune?.annee));
  if(vac)obj.kpi.push(record('Logements vacants',vac.valeur,'logements',houseSrc,s.housing?.commune?.annee));
  obj.bar1=housingBar();obj.bar2=roomsBar();
  if(rooms(s).length){
   const epci=new Map(list(s.housing?.epci?.pieces).map(x=>[x.piece,x]));
   obj.table={
    title:'Résidences principales selon le nombre de pièces',
    heads:['Nombre de pièces','Commune','Intercommunalité'],
    rows:rooms(s).map(x=>[x.piece,f(x.valeur),epci.has(x.piece)?f(epci.get(x.piece).valeur):'—']),
    source:houseSrc};
  }obj.source=houseSrc;break;
 case 'social':
  obj.kpi=L.slice(0,1);obj.bar1=housingBar();obj.source=houseSrc;break;
 case 'sru':
  obj.kpi=[];obj.source=med;break;
 case 'zonage':
  if(abc?.zone)obj.kpi=[record('Zonage ABC de la commune',abc.zone,'',abc.source,2026)];
  obj.map=true;obj.source=abc?.source||med;break;
 case 'permis':
  obj.kpi=P;obj.bar1=P.length?{title:'Autorisations de logements',
   rows:P.map(x=>({label:x.name,value:x.value,unit:x.unit})),source:s.analysis?.sitadel?.source}:null;
  obj.source=s.analysis?.sitadel?.source;break;
 case 'prix':
  obj.kpi=V;obj.table=tranTable();
  const priceValid=S.filter(x=>numeric(x.prix_m2)&&x.prix_m2>0&&x.prix_m2<30000);
  if(priceValid.length>=2){
   const prices=priceValid.map(x=>x.prix_m2).sort((a,b)=>a-b);
   const md=prices.length%2?prices[(prices.length-1)/2]:(prices[prices.length/2-1]+prices[prices.length/2])/2;
   obj.kpi.push(record('Médiane des références reçues',Math.round(md),'€/m²',trxSource));
  }
  const counts={};S.forEach(x=>{if(typeof x.type==='string'&&x.type){
    counts[x.type]=(counts[x.type]||0)+1;}});
  const tc=Object.entries(counts);
  if(tc.length)obj.bar1={title:'Typologie des mutations reçues',
   desc:'Répartition de l’échantillon renvoyé par DVF+, sans extrapolation',
   rows:tc.slice(0,8).map(([label,value])=>({label,value,unit:'mutations'})),source:trxSource};
  obj.source=trxSource;break;
 case 'loyers':
  obj.kpi=R.map(x=>record(x.nom,x.dernier,'€/m²/mois',s.rent?.source,2025)).slice(0,4);
  obj.bar1=rentRows.length?{title:'Loyers estimés en 2025',
   rows:rentRows,source:s.rent?.source}:null;
  obj.table=R.length?{title:'Loyers du parc privé par typologie',
   heads:['Typologie','Loyer annoncé estimé','Échelle géographique'],
   rows:R.map(x=>[x.nom,f(x.dernier,'€/m²/mois'),
    list(x.serie).find(v=>v.annee===2025)?.niveau_prediction||'Non précisée']),
   source:s.rent?.source}:null;
  obj.source=s.rent?.source;break;
 case 'batiments':
  const classes=dpeCounts();
  if(D.length)obj.kpi=[
   record('DPE associés exactement à l’adresse',D.length,'diagnostics',
    {nom:'ADEME — Diagnostics de performance énergétique',url:'https://data.ademe.fr/'})
  ];
  const fg=classes.filter(x=>['F','G'].includes(x.label)).reduce((sum,x)=>sum+x.value,0);
  const allClasses=classes.reduce((sum,x)=>sum+x.value,0);
  if(allClasses>0)obj.kpi.push(record('DPE classés F ou G',
    Math.round(fg/allClasses*1000)/10,'%',{nom:'Calcul ATLAS à partir des DPE ADEME',url:'https://data.ademe.fr/'}));
  obj.bar1=classes.length?{title:'Étiquettes de performance énergétique',
    rows:classes,source:{nom:'ADEME',url:'https://data.ademe.fr/'}}:null;
  obj.table=D.length?{title:'Diagnostics authentifiés',
   heads:['Date','DPE','GES','Identifiant'],
   rows:D.slice(0,20).map(x=>[x.date||'—',x.dpe||'—',x.ges||'—',x.numero]),
   source:{nom:'ADEME — DPE',url:'https://data.ademe.fr/'}}:null;
  obj.source={nom:'ADEME — DPE',url:'https://data.ademe.fr/'};break;
 case 'eau':
  if(extras.eau?.reseaux?.length){
   obj.kpi=[record('Réseaux de distribution identifiés',extras.eau.reseaux.length,
    'unités',extras.eau.source)];
   obj.table={title:'Réseaux desservant la commune',
    heads:['Unité de distribution','Code officiel'],
    rows:extras.eau.reseaux.map(x=>[x.nom,x.code||'—']),
    source:extras.eau.source};
  }
  obj.source=extras.eau?.source;break;
 case 'risques':
  const risks=list(s.risk?.risques);
  if(risks.length)obj.kpi=[record('Types d’aléas recensés',risks.length,
   'aléas',s.risk?.source)];
  obj.table=risks.length?{title:'Risques recensés à l’échelle communale',
   heads:['Nature de l’aléa'],rows:risks.map(x=>[x]),source:s.risk?.source}:null;
  obj.map=true;obj.source=s.risk?.source;break;
 case 'chaleur':
  obj.kpi=[];obj.map=true;obj.source=null;break;
 case 'artificialisation':
  obj.kpi=[];obj.map=true;obj.source=null;break;
 case 'urbanisme':
  const zones=list(s.planning?.zones);
  if(zones.length)obj.kpi=[record('Zone du PLU au point étudié',
    zones[0].libelle,'',s.planning?.source)];
  obj.table=zones.length?{title:'Zones d’urbanisme identifiées au point',
   heads:['Zone','Document administratif'],
   rows:zones.map(x=>[x.libelle,x.details?.document||'—']),
   source:s.planning?.source}:null;
  obj.map=true;obj.source=s.planning?.source;break;
 case 'finances':
  obj.kpi=F;obj.bar1=F.length?{
   title:'Repères financiers communaux',
   rows:F.filter(x=>numeric(x.value)&&x.value>=0).slice(0,9)
    .map(x=>({label:x.name,value:x.value,unit:x.unit})),
   source:F[0]?.source}:null;obj.source=F[0]?.source;break;
 case 'sources':
  obj.kpi=[
   record('Indicateurs numériques vérifiés',levels(s).length,'indicateurs'),
   record('Onglets de l’étude',27,'rubriques')
  ];
  obj.table=sourcesPanel(s,id);
  obj.source=null;break;
 }
 return obj;
}

/* Présentation verrouillée : reprend la structure de chaque page de la
 * maquette approuvée, quel que soit le nombre de réponses réelles reçues.
 * Les chiffres "—" ne sont jamais remplacés par les valeurs fictives. */
const simplify=v=>String(v||'').normalize('NFD')
 .replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function officialKpi(s,id,label,live){
 const key=simplify(label);
 const all=list(live?.kpi);
 const direct=all.find(k=>{
  const actual=simplify(k.name),target=simplify(label);
  return target.length>5&&(actual===target||actual.startsWith(target+' '));
 });
 if(direct && (numeric(direct.value)||typeof direct.value==='string'&&direct.value))return direct;
 const a=s.analysis||{},cats=a.categories||{},extra=s.extras||{};
 const kpis=[...list(cats.population),...list(cats.revenus),...list(cats.logements),
  ...list(cats.permis),...list(cats.prix),...list(cats.emploi),...list(cats.finances)]
  .filter(x=>x?.statut==='disponible'&&numeric(x.valeur));
 const lookup=(...patterns)=>{
  const found=kpis.find(x=>patterns.some(rx=>rx.test(simplify(x.nom))));
  return found?record(label,found.valeur,found.unite,found.source,found.millesime,found.niveau):null;
 };
 const H=houses(s),R=rents(s),D=dpes(s),T=tx(s);
 const hValue=(type,attr)=>{
  const found=H.find(x=>x.key===type);
  return found&&numeric(found[attr])?record(label,found[attr],attr==='part'?'%':'logements',
    s.housing?.source,s.housing?.commune?.annee):null;
 };
 const total=H.length===3&&new Set(H.map(x=>x.key)).size===3
  &&H.every(x=>numeric(x.valeur))?H.reduce((sum,x)=>sum+x.valeur,0):null;
 const exactTotal=()=>numeric(total)&&total>0?record(label,total,'logements',
  s.housing?.source,s.housing?.commune?.annee):null;
 const dated=catVal=>catVal?record(label,catVal.dernier,'€/m²/mois',
  s.rent?.source,2025):null;
 const rentType=type=>dated(R.find(x=>x.id===type));
 const counts=()=>new Set(kpis.map(x=>x.source?.nom).filter(Boolean)).size;
 if(id==='programmation'){
  if(key==='menages')return lookup(/^nombrede menages$/, /^menages$/);
  if(key==='logementsexistants')return exactTotal();
  if(key==='logementsautorises')return lookup(/logementsautorises/,/autorisationsdelogements/);
  if(key==='revenumedian')return lookup(/niveaudeviemedian/,/revenumedian/);
 }
 if(id==='commercialisation'){
  if(key==='prixmedianancien')return lookup(/medianeprix.*ancien/,/prixmedianancien/);
  if(key==='prixmoyenneuf')return lookup(/prixmoyenneuf/,/prixmedianneuf/);
  if(key==='transactionsan'&&a.dvf?.exhaustif===true){
   const year=new Date().getUTCFullYear()-1;
   const vals=T.filter(x=>String(x.date||'').startsWith(String(year)));
   if(vals.length)return record(label,vals.length,'mutations',a.dvf?.source,year);
  }
 }
 if(id==='toutes'){
  if(key==='indicateursproposes')return record(label,levels(s).length,'indicateurs');
  if(key==='themesdanalyse')return record(label,27,'onglets');
  if(key==='perimetres')return record(label,list(s.admin?.comparaisons).length,'territoires',s.admin?.source);
  if(key==='sourcesdocumentees')return record(label,counts(),'sources');
 }
 if(id==='focus'||id==='population'){
  if(key==='population')return lookup(/^populationmunicipale$/, /^populationlegale$/, /^populationtotale$/)
    ||(numeric(s.admin?.commune?.population)?record(label,s.admin.commune.population,'habitants',s.admin?.source):null);
  if(key==='logements')return exactTotal();
  if(key==='prixmedian')return lookup(/median.*m2/,/prixmedian/);
  if(key==='croissance'||key==='evolutionsur5ans'){
   const hist=history(s),last=hist.at(-1),first=hist.find(x=>last&&x.annee<=last.annee-5);
   if(first&&last&&first.population>0&&last.annee>first.annee){
    const growth=(last.population/first.population-1)*100;
    return record(label,Math.round(growth*10)/10,'%',{
     nom:'Calcul ATLAS à partir des populations INSEE',url:'https://www.insee.fr/'},last.annee);
   }
  }
  if(key==='densite')return lookup(/^densitedepopulation/);
  if(key==='agemedian')return lookup(/^agemedian/);
 }
 if(id==='familles'){
  if(key==='menages')return lookup(/^nombrede menages$/, /^menages$/);
  if(key==='taillemoyenne')return lookup(/taillemoyennedesmenages/);
  if(key==='personnesseules')return lookup(/personnesseules/);
  if(key==='famillesavecenfants')return lookup(/famillesavecenfants/);
 }
 if(id==='emploi'){
  if(key==='emploislocaux')return lookup(/emploisaulieudetravail/, /^emploislocalises/);
  if(key==='actifsoccupes')return lookup(/actifsoccupes/,/populationactiveoccupee/);
  if(key==='tauxdactivite')return lookup(/tauxdactivite/);
  if(key==='tauxdechomage')return lookup(/tauxdechomage/);
 }
 if(id==='salaires'){
  if(key==='salairemedian')return lookup(/salairenetmedian/);
  if(key==='salairemoyen')return lookup(/salaire netmoyen/,/salairenetmoyen/);
 }
 if(id==='revenus'){
  if(key==='niveaudeviemedian')return lookup(/niveaudeviemedian/);
  if(key==='tauxdepauvrete')return lookup(/tauxdepauvrete/);
  if(key==='d1')return lookup(/decile1/,/^d1$/);
  if(key==='d9')return lookup(/decile9/,/^d9$/);
 }
 if(id==='equipements'&&key==='ecoles'){
  const count=list(extra.ecoles?.établissements).filter(x=>
   ['Maternelle','Élémentaire / primaire'].includes(x.categorie)).length;
  if(count)return record(label,count,'établissements',extra.ecoles?.source);
 }
 if(id==='logements'){
  if(key==='logements')return exactTotal();
  if(key==='residencesprincipales')return hValue('principales','part');
  if(key==='maisons')return lookup(/maisons.*parc/,/partdesmaisons/);
  if(key==='logementsvacants')return hValue('vacants','part');
 }
 if(id==='zonage'&&extra.zonage?.zone){
  if(key==='zonageabc')return record(label,extra.zonage.zone,'',extra.zonage.source,extra.zonage.millésime);
  if(key==='reference')return record(label,'Arrêté 2026','',extra.zonage.source,extra.zonage.millésime);
 }
 if(id==='permis'){
  if(key==='autorises')return lookup(/autorises/,/autorisation/);
  if(key==='commences')return lookup(/commences/);
  if(key==='collectifs')return lookup(/collectifs/);
  if(key==='variationannuelle')return lookup(/variationannuelle/);
 }
 if(id==='prix'){
  if(key==='appartementmedian')return lookup(/appartementmedian/,/median.*appartement/);
  if(key==='maisonmediane')return lookup(/maisonmediane/,/median.*maison/);
  if(key==='ventesan'&&a.dvf?.exhaustif){
   const year=new Date().getUTCFullYear()-1;
   const vals=T.filter(x=>String(x.date||'').startsWith(String(year)));
   if(vals.length)return record(label,vals.length,'mutations',a.dvf.source,year);
  }
  if(key==='prixterrain')return lookup(/prixterrain/);
 }
 if(id==='loyers'){
  if(key==='appartements')return rentType('appartements');
  if(key==='t1t2')return rentType('petits');
  if(key==='t3etplus')return rentType('grands');
  if(key==='maisons')return rentType('maisons');
 }
 if(id==='batiments'){
  if(key==='dperenseignes'&&D.length)return record(label,D.length,'DPE',
   {nom:'ADEME — Diagnostics de performance énergétique',url:'https://data.ademe.fr/'});
  if(key==='classesfg'){
   const vals=D.map(x=>String(x.dpe||'').toUpperCase()).filter(x=>/^[A-G]$/.test(x));
   if(vals.length){
    const bad=vals.filter(x=>x==='F'||x==='G').length;
    return record(label,Math.round(bad/vals.length*1000)/10,'%',
     {nom:'Calcul ATLAS sur les DPE ADEME',url:'https://data.ademe.fr/'});
   }
  }
 }
 if(id==='risques'&&key==='famillesdaleas'&&list(s.risk?.risques).length)
  return record(label,new Set(s.risk.risques).size,'familles',s.risk?.source);
 if(id==='urbanisme'&&key==='zoneplu'&&list(s.planning?.zones).length)
  return record(label,s.planning.zones[0].libelle,'',s.planning?.source);
 if(id==='finances'){
  if(key==='recettesdefonctionnement')return lookup(/recettesdefonctionnement/);
  if(key==='depenses')return lookup(/depensesdefonctionnement/, /^depenses$/);
  if(key==='epargnebrute')return lookup(/epargnebrute/);
  if(key==='dettehab')return lookup(/detteparhabitant/,/dettehab/);
 }
 if(id==='sources'){
  if(key==='sourcesdedepart')return record(label,14,'sources','',null);
  if(key==='sourcessupplementaires'){
   const avail=[s.planning?.source?.nom,s.risk?.source?.nom,
    s.extras?.ecoles?.source?.nom,s.extras?.eau?.source?.nom,
    s.admin?.source?.nom].filter(Boolean);
   return record(label,new Set(avail).size,'sources utilisées');
  }
  if(key==='perimetres')return record(label,list(s.admin?.comparaisons).length,'périmètres',s.admin?.source);
  if(key==='miseajour')return record(label,'Selon chaque source');
 }
 return null;
}
function templateKpis(root,layout,s,id,live){
 const g=text('div','kpis');
 for(const name of layout.kpis){
  const data=officialKpi(s,id,name,live);
  const available=data&&(numeric(data.value)||typeof data.value==='string'&&data.value);
  const card=text('div','card');
  card.append(text('div','kpi-title',name),
   text('div','kpi-value',available?
    (numeric(data.value)?f(data.value,data.unit):String(data.value)):'—'),
   text('div','kpi-change',available?
    [data.year?'Millésime '+data.year:null,data.scope,data.source?.nom].filter(Boolean).join(' · ')
    :'Donnée non disponible'));
  g.append(card);
 }
 root.append(g);
}
function barValues(s,id,slot,labels){
 const blank=labels.map(label=>({label,value:null,unit:''}));
 const l=s.analysis||{};
 const H=houses(s),R=rents(s);
 if(slot==='bar2')return blank;
 if((id==='logements'||id==='focus')&&slot==='bar1'){
  const match={'principales':'principales','secondaires':'secondaires','vacants':'vacants'};
  const vals=['principales','secondaires','vacants'];
  return blank.map((o,i)=>{
   const h=H.find(x=>x.key===vals[i]);return {...o,
    value:numeric(h?.part)?h.part:null,unit:'%'};
  });
 }
 if(id==='population'&&slot==='bar1'){
  const groups=age(s);
  if(groups.length>=5){
   const src=groups.slice(0,labels.length);
   const all=groups.reduce((sum,x)=>sum+x.valeur,0);
   return blank.map((o,i)=>({...o,
    value:numeric(src[i]?.valeur)?src[i].valeur:null,unit:'habitants'}));
  }
 }
 if(id==='loyers'&&slot==='bar1'){
  const sequence=['appartements','petits','grands','maisons'];
  return blank.map((o,i)=>{
   const r=R.find(x=>x.id===sequence[i]);
   return {...o,value:numeric(r?.dernier)?r.dernier:null,unit:'€/m²'};
  });
 }
 if(id==='batiments'&&slot==='bar1'){
  const ds=dpes(s),valid=ds.map(x=>String(x.dpe||'').toUpperCase()).filter(x=>/^[A-G]$/.test(x));
  return blank.map(o=>({...o,value:valid.length?
   valid.filter(x=>x===o.label).length:null,unit:'DPE'}));
 }
 if(id==='equipements'&&slot==='bar1'){
  const schools=list(s.extras?.ecoles?.établissements);
  if(schools.length){
   return blank.map(o=>simplify(o.label)==='enseignement'?{
    ...o,value:schools.length,unit:'établissements'}:o);
  }
 }
 if(id==='prix'&&slot==='bar1'&&l.dvf?.exhaustif){
  const types=tx(s).reduce((out,t)=>{
   const n=simplify(t.type);
   if(n.includes('appartement'))out.appartements++;
   else if(n.includes('maison'))out.maisons++;
   else if(n.includes('terrain'))out.terrains++;
   return out;
  },{appartements:0,maisons:0,terrains:0});
  return blank.map((o,i)=>({...o,value:Object.values(types)[i]||null,unit:'mutations'}));
 }
 if((id==='toutes'||id==='sources')&&slot==='bar1'){
  const groups=[
   list(l.categories?.population).length+list(l.categories?.emploi).length+list(l.categories?.revenus).length,
   list(l.categories?.logements).length+list(l.categories?.prix).length+list(l.categories?.permis).length,
   list(l.categories?.dpe).length, list(s.planning?.zones).length+list(s.risk?.risques).length
  ];
  return blank.map((o,i)=>({...o,value:groups[i]>0?groups[i]:null,unit:'indicateurs'}));
 }
 return blank;
}
function fixedBarPanel(data,id,slot,s){
 const p=newPanel(data.title,'Données observées, sans valeur simulée',
   slot==='bar2'?'RÉPARTITION':'GRAPHIQUE');
 const d=text('div'),rows=barValues(s,id,slot,data.labels);
 const available=rows.filter(x=>numeric(x.value)&&x.value>=0);
 const max=available.length?Math.max(1,...available.map(x=>x.value)):1;
 for(const x of rows){
  const row=text('div','barrow'),track=text('div','track'),fill=text('div','fill');
  fill.style.width=numeric(x.value)?Math.min(100,x.value/max*100)+'%':'0%';
  track.append(fill);
  row.append(text('span','barrow-label',x.label),
   track,text('span','barrow-value',numeric(x.value)?f(x.value,x.unit):'—'));
  d.append(row);
 }
 p.append(d);
 if(available.length){
  const src=id==='loyers'?s.rent?.source:id==='logements'||id==='focus'?
   s.housing?.source:id==='equipements'?s.extras?.ecoles?.source:
   id==='prix'?s.analysis?.dvf?.source: id==='batiments'?
   {nom:'ADEME',url:'https://data.ademe.fr/'}:
   {nom:'Indicateurs issus des données officielles du territoire'};
  addSource(p,src);
 }
 return p;
}
function blankSeriesSvg(count){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
 svg.setAttribute('viewBox','0 0 530 215');svg.setAttribute('class','figure');
 for(let i=0;i<4;i++){
  const line=document.createElementNS(ns,'line');
  [['x1',24],['x2',506],['y1',24+167*i/3],['y2',24+167*i/3],
   ['stroke','#e9edf4']].forEach(([k,v])=>line.setAttribute(k,v));
  svg.append(line);
 }
 const n=Math.max(2,count||5);
 for(let i=0;i<n;i++){
  const caption=document.createElementNS(ns,'text');
  caption.setAttribute('x',24+i*482/(n-1));caption.setAttribute('y',209);
  caption.setAttribute('text-anchor','middle');
  caption.textContent='—';svg.append(caption);
 }
 const tx=document.createElementNS(ns,'text');
 tx.setAttribute('x',265);tx.setAttribute('y',110);
 tx.setAttribute('text-anchor','middle');tx.textContent='Données non disponibles';
 svg.append(tx);return svg;
}
function fixedSeriesPanel(s,id,layout,live){
 const p=newPanel(layout.title,'Évolution au cours des périodes observées','ÉVOLUTION');
 let rows=null;
 if(id==='population'&&history(s).length>=2){
  rows=history(s).slice(-layout.count).map(x=>({label:x.annee,value:x.population}));
 }
 if(id==='permis'){
  const ps=list(s.analysis?.sitadel?.permis)
   .filter(x=>numeric(x.annee)&&numeric(x.valeur)&&x.valeur>=0)
   .sort((a,b)=>a.annee-b.annee);
  if(ps.length>=2)rows=ps.slice(-layout.count).map(x=>({label:x.annee,value:x.valeur}));
 }
 if((id==='commercialisation'||id==='prix')&&s.analysis?.dvf?.exhaustif){
  const grouped=new Map();
  for(const t of tx(s)){
   const yr=Number(String(t.date||'').slice(0,4));
   if(yr<2010||yr>new Date().getUTCFullYear()||!numeric(t.prix_m2)||t.prix_m2<=0)continue;
   if(id==='prix'&&!simplify(t.type).includes('appartement'))continue;
   if(!grouped.has(yr))grouped.set(yr,[]);
   grouped.get(yr).push(t.prix_m2);
  }
  const listYears=[...grouped].filter(([,a])=>a.length>=5).sort((a,b)=>a[0]-b[0]);
  if(listYears.length>=2)rows=listYears.slice(-layout.count).map(([yr,prices])=>{
   const p=[...prices].sort((a,b)=>a-b);
   return {label:yr,value:p.length%2?p[(p.length-1)/2]:(p[p.length/2-1]+p[p.length/2])/2};
  });
 }
 p.append(rows&&rows.length>=2?lineChart(rows):blankSeriesSvg(layout.count));
 if(rows&&rows.length>=2)addSource(p,
  id==='population'?{nom:'INSEE — Populations historiques',url:'https://www.insee.fr/'}:
   id==='permis'?s.analysis?.sitadel?.source:s.analysis?.dvf?.source);
 return p;
}
function placeholderMap(s){
 return realMapPanel(s,'Situation autour de l’adresse')||(()=>{
  const p=newPanel('Situation autour de l’adresse',
   'Emplacement de la carte correspondant à la maquette','CARTE');
  const b=text('div','map-sketch');
  b.append(text('div','map-tag','Localisation non disponible'));
  p.append(b);return p;
 })();
}
function fixedSummaryPanel(layout,s,id){
 const p=newPanel('Chiffres clés du territoire','Repères de cette étude','SYNTHÈSE'),
  wrapper=text('div','two-col-summary');
 const actual=layout.kpis.map(name=>officialKpi(s,id,name,execute(s,id)));
 for(let i=0;i<layout.kpis.length;i++){
  const item=text('div','summary-stat'),v=actual[i],
   has=v&&(numeric(v.value)||typeof v.value==='string'&&v.value);
  item.append(text('strong',null,has?(numeric(v.value)?f(v.value,v.unit):String(v.value)):'—'),
   text('span',null,layout.kpis[i]));wrapper.append(item);
 }
 p.append(wrapper);return p;
}
function safeRows(template,id,s){
 const labels=template.labels;
 const cols=template.headers.length,placeholders=labels.map((label,i)=>{
  const arr=Array(cols).fill('—');arr[0]=label;return arr;
 });
 if(id==='prix'){
  const real=tx(s);
  for(let i=0;i<Math.min(placeholders.length,real.length);i++){
   const t=real[i],row=placeholders[i];
   for(let k=0;k<cols;k++){
    const h=simplify(template.headers[k]);
    if(h==='date')row[k]=t.date||'—';
    else if(h==='type')row[k]=t.type||'—';
    else if(h==='surface')row[k]=numeric(t.surface)?f(t.surface,'m²'):'—';
    else if(h==='prix')row[k]=numeric(t.valeur)?f(t.valeur,'€'):'—';
   }
  }
 }
 if(id==='logements'){
  const commune=rooms(s),epci=list(s.housing?.epci?.pieces);
  for(let i=0;i<Math.min(5,placeholders.length);i++){
   const key=i<4?i+1:5;
   const filter=x=>{
    const n=parseInt(x.piece,10);
    return Number.isInteger(n)&&(key===5?n>=5:n===key);
   };
   const c=commune.filter(filter),e=epci.filter(filter);
   if(c.length)placeholders[i][1]=f(c.reduce((sum,x)=>sum+x.valeur,0));
   if(e.length)placeholders[i][2]=f(e.reduce((sum,x)=>sum+x.valeur,0));
  }
 }
 if(id==='eau'&&s.extras?.eau?.reseaux?.length){
  const found=placeholders.find(x=>simplify(x[0])==='communedesservie');
  if(found)found[1]=s.loc?.commune||'—';
 }
 if(id==='sources'){
  const found=[...new Map(levels(s).map(x=>[x.source?.nom,x.source]).filter(x=>x[0])).values()];
  for(let i=0;i<Math.min(found.length,placeholders.length);i++){
   placeholders[i][0]=found[i].nom;
   if(cols>1)placeholders[i][1]='Source officielle';
  }
 }
 return placeholders;
}
function fixedTablePanel(layout,id,s){
 const p=newPanel(layout.title,'Structure de tableau identique à la maquette','TABLEAU'),
 wrap=text('div','tablewrap'),tbl=text('table'),
 thead=text('thead'),tr=text('tr');
 layout.headers.forEach(label=>tr.append(text('th',null,label)));
 thead.append(tr);tbl.append(thead);
 const body=text('tbody');
 for(const cells of safeRows(layout,id,s)){
  const row=text('tr');cells.forEach(value=>row.append(text('td',null,value)));
  body.append(row);
 }
 tbl.append(body);wrap.append(tbl);p.append(wrap);
 return p;
}
function fixedInsight(id,s,m){
 const real=m.insight,insight=text('section','insight'),content=text('div');
 content.append(text('div','insight-head','◈  Lecture pour le développement foncier'),
  text('h3',null,'Interprétation du marché'),
  text('p',null,real?.title?
   [real.title,real.detail].filter(Boolean).join(' — '):
   'Les données nécessaires à une analyse chiffrée ne sont pas disponibles dans les sources actuellement consultées.'));
 insight.append(content,text('small',null,
  real?.title?'Interprétation issue de données officielles, sous réserve de leur périmètre':
  'Emplacement d’analyse conservé à l’identique de la maquette'));
 return insight;
}
function render(root,id,state){
 const template=window.AtlasMockupLayout?.[id];
 if(!template)return false;
 const live=execute(state,id);
 root.replaceChildren();
 templateKpis(root,template,state,id,live);
 const row=text('div','panel-grid');
 if(template.bar1)row.append(fixedBarPanel(template.bar1,id,'bar1',state));
 if(template.series)row.append(fixedSeriesPanel(state,id,template.series,live));
 else if(template.bar2)row.append(fixedBarPanel(template.bar2,id,'bar2',state));
 else if(template.map)row.append(placeholderMap(state));
 else if(template.bar1)row.append(fixedSummaryPanel(template,state,id));
 if(row.children.length)root.append(row);
 if(template.bar2&&(template.series||template.map))
  root.append(fixedBarPanel(template.bar2,id,'bar2',state));
 if(template.table)root.append(fixedTablePanel(template.table,id,state));
 if(template.insight)root.append(fixedInsight(id,state,live));
 const p=text('div','source-line');
 p.append(text('strong',null,'Sources : '),
  text('span',null,live.source?.nom||'Données officielles lorsqu’elles sont disponibles'));
 root.append(p);
 return true;
}


window.AtlasPanels={render};
})();