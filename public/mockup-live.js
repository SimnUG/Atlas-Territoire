'use strict';
const $ = id=>document.getElementById(id);
const requested=new URLSearchParams(location.search).get('adresse')||'';
const state={loc:null,analysis:null,housing:null,rent:null,planning:null,risk:null,admin:null,tab:'programmation'};
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

const adminRows=()=>arr(state.admin?.comparaisons).filter(x=>x&&x.nom&&typeof x.population==='number');
function adminComparison(root,title='Comparaison des territoires'){
 const records=adminRows();
 if(!records.length)return;
 const max=Math.max(1,...records.map(x=>x.population));
 const c=card(title,'Populations de référence administrative, sans millésime explicite dans cette API.');
 for(const r of records){
  const box=elem('div','line');
  box.style.alignItems='center';
  const info=elem('div');info.style.flex='1';
  append(info,elem('b',null,r.nom+' · '+r.type),elem('p','source',r.code));
  const right=elem('div');right.style.flex='1';right.style.maxWidth='45%';
  const value=elem('b',null,num(r.population,'habitants'));
  const track=elem('div','track'),fill=elem('div','fill');
  fill.style.width=Math.max(1,r.population/max*100)+'%';track.append(fill);
  right.append(value,track);box.append(info,right);c.append(box);
 }
 source(c,state.admin?.source,'commune / EPCI / département / région');
 root.append(c);
}
function populationSummary(root){
 const values=arr(state.analysis?.categories?.population_historique)
   .filter(x=>typeof x.annee==='number'&&typeof x.population==='number')
   .sort((a,b)=>a.annee-b.annee);
 if(values.length<2)return;
 const first=values[0],last=values[values.length-1];
 const years=last.annee-first.annee;
 if(!years||first.population<=0||last.population<=0)return;
 const change=(last.population-first.population)/first.population*100;
 const annual=(Math.pow(last.population/first.population,1/years)-1)*100;
 const items=[
  {nom:'Évolution de population '+first.annee+'–'+last.annee,valeur:Math.round(change*10)/10,unite:'%',millesime:last.annee,
   niveau:'commune',source:{nom:'Calcul ATLAS à partir des populations INSEE',url:'https://www.insee.fr/'},statut:'disponible'},
  {nom:'Taux de variation annuel moyen',valeur:Math.round(annual*100)/100,unite:'%/an',millesime:last.annee,
   niveau:'commune',source:{nom:'Calcul ATLAS à partir des populations INSEE',url:'https://www.insee.fr/'},statut:'disponible'}
 ];
 metrics(root,items);
}
function homeComposition(root){
 const rows=homes();
 if(rows.length<3)return;
 const total=rows.reduce((sum,r)=>sum+r.valeur,0);
 if(!total)return;
 const results=rows.filter(x=>typeof x.part==='number').map(x=>({
  label:x.label,valeur:x.part,unit:'%'
 }));
 if(results.length)chart(root,'Répartition du parc résidentiel',results,state.housing?.source);
}

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
 const line=elem('div','source-line');
 line.append(elem('strong',null,'Source : '),elem('span',null,
   s.nom+(scale?' · '+scale:'')+(year?' · '+year:'')));
 node.append(line);link(node,s);
}
function metricBox(i){
 const x=elem('div','card');
 x.append(
  elem('div','kpi-title',i.nom),
  elem('div','kpi-value',num(i.valeur,i.unite)),
  elem('div','kpi-change',[
   i.millesime?'Millésime '+i.millesime:null,
   i.niveau||null,i.source?.nom||null
  ].filter(Boolean).join(' · '))
 );
 return x;
}
function metrics(root,values){
 const rows=arr(values).filter(good).slice(0,16);
 if(!rows.length)return;
 const group=elem('div','kpis');
 rows.forEach(i=>group.append(metricBox(i)));
 root.append(group);
}
function chart(root,title,items,s){
 const rows=arr(items).filter(x=>x&&typeof x.valeur==='number'&&Number.isFinite(x.valeur)&&x.valeur>=0&&x.label);
 if(!rows.length)return;
 const x=elem('section','card');
 const header=elem('div','panel-head'),lhs=elem('div');
 lhs.append(elem('div','panel-title',title),elem('div','panel-desc','Valeurs publiées au périmètre précisé'));
 header.append(lhs,elem('div','tag','RÉPARTITION'));x.append(header);
 const max=Math.max(1,...rows.map(y=>y.valeur));
 rows.forEach((o,i)=>{
  const r=elem('div','barrow'),track=elem('div','track'),fill=elem('div','fill');
  fill.style.width=Math.min(100,o.valeur/max*100)+'%';
  track.append(fill);
  append(r,elem('span','barrow-label',o.label),
   track,elem('span','barrow-value',num(o.valeur,o.unit||'')));
  x.append(r);
 });
 source(x,s,s?.niveau,rows[0].millesime);root.append(x);
}
function table(root,title,heads,rows,description,s){
 if(!Array.isArray(rows)||!rows.length)return;
 const x=elem('section','card'),head=elem('div','panel-head'),lhs=elem('div');
 lhs.append(elem('div','panel-title',title));
 if(description)lhs.append(elem('div','panel-desc',description));
 head.append(lhs,elem('div','tag','TABLEAU'));x.append(head);
 const wrap=elem('div','tablewrap'),t=elem('table');
 const th=elem('thead'),tr=elem('tr');
 heads.forEach(h=>tr.append(elem('th',null,h)));th.append(tr);t.append(th);
 const tb=elem('tbody');
 rows.forEach(data=>{
  const row=elem('tr');
  data.forEach(v=>row.append(elem('td',null,v??'')));tb.append(row);
 });
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
 adminComparison(root,'Situation démographique de la commune et de ses territoires');
 const all=available().filter(v=>v.id!=='focus'&&v.id!=='sources');
 if(all.length){
  const section=card('Analyses disponibles','Seules les rubriques alimentées par des valeurs exploitables sont accessibles.');
  const buttons=elem('div','grid3');
  all.forEach(v=>{const b=elem('button','newSearch',v.label);b.onclick=()=>pick(v.id);buttons.append(b)});
  section.append(buttons);root.append(section);
 }
}
function population(root){
 metrics(root,cat('population'));
 populationSummary(root);
 adminComparison(root);
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
 populationSummary(root);
 if(homes().length)chart(root,'Parc existant',homes().map(x=>({label:x.label,valeur:x.valeur,unit:'logements'})),state.housing?.source);
}
function commercial(root){
 metrics(root,[...cat('prix'),...cat('revenus')]);
 if(rents().length)root.append(elem('p','source','Les loyers publiés sont des estimations de logements types, non des prix de sortie du neuf.'));
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

/*
 * MENU HISTORIQUE — ordre fixe de la capture Terre de Données.
 * Ne pas masquer, renommer ou supprimer les onglets selon les réponses API :
 * seules les données au sein de la page sont conditionnelles.
 */
function globalData(root){
 const all=arr(state.analysis?.indicateurs).filter(good);
 metrics(root,all);
 adminComparison(root);
 if(ages().length)chart(root,'Répartition des âges',ages().map(x=>({label:x.libelle,valeur:x.valeur,unit:'habitants',millesime:x.millesime})),state.analysis?.demographie_detail?.source);
 if(homes().length)chart(root,'Composition du parc de logements',homes().map(x=>({label:x.label,valeur:x.valeur,unit:'logements'})),state.housing?.source);
 if(rents().length)loyers(root);
 if(sales().length)dvf(root);
 if(dpes().length)energie(root);
 if(zones().length)urbanisme(root);
 if(risks().length)risques(root);
}
function missingDataContext(root,tab){
 if(!state.loc)return;
 const c=card('Périmètre de l’analyse','Repères géographiques vérifiés pour l’adresse étudiée.');
 const rows=elem('div','statusGrid');
 const known=[
  ['Commune',state.loc.commune],
  ['Code INSEE',state.loc.code_insee],
  ['Adresse recherchée',state.loc.adresse]
 ];
 for(const [label,v] of known){
  if(!v)continue;
  const x=elem('div','statusItem');
  append(x,elem('small',null,label),elem('strong',null,v));
  rows.append(x);
 }
 if(rows.childElementCount)c.append(rows);
 c.append(elem('p','source','Les repères affichés correspondent à l’adresse vérifiée dans le référentiel administratif national.'));
 const references={
  familles:{name:'INSEE — Recensement de la population',url:'https://www.insee.fr/'},
  salaires:{name:'INSEE — Statistiques sur les salaires',url:'https://www.insee.fr/'},
  migrations:{name:'INSEE — Migrations résidentielles',url:'https://www.insee.fr/'},
  elections:{name:'Ministère de l’Intérieur — Résultats électoraux',url:'https://www.interieur.gouv.fr/'},
  equipements:{name:'INSEE — Base permanente des équipements',url:'https://www.insee.fr/'},
  social:{name:'Ministère chargé du Logement — Parc locatif social',url:'https://www.statistiques.developpement-durable.gouv.fr/'},
  sru:{name:'Ministère chargé du Logement — Inventaires SRU',url:'https://www.ecologie.gouv.fr/'},
  zonage:{name:'Ministère chargé du Logement — Zonage ABC',url:'https://www.ecologie.gouv.fr/'},
  batiments:{name:'BDNB — Base nationale des bâtiments',url:'https://bdnb.io/'},
  eau:{name:'Ministère de la Transition écologique — Services d’eau',url:'https://www.services.eaufrance.fr/'},
  chaleur:{name:'ADEME — Transition énergétique',url:'https://data.ademe.fr/'},
  artificialisation:{name:'Ministère chargé de l’Aménagement — Artificialisation',url:'https://artificialisation.developpement-durable.gouv.fr/'}
 };
 const reference=references[tab.id];
 if(reference){
  const link=elem('a','source','Consulter : '+reference.name);
  link.href=reference.url;link.target='_blank';link.rel='noopener noreferrer';c.append(link);
 }
 root.append(c);
}
const groups=[
 {name:'Programmation',items:[['programmation','▥','Programmation théorique'],['commercialisation','◈','Commercialisation']]},
 {name:'Données territoriales',items:[['toutes','▦','Toutes les données'],['focus','◉','Focus commune']]},
 {name:'Socio / Démo',items:[['population','♙','Population'],['familles','♧','Familles et ménages'],['emploi','◫','Emploi et activité'],['salaires','▤','Salaires nets'],['revenus','◇','Revenus disponibles'],['migrations','⇄','Migrations résidentielles'],['elections','▣','Élections'],['equipements','♧','Équipements et transports']]},
 {name:'Immo',items:[['logements','⌂','Logements'],['social','▥','Parc social'],['sru','▤','Loi SRU'],['zonage','◈','Zonage ABC'],['permis','▧','Permis de construire'],['prix','€','Prix (DVF)'],['loyers','◈','Loyers du parc privé'],['batiments','▦','Bâtiments et DPE']]},
 {name:'Environnement',items:[['eau','◉','Contrat eau potable'],['risques','⚠','Risques territoriaux'],['chaleur','☀','Îlots de chaleur'],['artificialisation','▧','Artificialisation']]},
 {name:'Compléments fonciers',items:[['urbanisme','◈','Urbanisme'],['finances','€','Finances locales'],['sources','▦','Provenance des données']]}
];

const tabDescriptions={"programmation":"Analyse résidentielle et programmation fondées sur les données disponibles.","commercialisation":"Prix et transactions du marché immobilier, loyers et revenus publiés.","toutes":"Ensemble des statistiques officiellement récupérées pour le territoire.","focus":"Localisation du terrain et caractéristiques administratives de la commune.","population":"Démographie, évolution et répartition par âge.","familles":"Structure et taille des ménages.","emploi":"Emplois locaux et activité des résidents.","salaires":"Salaires nets et catégories professionnelles.","revenus":"Revenus et niveaux de vie des ménages.","migrations":"Migrations et mobilités résidentielles.","elections":"Données électorales officielles.","equipements":"Équipements, services et infrastructures.","logements":"Composition et typologie du parc résidentiel.","social":"Logements locatifs sociaux.","sru":"Obligations réglementaires de logements sociaux.","zonage":"Classement réglementaire ABC du territoire.","permis":"Logements autorisés et commencés.","prix":"Transactions immobilières issues des bases foncières.","loyers":"Loyers d’annonces estimés et publiés.","batiments":"Bâtiments et diagnostics de performance énergétique.","eau":"Service et gestion de l’eau potable.","risques":"Risques naturels et technologiques recensés.","chaleur":"Confort thermique et îlots de chaleur.","artificialisation":"Occupation et consommation des sols.","urbanisme":"Zonage d’urbanisme au point de l’adresse.","finances":"Recettes, dépenses et indicateurs budgétaires.","sources":"Sources, millésimes et échelles géographiques des informations."};
const renderers={
 programmation,commercialisation:commercial,toutes:globalData,focus:fiche,
 population,familles:()=>{},emploi:r=>metrics(r,cat('emploi')),
 salaires:()=>{},revenus:r=>metrics(r,cat('revenus')),
 migrations:()=>{},elections:()=>{},equipements:()=>{},
 logements,social:()=>{},sru:()=>{},zonage:()=>{},
 permis:r=>metrics(r,cat('permis')),prix:dvf,loyers,
 batiments:energie,eau:()=>{},risques,chaleur:()=>{},artificialisation:()=>{},
 urbanisme,finances:r=>metrics(r,cat('finances')),sources:provenance
};
const tabs=groups.flatMap(g=>g.items.map(([id,symbol,label])=>({
 id,icon:symbol,label,group:g.name,render:renderers[id]||(()=>{})
})));
const available=()=>tabs.filter(t=>{
 switch(t.id){
  case 'programmation':return cat('population').length+cat('logements').length+cat('permis').length+cat('prix').length>0;
  case 'commercialisation':return cat('prix').length+cat('revenus').length+rents().length+sales().length>0;
  case 'toutes':return arr(state.analysis?.indicateurs).filter(good).length+homes().length+rents().length+sales().length+dpes().length+zones().length+risks().length>0;
  case 'focus':return !!state.loc;
  case 'population':return cat('population').length+ages().length+arr(state.analysis?.categories?.population_historique).length>0;
  case 'emploi':return cat('emploi').length>0;
  case 'revenus':return cat('revenus').length>0;
  case 'logements':return cat('logements').length+homes().length+rooms().length>0;
  case 'permis':return cat('permis').length>0;
  case 'prix':return cat('prix').length+sales().length>0;
  case 'loyers':return rents().length>0;
  case 'batiments':return dpes().length>0;
  case 'risques':return risks().length>0;
  case 'urbanisme':return zones().length>0;
  case 'finances':return cat('finances').length>0;
  case 'sources':return arr(state.analysis?.indicateurs).filter(good).length+homes().length+rents().length+sales().length+dpes().length+zones().length+risks().length>0;
  default:return false;
 }
});
let compact=false;
function buildNav(){
 const nav=$('nav');
 if(nav.children.length)return;
 for(const group of groups){
  nav.append(elem('div','nav-heading',group.name));
  for(const [id,icon,label] of group.items){
   const btn=elem('button','nav-button');btn.type='button';btn.dataset.id=id;
   btn.append(elem('span','symbol',icon),elem('span','name',label));
   btn.onclick=()=>pick(id);nav.append(btn);
  }
 }
}
function arrangePanels(root){
 const children=[...root.children];
 root.replaceChildren();
 let queue=[];
 const flush=()=>{
  if(!queue.length)return;
  const panel=elem('div','panel-grid');
  if(queue.length===1)panel.classList.add('single');
  queue.forEach(item=>panel.append(item));root.append(panel);
  queue=[];
 };
 for(const child of children){
  if(child.classList.contains('card')){
   queue.push(child);
   if(queue.length===2)flush();
  }else{
   flush();root.append(child);
  }
 }
 flush();
}
function realInsight(root){
 let line=null,sub=null;
 if(state.tab==='population'){
  const history=arr(state.analysis?.categories?.population_historique)
    .filter(x=>typeof x.annee==='number'&&typeof x.population==='number'&&x.population>0)
    .sort((a,b)=>a.annee-b.annee);
  if(history.length>=2){
   const a=history[0],b=history[history.length-1];
   if(b.annee>a.annee&&a.population>0){
    const delta=(b.population/a.population-1)*100;
    line='Population '+(delta>=0?'en hausse':'en baisse')+' de '+num(Math.abs(delta),'%')+' entre '+a.annee+' et '+b.annee+'.';
    sub='Calcul ATLAS sur la série de populations INSEE ; cette évolution ne suffit pas à établir seule le besoin en logements.';
   }
  }
 }else if(state.tab==='logements'){
  const main=homes().find(x=>x.key==='principales'&&typeof x.part==='number');
  if(main){line='Les résidences principales représentent '+num(main.part,'%')+' du parc décrit par le recensement.';
   sub='Cette part correspond au périmètre communal, pas nécessairement au quartier de l’adresse.'}
 }else if(state.tab==='loyers'&&rents().length){
  line='Le territoire dispose de '+rents().length+' catégorie(s) de loyers d’annonces estimés pour le dernier millésime.';
  sub='Les estimations par typologie ne sont pas des loyers contractuels ni un prix de marché pour une adresse précise.';
 }
 if(!line)return;
 const box=elem('section','insight'),inner=elem('div');
 inner.append(elem('div','insight-head','◈  Lecture pour le développement foncier'),
  elem('h3',null,line),elem('p',null,sub));
 box.append(inner,elem('small',null,'Analyse calculée à partir des données officielles affichées'));
 root.append(box);
}

function redraw(){
 buildNav();
 const selected=tabs.find(t=>t.id===state.tab)||tabs[0];state.tab=selected.id;
 $('title').textContent=selected.label;
 $('breadcrumb').textContent=selected.label;
 $('category').textContent=selected.group;
 $('subtitle').textContent=tabDescriptions[selected.id]||'Données territoriales vérifiées.';
 $('addressLine1').textContent=state.loc?.adresse||requested||'Adresse';
 $('addressLine2').textContent=[state.loc?.commune,state.loc?.code_insee].filter(Boolean).join(' · ')||'Étude territoriale';
 $('crumbCity').textContent=state.loc?.commune||'Territoire';
 $('locationPill').textContent=state.loc?.commune?'◉ '+state.loc.commune+' · '+state.loc.code_insee:'◉ Étude territoriale';
 for(const btn of $('nav').querySelectorAll('button')){
  const active=btn.dataset.id===selected.id;
  btn.classList.toggle('active',active);
  btn.setAttribute('aria-current',active?'page':'false');
 }
 const root=$('body');root.replaceChildren();selected.render(root);
 if(!root.children.length)missingDataContext(root,selected);
 arrangePanels(root);
 realInsight(root);
 // La grille, les marges et les cartes sont définies par les styles de la maquette.
 if(compact){
  const sections=[...root.children].filter(n=>n.classList.contains('card'));
  sections.slice(2).forEach(n=>n.hidden=true);
 }
 $('viewAll').classList.toggle('active',!compact);
 $('viewCompact').classList.toggle('active',compact);
}
function pick(id){
 if(!tabs.some(t=>t.id===id))return;
 state.tab=id;redraw();$('sidebar').classList.remove('open');
 window.scrollTo({top:0,behavior:'smooth'});
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
  (async()=>{state.admin=await get('/api/profil-administratif?code_insee='+encodeURIComponent(l.code_insee),18000);redraw()})(),
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
$('mobile').onclick=()=>$('sidebar').classList.toggle('open');
$('print').onclick=()=>window.print();
$('reset').onclick=()=>{state.tab='programmation';redraw();window.scrollTo({top:0,behavior:'smooth'})};
$('homeSearch').onclick=()=>location.assign('/');
$('viewAll').onclick=()=>{compact=false;redraw()};
$('viewCompact').onclick=()=>{compact=true;redraw()};
redraw();
load();
