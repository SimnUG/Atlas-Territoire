'use strict';
/*
 * Salaires nets — reproduction des deux captures fournies (ordre et grille).
 * Interface indépendante de Population, Familles et Emploi.
 * Les observations horaires INSEE 2022 sont converties en équivalent
 * mensuel conventionnel de 151,67 h ; ce n'est pas l'indicateur EQTP
 * directement calculé par l'INSEE depuis le millésime 2023.
 */
(function(){
 const GROUPS=[
  {id:'moyen',title:'Salaire net mensuel moyen (EQTP)',
   subtitle:'Secteur privé et entreprises publiques — équivalent temps plein, 2022',
   labels:['Salaire net mensuel moyen']},
  {id:'csp',title:'Salaire net mensuel moyen par CSP',
   subtitle:'En € nets / mois — équivalent temps plein, 2022',
   labels:['Cadres, professions intellectuelles sup.','Professions intermédiaires','Employés','Ouvriers']},
  {id:'age',title:'Salaire net mensuel moyen par tranche d’âge',
   subtitle:'En € nets / mois — équivalent temps plein, 2022',
   labels:['18-25 ans','26-50 ans','Plus de 50 ans']}
 ];
 const money=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
 const percent=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1});
 const E=(tag,cl,value)=>{
  const el=document.createElement(tag);
  if(cl)el.className=cl;
  if(value!==undefined && value!==null)el.textContent=String(value);
  return el;
 };
 const good=n=>typeof n==='number'&&Number.isFinite(n);
 const euro=n=>good(n)?money.format(n)+' €':'—';
 const variation=n=>good(n)?(n>0?'+':'')+percent.format(n)+' %':'—';
 const place=(s,k)=>{
  const x=k==='commune'?(s.loc?.commune||s.admin?.commune?.nom):
   k==='epci'?s.admin?.epci?.nom:s.admin?.departement?.nom;
  return typeof x==='string'&&x.trim()?x.trim():({commune:'Commune',epci:'Intercommunalité',departement:'Département'}[k]);
 };
 let mode='matrice';
 function controls(redraw){
  const top=E('div','atlas-pop-viewstrip'),right=E('div','atlas-pop-viewcontrols');
  right.append(E('span','atlas-pop-view-label','VUE'));
  for(const [key,symbol,label] of [['matrice','▦','Matrice'],['graphique','▥','Graphique']]){
   const button=E('button','atlas-pop-viewbutton'+(mode===key?' is-active':''),symbol+'  '+label);
   button.type='button';
   button.setAttribute('aria-pressed',String(mode===key));
   button.addEventListener('click',()=>{
    if(mode===key)return;
    mode=key;redraw();
   });
   right.append(button);
  }
  top.append(right);
  return top;
 }
 function heading(state){
  const row=E('div','atlas-salaire-header');
  row.append(E('div','atlas-salaire-empty'));
  for(const key of ['departement','epci','commune']){
   const x=E('div','atlas-salaire-heading atlas-salaire-heading-'+key);
   const icon=key==='commune'?'▥':key==='epci'?'♟':'◉';
   const short=key==='departement'?'DÉPARTEMENT':key==='epci'?'EPCI':'COMMUNE';
   x.append(E('span','atlas-salaire-heading-icon',icon));
   const labels=E('div','atlas-salaire-heading-labels');
   labels.append(E('strong',null,short),E('small',null,place(state,key)));
   x.append(labels);row.append(x);
  }
  return row;
 }
 function statistic(observation){
  const item=E('div','atlas-salaire-observation');
  const n=observation?.value;
  item.append(E('strong','atlas-salaire-figure',euro(n)));
  const delta=observation?.change;
  const cls='atlas-salaire-trend'+(good(delta)?(delta>=0?' is-up':' is-down'):'');
  item.append(E('span',cls,variation(delta)));
  return item;
 }
 function screenshotTable(group,state){
  const block=E('section','atlas-salaire-panel');
  block.dataset.salarySection=group.id;
  const title=E('div','atlas-salaire-titlebar'),left=E('div');
  left.append(E('h2','atlas-salaire-title',group.title),
   E('p','atlas-salaire-desc',group.subtitle));
  title.append(left);
  title.append(E('div','atlas-salaire-source','Source : INSEE — Base Tous salariés 2022'));
  block.append(title);
  const scroller=E('div','atlas-salaire-table-scroll');
  const matrix=E('div','atlas-salaire-table'+(mode==='graphique'?' atlas-salaire-table-graphic':''));
  matrix.append(heading(state));
  group.labels.forEach((label,i)=>{
   const row=E('div','atlas-salaire-row');
   row.append(E('div','atlas-salaire-rowlabel',label));
   const data=state?.salariesData?.sections?.[group.id]||{};
   for(const key of ['departement','epci','commune'])
    row.append(statistic(data?.[key]?.rows?.[i]||null));
   matrix.append(row);
  });
  scroller.append(matrix);block.append(scroller);
  const foot=E('div','atlas-salaire-foot');
  foot.append(E('strong',null,'Dynamique'),E('span',null,'2022/2016'));
  block.append(foot);
  return block;
 }
 function explanation(){
  const foot=E('footer','atlas-pop-methodology atlas-salaire-methodology');
  foot.append(E('span','atlas-pop-info-icon','ⓘ'));
  const details=E('div');
  details.append(E('p',null,
   'Source : INSEE — Base Tous salariés 2022 (fichier salariés au lieu de résidence, secteur privé et entreprises publiques, hors agriculture). Le salaire mensuel affiché est obtenu à partir du salaire net horaire moyen en appliquant 151,67 heures par mois : il s’agit d’une conversion conventionnelle, non de l’indicateur mensuel EQTP directement publié à partir de 2023.'));
  details.append(E('p',null,
   'La dynamique 2022/2016 est calculée uniquement lorsque les deux valeurs historiques comparables sont disponibles ; les données soumises au secret statistique ne sont jamais reconstituées. Les résultats communaux et intercommunaux sont indicatifs et ne sont pas expertisés au même niveau que les chiffres départementaux.'));
  details.append(E('p',null,'Licence : INSEE — Licence Ouverte 2.0 (Base Tous salariés, millésime 2022).'));
  foot.append(details);return foot;
 }
 function render(root,state){
  if(!root)return false;
  root.replaceChildren();
  const redraw=()=>render(root,state);
  // Référence méthodologique, comme la ligne rose des captures.
  root.append(E('div','atlas-salaire-licence','INSEE — Licence Ouverte 2.0 (base des salaires 2022)'));
  root.append(controls(redraw));
  GROUPS.forEach(x=>root.append(screenshotTable(x,state)));
  root.append(explanation());
  return true;
 }
 window.AtlasSalariesPage={render,sections:GROUPS.map(x=>x.id)};
})();