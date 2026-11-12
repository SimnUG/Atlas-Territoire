'use strict';
const $=id=>document.getElementById(id);
const address=new URLSearchParams(location.search).get('adresse')||'';
const sectionGroups=[
{title:'Programmation',items:[['programmation','▥','Programmation théorique'],['commercialisation','◈','Commercialisation'],['toutes','▦','Toutes les données']]},
{title:'Socio / Démo',items:[['population','♙','Population'],['familles','♧','Familles et ménages'],['emploi','◫','Emploi et activité'],['salaires','▤','Salaires nets'],['revenus','◇','Revenus disponibles'],['migrations','⇄','Migrations résidentielles'],['elections','▣','Élections'],['equipements','♧','Équipements et transports']]},
{title:'Immo',items:[['logements','⌂','Logements'],['social','▥','Parc social'],['sru','▤','Loi SRU'],['zonage','◈','Zonage ABC'],['permis','▧','Permis de construire'],['prix','€','Prix immobiliers — DVF']]},
{title:'Énergie et territoire',items:[['dpe','◉','DPE et audits'],['batiments','▦','Bâtiments — BDNB'],['environnement','♧','Environnement'],['finances','€','Finances locales']]}
];
const meta={
programmation:{title:'Programmation théorique',head:'PROGRAMMATION',desc:'Lecture de la demande résidentielle et confrontation au parc, aux permis et aux ventes observées.',sources:['INSEE','DVF','Sitadel'],left:'Programmation au niveau commune',right:'Programmation opérationnelle',questions:['Quel est le profil des ménages locaux ?','Les logements autorisés couvrent-ils les besoins ?','Quelles typologies se vendent effectivement ?']},
commercialisation:{title:'Commercialisation',head:'PROGRAMMATION',desc:'Prix observés, activité transactionnelle et adéquation avec la capacité financière des ménages.',sources:['DVF','INSEE'],left:'Transactions par période',right:'Positionnement et solvabilité',questions:['Quel est le volume des mutations ?','Quel niveau de vie permet l’accession ?','Les références de vente sont-elles comparables au programme ?']},
toutes:{title:'Toutes les données',head:'EXPLORER',desc:'Tableau de disponibilité des jeux de données et de leurs origines officielles.',sources:['INSEE','DVF','Sitadel','ADEME','OFGL'],left:'Indicateurs par source',right:'Disponibilité des données',questions:['Quels organismes ont répondu ?','Quelle est la dernière année disponible ?','Quels indicateurs nécessitent un complément ?']},
population:{title:'Population',head:'SOCIO / DÉMO',desc:'Population municipale, évolution temporelle et poids démographique du marché local.',sources:['INSEE'],left:'Évolution de la population',right:'Structure démographique',questions:['La population progresse-t-elle ?','Quelles classes d’âge expliquent la demande ?','À quelle échelle ce chiffre est-il disponible ?']},
familles:{title:'Familles et ménages',head:'SOCIO / DÉMO',desc:'Composition et taille des ménages pour orienter la programmation de logements.',sources:['INSEE'],left:'Types de ménages',right:'Taille des ménages',questions:['Quelle part de ménages d’une personne ?','Combien de familles avec enfants ?','Quelle offre pour les ménages qui se forment ?']},
emploi:{title:'Emploi et activité',head:'SOCIO / DÉMO',desc:'Emploi résident, entreprises et dépendance au bassin d’emploi.',sources:['INSEE','Urssaf'],left:'Activité des résidents',right:'Emploi local',questions:['Le territoire est-il résidentiel ou actif ?','L’emploi local progresse-t-il ?','Quels profils professionnels dominent ?']},
salaires:{title:'Salaires nets',head:'SOCIO / DÉMO',desc:'Salaires et catégories socioprofessionnelles pour qualifier les capacités de financement.',sources:['INSEE','Urssaf'],left:'Distribution des salaires',right:'Salaires par CSP',questions:['Les ménages peuvent-ils acheter dans le neuf ?','Quelles différences par profession ?','Comment les salaires évoluent-ils ?']},
revenus:{title:'Revenus disponibles',head:'SOCIO / DÉMO',desc:'Niveau de vie médian et distribution des revenus des habitants.',sources:['INSEE'],left:'Niveau de vie des ménages',right:'Dispersion des revenus',questions:['Le revenu local soutient-il la demande ?','Quelle place pour l’accession abordable ?','Quel est le millésime exact du revenu ?']},
migrations:{title:'Migrations résidentielles',head:'SOCIO / DÉMO',desc:'Flux d’arrivée et de départ, origines des nouveaux habitants et renouvellement résidentiel.',sources:['INSEE'],left:'Origine des arrivants',right:'Mobilités résidentielles',questions:['D’où viennent les nouveaux ménages ?','Quelles tranches d’âge déménagent ?','La commune attire-t-elle de nouveaux actifs ?']},
elections:{title:'Élections',head:'SOCIO / DÉMO',desc:'Participation et résultats des scrutins officiels, replacés dans leur contexte temporel.',sources:['Ministère de l’Intérieur'],left:'Participation aux élections',right:'Résultats par scrutin',questions:['Quelle participation est observée ?','De quel scrutin parle-t-on ?','Quel est le périmètre des bureaux de vote ?']},
equipements:{title:'Équipements et transports',head:'SOCIO / DÉMO',desc:'Services de proximité, commerces, enseignement, santé et équipements du territoire.',sources:['INSEE','ANCT','Observatoire des territoires'],left:'Équipements par fonction',right:'Offre de services',questions:['Quels équipements répondent aux besoins familiaux ?','Quels services se situent à proximité ?','Quelles données sont communales et non à distance réelle ?']},
logements:{title:'Logements',head:'IMMO',desc:'Parc résidentiel, statuts d’occupation, vacance et répartition maisons / appartements.',sources:['INSEE'],left:'Composition du parc',right:'Statuts d’occupation',questions:['Le parc est-il plutôt individuel ou collectif ?','Quel est le poids de la vacance ?','Quelle part de résidences principales ?']},
social:{title:'Parc social',head:'IMMO',desc:'Parc locatif social, dynamique de l’offre et programmation locative.',sources:['SDES / RPLS','INSEE'],left:'Poids du parc social',right:'Typologie du logement social',questions:['Quel est le taux de logements sociaux ?','Quels segments semblent sous-représentés ?','Le périmètre est-il communal ou intercommunal ?']},
sru:{title:'Loi SRU',head:'IMMO',desc:'Obligations applicables à la commune et suivi des inventaires officiels.',sources:['Ministère de la Transition écologique'],left:'Inventaire SRU',right:'Objectifs et obligations',questions:['La commune est-elle soumise à l’article 55 ?','Quel inventaire et quelle période triennale ?','Quels programmes participent aux objectifs ?']},
zonage:{title:'Zonage ABC',head:'IMMO',desc:'Classement réglementaire et conséquences possibles sur les dispositifs de logement.',sources:['Ministère de la Transition écologique'],left:'Zonage réglementaire',right:'Dispositifs concernés',questions:['Quel zonage s’applique à la commune ?','Quel arrêté est en vigueur ?','Quelles conséquences sur la programmation ?']},
permis:{title:'Permis de construire',head:'IMMO',desc:'Flux de logements autorisés et commencés selon Sitadel et leur chronologie.',sources:['Sitadel / SDES'],left:'Logements autorisés',right:'Dynamique de construction',questions:['Combien de logements ont été autorisés ?','Quelle est la dernière année complète ?','Quelle part est commencée ?']},
prix:{title:'Prix immobiliers — DVF',head:'IMMO',desc:'Mutations enregistrées, prix de vente et références de marché existantes.',sources:['DVF / DGFiP'],left:'Prix observés au m²',right:'Volume des mutations',questions:['Quel est le prix médian des mutations comparables ?','Quelle est la profondeur du marché ?','Les ventes complexes sont-elles exclues ?']},
dpe:{title:'DPE et audits',head:'ÉNERGIE ET TERRITOIRE',desc:'Diagnostics énergétiques rattachés avec certitude à l’adresse recherchée.',sources:['ADEME','DPE — Audit'],left:'Étiquettes énergie',right:'Émissions de gaz à effet de serre',questions:['Des DPE correspondent-ils exactement à cette adresse ?','Quel est leur état de validité ?','La rénovation représente-t-elle un enjeu ?']},
batiments:{title:'Bâtiments — BDNB',head:'ÉNERGIE ET TERRITOIRE',desc:'Caractéristiques des bâtiments existants, composition technique et ancienneté.',sources:['BDNB'],left:'Caractéristiques du bâti',right:'Périodes de construction',questions:['Quel bâtiment correspond à l’adresse ?','Quelle est sa période de construction ?','Quelles informations sont mesurées ou estimées ?']},
environnement:{title:'Environnement',head:'ÉNERGIE ET TERRITOIRE',desc:'Artificialisation, consommation foncière et enjeux d’aménagement durable.',sources:['Ministère de la Transition écologique','Observatoire des territoires'],left:'Consommation d’espaces',right:'Occupation du sol',questions:['Le territoire consomme-t-il de nouveaux espaces ?','Quels enjeux de densification ?','Quelle période de référence ?']},
finances:{title:'Finances locales',head:'ÉNERGIE ET TERRITOIRE',desc:'Capacité d’investissement communale et lecture des budgets publics officiels.',sources:['DGCL — OFGL'],left:'Recettes et dépenses',right:'Épargne et investissement',questions:['Quelle est l’épargne disponible ?','Quel niveau d’investissement ?','Les budgets sont-ils comparables sur la même période ?']}
};
let current='programmation',locationData=null,data=null,loading=true,error=null,registry=null;
const nf=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1});
const e=(tag,cls,txt)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined&&txt!==null)el.textContent=String(txt);return el};
const fmt=(v,u='')=>typeof v==='number'&&Number.isFinite(v)?nf.format(v)+(u?' '+u:''):'—';
function sourceText(i){return (i.source?.nom||'Source non précisée')+' · '+(i.niveau||'Commune')+' · '+(i.millesime||'Millésime non communiqué')}
function add(parent,...children){parent.append(...children.filter(Boolean));return parent}
function card(title,desc=''){const x=e('article','card');add(x,e('h2','cardTitle',title),e('p','cardDesc',desc));return x}
function empty(title,txt){return add(e('div','empty'),e('strong',null,title),e('span',null,txt))}
function sourceFooter(parent,names){add(parent,e('div','source','Sources attendues : '+names.join(' • ')+'. Les données absentes ne sont pas reconstituées.'))}
function asIndicator(n){return (data?.indicateurs||[]).find(x=>x.nom===n&&typeof x.valeur==='number')}
function metricsForPage(id){
 const c=data?.categories||{};
 if(id==='population')return c.population||[];
 if(id==='revenus')return c.revenus||[];
 if(id==='emploi')return c.emploi||[];
 if(id==='logements')return c.logements||[];
 if(id==='finances')return c.finances||[];
 if(id==='prix')return c.prix||[];
 if(id==='permis')return c.permis||[];
 if(['commercialisation','programmation'].includes(id))return [...(c.population||[]),...(c.revenus||[]),...(c.prix||[]),...(c.permis||[])];
 if(id==='toutes')return data?.indicateurs||[];
 return [];
}
function renderNav(){
 const nav=$('nav');nav.replaceChildren();
 for(const group of sectionGroups){
  const title=e('div','navTitle',group.title);nav.append(title);
  for(const [id,symbol,label] of group.items){
   const b=e('button','navBtn'+(current===id?' active':''));b.type='button';b.dataset.section=id;
   add(b,e('span','glyph',symbol),e('span',null,label));b.onclick=()=>select(id);
   nav.append(b);
  }
 }
}
function metricTile(i){const x=e('article','card kpi');add(x,e('div','cardTitle',i.nom),e('div','metric',fmt(i.valeur,i.unite)),e('div','source',sourceText(i)));return x}
function leadMetrics(root,id){
 const list=metricsForPage(id).filter(i=>typeof i.valeur==='number');
 if(!list.length)return;
 const grid=e('div','grid4');list.slice(0,4).forEach(i=>grid.append(metricTile(i)));root.append(grid);
}
function standardPanels(root,id){
 const m=meta[id],grid=e('div','grid2 section');
 const left=card(m.left,'Analyse territoriale, source communale ou adresse vérifiée.');
 const right=card(m.right,'Comparaison des séries et ventilation de l’indicateur.');
 const values=metricsForPage(id).filter(x=>typeof x.valeur==='number');
 if(values.length){
  const rows=e('div');
  values.slice(0,6).forEach(i=>{
   const r=e('div','line');add(r,e('b',null,i.nom),e('span',null,fmt(i.valeur,i.unite)));rows.append(r);
  });
  left.append(rows);left.append(e('div','source',values.map(x=>sourceText(x)).join(' • ')));
 }else left.append(empty('Données indisponibles','Aucun chiffre communal vérifié n’a été reçu pour cet indicateur.'));
 right.append(empty('Graphique à alimenter','La ventilation requiert des observations par catégorie et une année de référence ; aucune proportion n’est inventée.'));
 grid.append(left,right);root.append(grid);
}
function methodPanel(root,id){
 const m=meta[id],box=card('Points de contrôle pour l’étude de marché','Éléments à interpréter après disponibilité des jeux officiels.');
 const lines=e('div');for(const question of m.questions){const x=e('div','line');add(x,e('b',null,question),e('span',null,'À documenter'));lines.append(x)}box.append(lines);sourceFooter(box,m.sources);box.classList.add('section');root.append(box);
}
function populationAges(root){
 const groups=data?.demographie_detail?.tranches_age||[];
 const c=card('Répartition de la population par tranche d’âge','Recensement INSEE : effectifs par classe d’âge, à l’échelle communale. Les classes ne sont pas utilisées pour inventer une programmation immobilière.');
 if(groups.length){
   const max=Math.max(1,...groups.map(g=>g.valeur));
   for(const g of groups){
    const row=e('div','barRow');
    const track=e('div','track');const fill=e('div','fill');fill.style.width=Math.max(2,g.valeur/max*100)+'%';track.append(fill);
    add(row,e('span',null,g.libelle),track,e('span','pct',fmt(g.valeur)),e('span','count',String(g.millesime)));
    c.append(row);
   }
   c.append(e('p','source','Valeurs du recensement de la population — INSEE, dernier millésime disponible dans les observations reçues. Les classes absentes ne sont pas extrapolées.'));
 }else c.append(empty('Structure par âge indisponible','Aucune distribution cohérente n’a été vérifiée dans les réponses de l’INSEE.'));
 c.classList.add('section');root.append(c);
}

