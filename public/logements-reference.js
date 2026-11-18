'use strict';
(function(){
const NS='http://www.w3.org/2000/svg';
const fNum=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
const fPct=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1});
const elm=(tag,cls,value)=>{const a=document.createElement(tag);if(cls)a.className=cls;if(value!==undefined&&value!==null)a.textContent=String(value);return a};
const svg=(name,attrs={})=>{const a=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))a.setAttribute(k,String(v));return a};
const fmt=n=>typeof n==='number'&&Number.isFinite(n)?fNum.format(n):'—';
const pct=n=>typeof n==='number'&&Number.isFinite(n)?fPct.format(n)+' %':'—';
const val=(a,y=2023)=>typeof a?.[y]==='number'?a[y]:null;
const change=(a)=>typeof a?.variation==='number'?a.variation:null;
const get=(items,...names)=>items?.find?.(r=>names.some(n=>r?.label===n));
let comparisonMode='matrice';
function button(label,cls,click){
 const b=elm('button',cls,label);b.type='button';b.onclick=click;return b;
}
function title(root,t,subtitle){
 const h=elm('div','lg-section-header');h.append(elm('h2',null,t));
 if(subtitle)h.append(elm('p',null,subtitle));root.append(h);
}
function growth(n){
 if(typeof n!=='number'||!Number.isFinite(n))return null;
 const span=elm('span','lg-growth '+(n<0?'negative':'positive'),(n<0?'↓ ':'↑ ')+(n>=0?'+':'')+pct(n));
 return span;
}
function lineChart(root,points,color){
 const width=760,height=230,pad={l:48,r:24,t:23,b:35};
 const innerW=width-pad.l-pad.r,innerH=height-pad.t-pad.b;
 const values=points.map(x=>x.valeur);
 const max=Math.max(1,...values);
 const nice=(value)=>{
  const base=Math.pow(10,Math.floor(Math.log10(value||1))),n=value/base;
  return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*base;
 };
 const top=nice(max*1.12);
 const x=i=>pad.l+innerW*i/(Math.max(1,points.length-1)),y=v=>pad.t+innerH*(1-v/top);
 const chart=svg('svg',{viewBox:'0 0 '+width+' '+height,'aria-label':'Courbe historique des logements','role':'img',class:'lg-linechart'});
 for(let i=0;i<=4;i++){
  const t=top*i/4,yy=y(t);
  chart.append(svg('line',{x1:pad.l,y1:yy,x2:width-pad.r,y2:yy,stroke:'#e8ebf1','stroke-width':1,'stroke-dasharray':i===0?'':'2 3'}));
  const lab=svg('text',{x:pad.l-8,y:yy+4,'text-anchor':'end','font-size':10,fill:'#8d98a7'});
  lab.textContent=fmt(Math.round(t));chart.append(lab);
 }
 chart.append(svg('line',{x1:pad.l,y1:pad.t,x2:pad.l,y2:height-pad.b,stroke:'#b6bcc7','stroke-width':1}),
              svg('line',{x1:pad.l,y1:height-pad.b,x2:width-pad.r,y2:height-pad.b,stroke:'#b6bcc7','stroke-width':1}));
 const path=points.map((p,i)=>{
  if(!i)return 'M'+x(i).toFixed(2)+' '+y(p.valeur).toFixed(2);
  const prev=points[i-1],pp=points[Math.max(0,i-2)],next=points[Math.min(points.length-1,i+1)];
  const cp1x=x(i-1)+(x(i)-x(Math.max(0,i-2)))/6;
  const cp1y=y(prev.valeur)+(y(p.valeur)-y(pp.valeur))/6;
  const cp2x=x(i)-(x(i+1>=points.length?i:i+1)-x(i-1))/6;
  const cp2y=y(p.valeur)-(y(next.valeur)-y(prev.valeur))/6;
  return 'C'+[cp1x,cp1y,cp2x,cp2y,x(i),y(p.valeur)].map(q=>q.toFixed(2)).join(' ');
 }).join(' ');
 chart.append(svg('path',{d:path,fill:'none',stroke:color,'stroke-width':2.1,'stroke-linecap':'round','stroke-linejoin':'round'}));
 points.forEach((p,i)=>{
  const xx=x(i),yy=y(p.valeur);
  chart.append(svg('line',{x1:xx,x2:xx,y1:height-pad.b,y2:height-pad.b+4,stroke:'#b6bcc7'}));
  const date=svg('text',{x:xx,y:height-12,'text-anchor':'middle','font-size':10,fill:'#8791a0'});
  date.textContent=p.annee;chart.append(date);
  const circle=svg('circle',{cx:xx,cy:yy,r:3.3,fill:color,stroke:'#fff','stroke-width':1.2,tabindex:0});
  const tooltip=svg('title');tooltip.textContent=p.annee+' : '+fmt(p.valeur)+' logements';circle.append(tooltip);
  chart.append(circle);
  const number=svg('text',{x:xx,y:Math.max(12,yy-9),'text-anchor':'middle','font-size':9.5,fill:'#7c879b'});
  number.textContent=fmt(p.valeur);chart.append(number);
 });
 root.append(chart);
}
function graphCard(parent,label,points,color){
 const card=elm('article','lg-graph-card');
 const head=elm('div','lg-graph-head');
 head.append(elm('h3',null,label),elm('p',null,'% Variation 2017 → 2023'));
 const x=points.find(p=>p.annee===2017),last=points.find(p=>p.annee===2023);
 const delta=x?.valeur&&last?.valeur?(last.valeur/x.valeur-1)*100:null;
 const badge=growth(delta);if(badge)head.append(badge);
 card.append(head);lineChart(card,points,color);parent.append(card);
}
function getRows(t){return Array.isArray(t?.lignes)?t.lignes:[]}
function exportCsv(table,data){
 const quote=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
 const heads=['Indicateur','Commune effectif 2023','Commune part (%)','Commune évolution 2017–2023 (%)',
  'EPCI effectif 2023','EPCI part (%)','EPCI évolution 2017–2023 (%)','France part (%)'];
 const lines=[heads,...getRows(table).map(r=>[
  r.label,val(r.commune),r.commune?.part,change(r.commune),val(r.epci),r.epci?.part,change(r.epci),r.reference_france
 ])].map(row=>row.map(quote).join(';')).join('\r\n');
 const file=new Blob(['\ufeff'+lines],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(file),a=document.createElement('a');
 a.href=url;a.download='Atlas-Logements-'+table.id+'-'+(data.commune?.code||'commune')+'.csv';
 a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function areaBars(wrapper,items,label){
 wrapper.append(elm('div','lg-area-caption',label));
 for(const r of items){
  const bar=elm('div','lg-simple-row');
  const max=Math.max(1,...items.map(a=>a.valeur||0));
  const track=elm('div','lg-simple-track'),fill=elm('div','lg-simple-fill');
  fill.style.width=Math.max(0,(r.valeur/max)*100)+'%';
  track.append(fill);bar.append(elm('span',null,r.label),track,elm('strong',null,fmt(r.valeur)),elm('small',null,pct(r.part)));
  wrapper.append(bar);
 }
}
function comparativeValue(root,item,area,denominator){
 const data=item[area]||{},v=val(data),percentage=typeof data.part==='number'?data.part:(v!=null&&denominator>0?100*v/denominator:null);
 const container=elm('div','lg-value');
 const line=elm('div','lg-value-top');line.append(elm('strong',null,fmt(v)));
 const badge=growth(change(data));if(badge)line.append(badge);
 line.append(elm('span','lg-share',pct(percentage)));container.append(line);
 const track=elm('div','lg-progress-track'),progress=elm('div','lg-progress-fill '+(area==='epci'?'lg-epci':'lg-commune'));
 progress.style.width=Math.max(0,Math.min(100,percentage||0))+'%';
 track.append(progress);container.append(track);root.append(container);
}
function matrix(root,table,data){
 const layout=elm('div','lg-table-grid');
 const head=elm('div','lg-comparison-heading');
 head.append(elm('span',null,''));
 head.append(elm('div','lg-col-caption','🌐 '+data.epci.nom.toUpperCase()));
 head.append(elm('div','lg-col-caption','▣ COMMUNE · '+data.commune.nom));
 layout.append(head);
 const cDen=table.denominateur==='total'?data.commune.total:val(data.historique.principales?.commune.at(-1))||0;
 const eDen=table.denominateur==='total'?data.epci.total:val(data.historique.principales?.epci.at(-1))||0;
 for(const r of getRows(table)){
  const line=elm('div','lg-table-row');
  line.append(elm('div','lg-row-title',r.label));
  comparativeValue(line,r,'epci',eDen);
  comparativeValue(line,r,'commune',cDen);
  layout.append(line);
 }
 root.append(layout);
}
function compareChart(root,table,data){
 const plot=elm('div','lg-compare-chart');
 for(const r of getRows(table)){
  const line=elm('div','lg-compare-row'),c=r.commune?.part||0,e=r.epci?.part||0;
  line.append(elm('div','lg-compare-title',r.label));
  const bars=elm('div','lg-compare-bars');
  for(const [area,percentage,cls] of [['EPCI',e,'epci'],['Commune',c,'commune']]){
   const row=elm('div','lg-compare-track-row');row.append(elm('span','lg-compare-name',area));
   const track=elm('div','lg-compare-track'),fill=elm('div','lg-compare-fill '+cls);
   fill.style.width=Math.min(100,Math.max(0,percentage))+'%';
   track.append(fill);row.append(track,elm('b',null,pct(percentage)));bars.append(row);
  }
  line.append(bars);plot.append(line);
 }
 root.append(plot);
}
function referenceFrance(root,table){
 const rows=getRows(table),panel=elm('div','lg-france');
 panel.append(elm('div','lg-france-head','RÉFÉRENCE FRANCE — RP 2023    part de l’ensemble en %'));
 const grid=elm('div','lg-france-grid');
 rows.forEach(r=>{const cell=elm('div','lg-france-cell');
  cell.append(elm('span',null,r.label),elm('strong',null,pct(r.reference_france)));grid.append(cell)});
 panel.append(grid);root.append(panel);
}
function comparison(root,table,data){
 const block=elm('section','lg-comparison-card');
 const header=elm('div','lg-compare-head'),left=elm('div');
 left.append(elm('h3',null,table.titre),
   elm('p',null,'Comparaison entre les différentes échelles de territoire — Effectif, part (%) et évolution 2017–2023'));
 header.append(left);
 header.append(button('X','lg-export',()=>exportCsv(table,data)));
 block.append(header);
 if(comparisonMode==='matrice')matrix(block,table,data);
 else compareChart(block,table,data);
 referenceFrance(block,table);
 const foot=elm('div','lg-card-foot');
 const a=elm('a',null,'Sources : INSEE — RP 2023');a.href=data.source.url_commune;a.target='_blank';a.rel='noopener noreferrer';
 const b=elm('span',null,'Dynamique : 2017 → 2023 · EPCI / Commune');
 foot.append(a,b);block.append(foot);root.append(block);
}
function fallback(data,state){
 const c=state?.housing?.commune,e=state?.housing?.epci;
 if(!c)return null;
 const make=(key,txt,reference=null)=>({
  label:txt,commune:{2023:c.distribution?.find(r=>r.key===key)?.valeur??null,
   part:c.distribution?.find(r=>r.key===key)?.part??null},
  epci:{2023:e?.distribution?.find(r=>r.key===key)?.valeur??null,
   part:e?.distribution?.find(r=>r.key===key)?.part??null},reference_france:reference
 });
 const rows=[make('principales','Résidences principales',82.4),make('secondaires','Résidences secondaires et logements occasionnels',9.7),make('vacants','Logements vacants',7.8)]
  .filter(r=>typeof r.commune[2023]==='number'&&typeof r.epci[2023]==='number');
 if(!rows.length)return null;
 return {commune:{nom:c.nom||state.loc.commune,code:state.loc.code_insee,total:rows.reduce((s,r)=>s+r.commune[2023],0)},
 epci:{nom:state.admin?.epci?.nom||'Intercommunalité',code:state.admin?.epci?.code||'',total:rows.reduce((s,r)=>s+r.epci[2023],0)},
 source:{url_commune:'https://www.insee.fr/fr/statistiques/2011101?geo=COM-'+state.loc.code_insee,
 url_epci:'https://www.insee.fr/fr/statistiques/2011101'},
 historique:{},
 tableaux:[{id:'categorie',titre:'Logements par type de résidences',denominateur:'total',lignes:rows}]};
}
function render(root,state){
 root.replaceChildren();root.classList.add('lg-root');
 const data=state.logementsReference;
 const top=elm('div','lg-top-actions');
 const lab=elm('span',null,'VUE');top.append(lab);
 const b1=button('▦ Matrice','lg-mode'+(comparisonMode==='matrice'?' active':''),()=>{comparisonMode='matrice';render(root,state)});
 const b2=button('▥ Graphique','lg-mode'+(comparisonMode==='graphique'?' active':''),()=>{comparisonMode='graphique';render(root,state)});
 top.append(b1,b2);root.append(top);
 if(!data){
  const msg=elm('section','lg-loading');
  if(state.logementsError){
    msg.append(elm('strong',null,'Données INSEE momentanément indisponibles'),
      elm('p',null,state.logementsError));
    msg.append(button('Réessayer','lg-mode',()=>window.location.reload()));
  }else{
    msg.append(elm('strong',null,'Chargement du recensement INSEE 2023…'),
      elm('p',null,'Récupération des séries 1968–2023, des indicateurs 2017 et 2023, puis des références nationales.'));
  }
  root.append(msg);return true;
 }
 const hist=data.historique||{};
 for(const key of ['total','principales','secondaires','vacants']){
  const entry=hist[key];if(!entry?.commune?.length||!entry?.epci?.length)continue;
  title(root,(entry.titre||'Logements')+' — évolution séries longues','Recensements successifs — effectif et variation d’un millésime au suivant');
  const pair=elm('div','lg-history-pair');
  graphCard(pair,data.epci.nom,entry.epci,'#397ba5');
  graphCard(pair,data.commune.nom,entry.commune,'#25366f');
  root.append(pair);
 }
 for(const t of data.tableaux||[]){
  if(!getRows(t).length)continue;comparison(root,t,data);
 }
 const footer=elm('footer','lg-notes');
 const source=elm('div');source.append(elm('strong',null,'Source : '),document.createTextNode('INSEE — Recensement de la population 2023. Séries historiques 1968–2023. Références France au RP 2023.'));
 const other=elm('div','lg-source-links');
 for(const [label,url] of [['Commune',data.source.url_commune],['EPCI',data.source.url_epci],['France',data.source.url_france],['RP 2017',data.source.url_millesime_2017]]){
  if(!url)continue;const a=elm('a',null,label+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';other.append(a);
 }
 footer.append(source,other,
  elm('p',null,"Les effectifs issus du recensement peuvent présenter des écarts d'une unité entre sous-totaux et total, en raison des arrondis statistiques. Les évolutions ne sont affichées que lorsque les deux millésimes sont vérifiés."));
 root.append(footer);
 return true;
}
window.AtlasLogementsPage={render};
})();