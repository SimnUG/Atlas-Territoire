'use strict';
/*
 * Revenus disponibles : les quatre captures approuvées, dans leur ordre.
 * La représentation ne dépend pas de la disponibilité de FiLoSoFi.
 * Seules des données INSEE sourcées, ou des simulations financières
 * explicitement calculées sur ces données, peuvent occuper les cellules.
 */
(function(){
const PROF=[
 {key:'p1',label:'1 Pers',long:'1 Pers',uc:1},
 {key:'p2',label:'2 Pers',long:'2 Pers',uc:1.5},
 {key:'p3',label:'3 Pers',long:'3 Pers',uc:1.8},
 {key:'p4',label:'4 Pers',long:'4 Pers',uc:2.1},
 {key:'p5',label:'5 Pers ou plus',long:'5 Pers ou plus',uc:2.4},
 {key:'couples',label:'Couples',long:'Couples',uc:null},
 {key:'retraites',label:'Retraités',long:'Retraités',uc:null}
];
const DEC=['D3','D4','Médiane','D6','D7','D8','D9'];
const MONTHS=300,RATE=0.035,DEBT=0.33,APPORT=0;
const EUR=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
const ONE=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1,minimumFractionDigits:1});
const E=(tag,cls,v)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(v!==undefined&&v!==null)el.textContent=String(v);
 return el;
};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const formatEuro=n=>finite(n)?EUR.format(Math.round(n))+' €':'—';
const formatPc=n=>finite(n)?ONE.format(n)+' %':'—';
const datum=(s,key,decile)=>s?.revenusData?.profiles?.[key]?.deciles?.[decile]||null;
const named=(s,key)=>s?.revenusData?.profiles?.[key]||null;
const avgRevenue=(s,key,decile)=>datum(s,key,decile)?.monthly??null;
const mortgage=(income)=>{
 if(!finite(income)||income<0)return null;
 const monthly=income*DEBT;
 const rate=RATE/12,annuity=rate/(1-Math.pow(1+rate,-MONTHS));
 return {monthly:Math.round(monthly),capital:Math.round(monthly/annuity+APPORT)};
};
let mode='profil',profile='p2',decile='Médiane',chartMode='matrice',moreMethod=false;
const elBtn=(label,active,action,extra='')=>{
 const btn=E('button','atlas-rev-choice'+(active?' is-selected':'')+(extra?' '+extra:''),label);
 btn.type='button';btn.setAttribute('aria-pressed',String(active));btn.addEventListener('click',action);
 return btn;
};
function info(state){
 const box=E('section','atlas-rev-context');
 const left=E('div');
 left.append(E('h2',null,'FiLoSoFi · Revenus disponibles'),
  E('p',null,"Chaque ligne relie un niveau de revenu à la mensualité maximale et au capital empruntable correspondants. Les revenus sont ceux publiés par l'INSEE ; seules les hypothèses de financement sont modifiables."));
 const right=E('div','atlas-rev-context-right');
 right.append(E('p',null,'Commune : '+(state?.loc?.commune||state?.admin?.commune?.nom||'—')),
  E('p',null,'Source : FiLoSoFi INSEE 2021'),
  E('p',null,'Hypothèses de financement : 25 ans · 3,5 % assurance comprise · endettement max 33 % · apport 0 €'));
 box.append(left,right);
 return box;
}
function filters(state,redraw){
 const selector=E('div','atlas-rev-selector');
 selector.append(E('span','atlas-rev-small-label','MODE DE LECTURE'));
 selector.append(elBtn('♧  Par profil de ménage',mode==='profil',()=>{mode='profil';redraw()}));
 selector.append(elBtn('▥  Par décile',mode==='decile',()=>{mode='decile';redraw()}));
 const filter=E('div','atlas-rev-selector atlas-rev-subselector');
 filter.append(E('span','atlas-rev-small-label',mode==='profil'?'SÉLECTION DU PROFIL DE MÉNAGE':'SÉLECTION DU DÉCILE'));
 if(mode==='profil'){
  for(const p of PROF)filter.append(elBtn(p.label,profile===p.key,()=>{profile=p.key;redraw()}));
 }else{
  for(const d of DEC)filter.append(elBtn(d,decile===d,()=>{decile=d;redraw()}));
 }
 return [selector,filter];
}
function heading(mode){
 const tr=E('div','atlas-rev-headrow');
 tr.append(E('span',null,mode==='profil'?'Décile':'Profil de ménage'),
  E('span',null,'Revenu disponible mensuel'),
  E('span',null,'Mensualité max'),
  E('span',null,'Capital empruntable'));
 return tr;
}
function incomeRow({title,subtitle,amount,active,maxValue}){
 const el=E('div','atlas-rev-income-row'+(active?' highlighted':''));
 const intro=E('div','atlas-rev-income-label');
 intro.append(E('strong',null,title));
 if(subtitle)intro.append(E('small',null,subtitle));
 const visual=E('div','atlas-rev-income-visual'),track=E('div','atlas-rev-income-track'),fill=E('div','atlas-rev-income-fill');
 fill.style.width=finite(amount)&&maxValue>0?Math.min(100,Math.max(0,amount/maxValue*100))+'%':'0%';
 track.append(fill);
 visual.append(track,E('strong','atlas-rev-amount',formatEuro(amount)));
 el.append(intro,visual);
 const finance=mortgage(amount);
 el.append(E('strong','atlas-rev-amount',formatEuro(finance?.monthly)),
  E('strong','atlas-rev-amount atlas-rev-capital',formatEuro(finance?.capital)));
 return el;
}
function financeBox(){
 const card=E('section','atlas-rev-finance');
 const top=E('div','atlas-rev-panel-head');
 top.append(E('h3',null,'Conditions de financement'),E('span','atlas-rev-tag','Simulation'));
 card.append(top);
 const grid=E('div','atlas-rev-finance-grid');
 const items=[
  ['DURÉE','25','ans','soit 300 mensualités'],
  ['TAUX ASS. COMPRISE','3,5','%','taux annuel, mensualisé'],
  ['ENDETTEMENT MAX','33','%','capacité maximale de remboursement'],
  ['APPORT','0','€','ajouté à la capacité d’achat']
 ];
 for(const [key,num,unit,subtitle] of items){
  const c=E('div','atlas-rev-finance-tile');
  c.append(E('span','atlas-rev-tile-head',key));
  const value=E('div','atlas-rev-tile-value');
  value.append(E('strong',null,num),E('span',null,unit));
  c.append(value,E('span','atlas-rev-tile-sub',subtitle));grid.append(c);
 }
 card.append(grid);
 return card;
}
function mainTable(state){
 const card=E('section','atlas-rev-main-card');
 const header=E('div','atlas-rev-panel-head');
 const a=E('div');
 a.append(E('h3',null,'Revenus disponibles et capacité d’emprunt'));
 a.append(E('p',null,mode==='profil'?
  'Chaque ligne est un décile du profil sélectionné : revenu disponible mensuel du ménage, mensualité maximale et capital empruntable.':
  'Décile sélectionné : chaque ligne compare un profil de ménage, son coefficient d’unités de consommation, sa population et ce qu’il permet d’emprunter.'));
 header.append(a,E('span','atlas-rev-tag',mode==='profil'?'Vue par profil de ménage':'Vue par décile'));
 card.append(header);
 if(mode==='profil'){
  const p=PROF.find(x=>x.key===profile),v=named(state,profile);
  const cap=E('p','atlas-rev-description');
  cap.append(E('strong',null,'Profil : '+(v?.description||p?.long||'—')));
  cap.append(E('span',null,' · Population : '+(finite(v?.households)?EUR.format(v.households):'—')));
  cap.append(E('strong',null,' / Décile (profondeur de marché) : '+(v?.marketDepth??'—')));
  card.append(cap);
  card.append(heading(mode));
  const monthly=DEC.map(d=>avgRevenue(state,profile,d)).filter(finite);
  const max=Math.max(1,...monthly);
  for(const d of DEC)card.append(incomeRow({
   title:d,amount:avgRevenue(state,profile,d),active:d==='Médiane',maxValue:max
  }));
 }else{
  const cap=E('p','atlas-rev-description');
  cap.append(E('strong',null,'Décile sélectionné : '+decile));
  cap.append(E('span',null,' · Comparaison des profils à hypothèses de financement constantes'));
  card.append(cap);card.append(heading(mode));
  const max=Math.max(1,...PROF.map(p=>avgRevenue(state,p.key,decile)).filter(finite));
  for(const p of PROF){
   const v=named(state,p.key),uc=finite(v?.uc)?v.uc:p.uc;
   const population=finite(v?.households)?EUR.format(v.households):'—';
   const depth=finite(v?.marketDepth)?EUR.format(v.marketDepth):'—';
   card.append(incomeRow({title:p.long,
    subtitle:'Coefficient UC : '+(finite(uc)?ONE.format(uc):'—')+' · Pop : '+population+' / Prof. de marché : '+depth,
    amount:avgRevenue(state,p.key,decile),active:false,maxValue:max
   }));
  }
 }
 return card;
}
const compositionNames=[
 ['activite','Revenus d’activité','#df0076'],
 ['pensions','Pensions, retraites et rentes','#df0076'],
 ['patrimoine','Patrimoine et autres revenus','#df0076'],
 ['prestations','Prestations sociales','#df0076'],
 ['impots','Impôts','#ed6948']
];
function fixedSummary(state,redraw){
 const layout=E('div','atlas-rev-summary-row');
 const record=named(state,profile)?.composition||state?.revenusData?.composition||{};
 const big=E('section','atlas-rev-summary-card atlas-rev-composition');
 const head=E('div','atlas-rev-panel-head');
 const title=E('div');title.append(E('h3',null,'Composition du revenu disponible'),
  E('p',null,(PROF.find(x=>x.key===profile)?.long||'Ménages')+' · '+(state?.loc?.commune||'Territoire')));
 head.append(title,E('span','atlas-rev-tag','Répartition en %'));
 big.append(head);
 for(const [key,label,color] of compositionNames){
  const val=record?.[key],row=E('div','atlas-rev-composition-row');
  row.append(E('span',null,label));
  const track=E('div','atlas-rev-mini-track'),fill=E('div','atlas-rev-mini-fill');
  fill.style.width=finite(val)?Math.min(100,Math.abs(val))+'%':'0%';
  fill.style.background=color;track.append(fill);
  row.append(track,E('strong',null,finite(val)?(val<0?'-':'')+formatPc(Math.abs(val)):'—'));big.append(row);
 }
 big.append(E('small','atlas-rev-fineprint',
  'Somme supérieure à 100 % : les parts se lisent avant impôts, qui sont retranchés (part négative).'));
 layout.append(big);
 const split=[
  {title:'Détail des revenus d’activité',values:[['salaires','Salaires et traitements'],['chomage','Indemnités chômage'],['nonSalaries','Activités non salariées']]},
  {title:'Détail des prestations sociales',values:[['familles','Prestations familiales'],['minima','Minima sociaux'],['logement','Prestations logement']]}
 ];
 for(const group of split){
  const box=E('section','atlas-rev-summary-card atlas-rev-details');
  box.append(E('h3',null,group.title));
  for(const [code,label] of group.values){
   const r=E('div','atlas-rev-detail-line');
   r.append(E('span',null,label),E('strong',null,formatPc(record[code])));
   box.append(r);
  }
  layout.append(box);
 }
 const method=E('section','atlas-rev-summary-card atlas-rev-method-short');
 method.append(E('h3',null,'Lecture et méthode'));
 const link=E('button','atlas-rev-method-link',moreMethod?'Masquer la fiche':'Ouvrir la fiche');
 link.type='button';link.addEventListener('click',()=>{moreMethod=!moreMethod;redraw()});
 method.append(link);
 layout.append(method);
 if(moreMethod){
  const extra=E('div','atlas-rev-method-extra');
  extra.textContent='Les données FiLoSoFi 2021 correspondent au revenu disponible et au niveau de vie des ménages fiscaux. Les montants par profil sont des niveaux de vie par unité de consommation, convertis en revenu mensuel conventionnel. Les mensualités et capitaux d’emprunt sont des simulations, pas des accords bancaires.';
  layout.append(extra);
 }
 return layout;
}
function median(state){
 const wrapper=E('div','atlas-rev-median-wrap');
 const control=E('div','atlas-pop-viewstrip atlas-rev-median-view');
 const options=E('div','atlas-pop-viewcontrols');
 options.append(E('span','atlas-pop-view-label','VUE'));
 for(const [k,title] of [['matrice','▦ Matrice'],['graphique','▥ Graphique']]){
  const btn=E('button','atlas-pop-viewbutton'+(chartMode===k?' is-active':''),title);
  btn.type='button';btn.addEventListener('click',()=>{
   if(chartMode===k)return;chartMode=k;render(wrapper.parentNode,state);
  });
  options.append(btn);
 }
 control.append(options);wrapper.append(control);
 const box=E('section','atlas-rev-median-card'),head=E('div','atlas-rev-panel-head');
 const left=E('div');
 left.append(E('h3',null,'Revenu disponible médian des ménages'),
  E('p',null,'Tous ménages confondus — niveau de vie médian, € par an et par mois'));
 head.append(left,E('small',null,'Source : INSEE — FiLoSoFi 2021'));
 box.append(head);
 const city=E('div','atlas-rev-median-city');
 city.append(E('strong',null,'▥  COMMUNE'),E('small',null,state?.loc?.commune||'—'));
 box.append(city);
 const v=state?.revenusData?.median||{};
 if(chartMode==='matrice'){
  for(const [label,value] of [['Revenu disponible médian mensuel',v.monthly],
   ['Revenu disponible médian annuel',v.annual]]){
   const r=E('div','atlas-rev-median-row');
   r.append(E('span',null,label),E('strong',null,finite(value)?EUR.format(value):'—'));
   box.append(r);
  }
 }else{
  const max=Math.max(1,v.annual||0,v.monthly||0);
  for(const [label,value] of [['Mensuel',v.monthly],['Annuel',v.annual]]){
   const line=E('div','atlas-rev-median-bars');
   line.append(E('span',null,label));
   const track=E('div','atlas-rev-income-track'),fill=E('div','atlas-rev-income-fill');
   fill.style.width=finite(value)?Math.min(100,Math.max(0,value/max*100))+'%':'0%';
   track.append(fill);
   line.append(track,E('strong',null,formatEuro(value)));box.append(line);
  }
 }
 wrapper.append(box);return wrapper;
}
function footnote(state){
 const node=E('footer','atlas-pop-methodology atlas-rev-footnote');
 node.append(E('span','atlas-pop-info-icon','ⓘ'));
 const content=E('div');
 content.append(E('p',null,
  'Source : INSEE – DGFiP – Cnaf – Cnav – CCMSA, FiLoSoFi 2021. Fichiers localisés : structure et distribution des revenus disponibles par taille et type de ménage (déciles exprimés en niveau de vie / UC), et fichier principal de revenu médian. Secret statistique respecté.'));
 content.append(E('p',null,
  'Capacité d’emprunt : simulation indicative à 25 ans, taux annuel 3,5 % assurance comprise, endettement 33 %, apport 0 €. Les coefficients d’UC sont conventionnels ; les compositions et revenus réellement publiés prévalent. FiLoSoFi 2 (2023) ne se compare pas directement à FiLoSoFi 2021.'));
 content.append(E('p',null,'Licence : INSEE — Licence Ouverte 2.0.'));
 node.append(content);return node;
}
function render(root,state){
 if(!root)return false;
 root.replaceChildren();
 const rerender=()=>render(root,state);
 root.append(E('div','atlas-rev-license','INSEE — Licence Ouverte 2.0 (page du jeu)'));
 root.append(E('div','atlas-rev-heading-note','ⓘ  Changement méthodologique'));
 root.append(info(state));
 const sets=filters(state,rerender);root.append(...sets);
 const main=E('div','atlas-rev-body');
 main.append(mainTable(state),financeBox());
 root.append(main,fixedSummary(state,rerender),median(state),footnote(state));
 return true;
}
window.AtlasRevenusPage={render};
})();