function programming(root){
 const warn=e('div','alert','La programmation T1 à T5 doit être calculée sur des distributions réelles de ménages et confrontée aux permis et ventes. Sans ces données détaillées, une répartition chiffrée serait trompeuse.');root.append(warn);
 const grid=e('div','grid2');for(const [name,desc] of [['Programmation au niveau commune','La première lecture de programmation s’appuie sur les besoins résidentiels communaux.'],['Programmation opérationnelle','La programmation d’une opération exige les caractéristiques du terrain, son PLU et son marché.']]){
  const c=card(name,desc);
  const chip=e('span','chip',name.startsWith('Programmation au')?'Référence communale':'Programme à définir');c.prepend(chip);
  for(const t of ['T1','T2','T3','T4','T5+']){
   const bar=e('div','barRow');add(bar,e('span',null,'● '+t),e('div','track'),e('span','pct','—'),e('span','count','—'));c.append(bar);
  }
  c.append(e('p','source','Pas de répartition fictive. La base des types de ménages et des typologies doit être vérifiée.'));grid.append(c);
 }root.append(grid);
 const rec=card('La recommandation face aux marchés observés','Confronter le parc existant, les autorisations Sitadel et les mutations DVF.');
 const cols=e('div','grid3');
 for(const [k,text] of [['INSEE','Ménages, taille des foyers et parc de résidences principales'],['SITADEL','Logements autorisés et commencés, par millésime'],['DVF','Mutations et prix immobiliers observés']]){
  const x=e('div','statusItem');add(x,e('strong',null,k),e('small',null,text));cols.append(x);
 }
 rec.append(cols);const values=metricsForPage('programmation').filter(x=>typeof x.valeur==='number');if(values.length){const row=e('div','grid4 section');values.slice(0,4).forEach(x=>row.append(metricTile(x)));rec.append(row)}else rec.append(e('p','source','Les connecteurs n’ont pas renvoyé de statistiques exploitables sur ce territoire.'));
 rec.classList.add('section');root.append(rec);
 methodPanel(root,'programmation');
}
function commercial(root){
 leadMetrics(root,'commercialisation');standardPanels(root,'commercialisation');dvfTable(root);methodPanel(root,'commercialisation');
}
function dvfTable(root){
 const dvf=data?.dvf||{},cardEl=card('Transactions issues de DVF+','Valeurs foncières de mutations publiées ; ne pas les assimiler au prix du logement recherché.');
 const ts=dvf.transactions||[];
 if(ts.length){
  if(!dvf.exhaustif)cardEl.append(e('div','alert','Pagination partielle : aucune statistique communale exhaustive ne doit être déduite de ces lignes.'));
  const wrap=e('div','tablewrap'),table=e('table'),head=e('thead'),tr=e('tr');
  ['Date','Type déclaré','Montant','Surface bâtie','Ratio €/m²'].forEach(x=>tr.append(e('th',null,x)));head.append(tr);table.append(head);
  const body=e('tbody');for(const t of ts.slice(0,25)){
   const row=e('tr');
   [t.date||'—',t.type||'—',fmt(t.valeur,'€'),fmt(t.surface,'m²'),fmt(t.prix_m2,'€/m²')].forEach(v=>row.append(e('td',null,v)));
   body.append(row);
  }
  table.append(body);wrap.append(table);cardEl.append(wrap);
 }else cardEl.append(empty('Transactions non disponibles','L’API DVF+ ne fournit pas encore de transactions exploitables pour cette recherche.'));
 cardEl.append(e('div','source','Producteur : DGFiP — diffusion DVF+ Cerema. Une mutation peut regrouper plusieurs biens.'));cardEl.classList.add('section');root.append(cardEl);
}
function permits(root){
 leadMetrics(root,'permis');standardPanels(root,'permis');
 const sit=data?.sitadel;
 if(sit?.erreurs?.length){
  const err=card('Vérification de la source Sitadel','Pourquoi les logements autorisés ne sont-ils pas renseignés ?');
  err.append(e('div','alert neutral',sit.erreurs[0]));err.classList.add('section');root.append(err);
 }
 methodPanel(root,'permis');
}
function dpe(root){
 const xs=data?.dpe?.enregistrements||[];
 const grid=e('div','grid3');
 const c=metricTile({nom:'DPE associés à cette adresse',valeur:xs.length,unite:'enregistrements exacts',source:{nom:'ADEME'},niveau:'adresse',millesime:null});
 grid.append(c);
 const labels=new Map(),ges=new Map();
 for(const x of xs){const a=String(x.dpe||'').trim().toUpperCase(),b=String(x.ges||'').trim().toUpperCase();if(/^[A-G]$/.test(a))labels.set(a,(labels.get(a)||0)+1);if(/^[A-G]$/.test(b))ges.set(b,(ges.get(b)||0)+1)}
 for(const [title,map] of [['Étiquettes énergie observées',labels],['Étiquettes GES observées',ges]]){
  const item=card(title,'Répartition des diagnostics strictement appariés à l’adresse.');
  if(map.size){for(const [k,n] of [...map.entries()].sort()){
   const row=e('div','barRow');const track=e('div','track');const fill=e('div','fill'+(k==='F'||k==='G'?' featured':''));fill.style.width=(n/xs.length*100)+'%';track.append(fill);add(row,e('span',null,k),track,e('span','pct',fmt(n/xs.length*100,'%')),e('span','count',n+' DPE'));item.append(row)
  }}else item.append(empty('Pas de diagnostic exploitable','Aucun DPE exact dans les réponses récupérées.'));grid.append(item);
 }root.append(grid);
 const tableCard=card('Détail des diagnostics','Résultats ayant une correspondance d’adresse stricte.');
 if(xs.length){const t=e('table'),thead=e('thead'),row=e('tr');['Date','Énergie','GES','Surface','Identifiant DPE'].forEach(a=>row.append(e('th',null,a)));thead.append(row);t.append(thead);const tb=e('tbody');xs.forEach(x=>{const r=e('tr');[x.date||'—',x.dpe||'—',x.ges||'—',fmt(Number(x.surface),'m²'),x.numero||'—'].forEach(v=>r.append(e('td',null,v)));tb.append(r)});t.append(tb);const tableWrap=e('div','tablewrap');tableWrap.append(t);tableCard.append(tableWrap)}
 else tableCard.append(empty('Aucun rapprochement certain','Cela ne signifie pas qu’aucun DPE n’existe pour cette adresse.'));
 tableCard.append(e('p','source','Un DPE peut être ancien, incomplet ou ne pas concerner tout l’immeuble.'));tableCard.classList.add('section');root.append(tableCard);methodPanel(root,'dpe');
}
function allData(root){
 const indicators=data?.indicateurs||[];
 const c=card('Synthèse des indicateurs disponibles','Observations reçues et vérifiées, toutes rubriques confondues.');
 if(indicators.length){
  const grid=e('div','grid4');indicators.forEach(i=>{if(typeof i.valeur==='number')grid.append(metricTile(i))});c.append(grid);
 }else c.append(empty('Indicateurs absents','Les données peuvent être indisponibles ou leurs connecteurs encore en cours de validation.'));
 root.append(c);
 const overview=card('Provenance et couverture des sources','Catalogue limité aux 14 organismes autorisés. Référencement ≠ accès aux chiffres.');
 overview.classList.add('section');
 if(registry?.sources?.length){
  const grid=e('div','grid2');
  for(const s of registry.sources){
   const el=e('div','statusItem');const good=s.state==='connecteur';add(el,e('strong',null,s.nom),e('small',null,(good?'Connecteur installé':'Jeu référencé ou connexion à valider')+' · '+(s.scope||[]).join(', ')));grid.append(el);
  }overview.append(grid);
 }else overview.append(e('div','source','Chargement du catalogue officiel.'));
 root.append(overview);
 const issues=data?.erreurs||[];
 if(issues.length){const box=card('Sources temporairement indisponibles','Messages techniques transmis sans fabrication de valeur.');const rows=e('div');for(const err of issues.slice(0,12))rows.append(e('div','line',err));box.append(rows);box.classList.add('section');root.append(box)}
}
function draw(){
 const m=meta[current];renderNav();$('category').textContent=m.head;$('pageTitle').textContent=m.title;$('description').textContent=m.desc;$('crumbCategory').textContent=m.title;
 $('currentAddress').textContent=locationData?.adresse||address||'Adresse non renseignée';
 $('city').textContent=locationData?.commune||'Commune en cours de recherche';
 $('locationPill').textContent=locationData?.commune?locationData.commune+' · '+(locationData.code_insee||'—'):'Localisation à confirmer';
 const root=$('analysis');root.replaceChildren();
 if(loading){root.append(e('div','alert neutral','Consultation des sources officielles en cours… Les résultats apparaîtront dès que les organismes auront répondu.'))}
 if(error)root.append(e('div','alert','Certaines données n’ont pas pu être récupérées : '+error));
 if(current==='programmation')programming(root);
 else if(current==='commercialisation')commercial(root);
 else if(current==='dpe')dpe(root);
 else if(current==='toutes')allData(root);
 else if(current==='permis')permits(root);
 else if(current==='population'){leadMetrics(root,'population');populationAges(root);standardPanels(root,'population');methodPanel(root,'population')}
 else if(current==='prix'){leadMetrics(root,'prix');standardPanels(root,'prix');dvfTable(root);methodPanel(root,'prix')}
 else{leadMetrics(root,current);standardPanels(root,current);methodPanel(root,current)}
}
function select(id){if(!meta[id])return;current=id;draw();$('side').classList.remove('show');$('overlay').classList.remove('show');window.scrollTo(0,0)}
$('newSearch').onclick=()=>location.assign('/');
$('mobileNav').onclick=()=>{$('side').classList.add('show');$('overlay').classList.add('show')};
$('overlay').onclick=()=>{$('side').classList.remove('show');$('overlay').classList.remove('show')};
$('copy').onclick=()=>navigator.clipboard?.writeText(location.href).catch(()=>{});
$('print').onclick=()=>window.print();
$('preset').onchange=()=>draw();
async function request(url,timeout=60000){
 const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
 try{const response=await fetch(url,{signal:c.signal});const value=await response.json();if(!response.ok)throw Error(value.erreur||'HTTP '+response.status);return value}
 finally{clearTimeout(t)}
}
async function load(){
 if(!address){loading=false;error='L’adresse est absente. Revenez à la recherche.';draw();return}
 try{
  const r=await request('/api/analyse?adresse='+encodeURIComponent(address),14000);
  locationData=r.localisation;draw();
  const l=r.localisation;
  if(!l?.code_insee)throw Error('Commune non identifiée');
  const q=new URLSearchParams({code_insee:l.code_insee,adresse:l.adresse||address,code_postal:l.code_postal||'',ban_id:l.ban_id||''});
  data=await request('/api/indicateurs?'+q,95000);
 }catch(err){error=err.name==='AbortError'?'Temps de réponse des sources dépassé':err.message}
 loading=false;draw();
}
async function loadRegistry(){try{registry=await request('/api/catalogue',10000);if(current==='toutes')draw()}catch(_){}}
draw();load();loadRegistry();
