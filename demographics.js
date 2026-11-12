'use strict';
/*
 * Détails démographiques INSEE : seules les tranches disjointes connues
 * sont exploitées. Les observations sont rejetées si l'année, le sexe,
 * le code géographique ou les regroupements ne sont pas compatibles.
 */
const AGE_GROUPS=[
 ['Y0T14','0–14 ans'],['Y15T29','15–29 ans'],['Y30T44','30–44 ans'],
 ['Y45T59','45–59 ans'],['Y60T74','60–74 ans'],['Y75T89','75–89 ans']
];
function get(o,k){const v=o?.dimensions?.[k];return typeof v==='object'?v?.value??v?.id??null:v??null}
function numeric(o){
 for(const [k,val] of Object.entries(o?.measures||{})){
  if(!/OBS_VALUE|VALUE|MESURE/i.test(k))continue;
  const input=typeof val==='object'?val?.value:val;
  if(input===null||input===undefined||input==='')continue;
  const v=Number(input);
  if(Number.isFinite(v)&&v>=0)return v;
 }
 return null;
}
function year(o){const n=Number(get(o,'TIME_PERIOD'));return n>=2000&&n<=2030?n:null}
function isGeo(o,code){const g=String(get(o,'GEO')||'');return g===code||g.endsWith('-'+code)}
async function demographics({melodi,asObservations,code}){
 const errors=[];
 try{
  const data=await melodi('DS_RP_POPULATION_PRINC',code,{RP_MEASURE:'POP'});
  const records=asObservations(data).filter(o=>isGeo(o,code)&&year(o)!==null&&numeric(o)!==null&&get(o,'RP_MEASURE')==='POP');
  const years=[...new Set(records.map(year))].sort((a,b)=>b-a);
  const groups=[];
  for(const y of years){
   const arr=[];
   for(const [key,label] of AGE_GROUPS){
    const matches=records.filter(o=>year(o)===y&&get(o,'AGE')===key);
    const totals=matches.filter(o=>['T','_T','TOTAL'].includes(String(get(o,'SEX')||'').toUpperCase()));
    let n=null;
    if(totals.length===1)n=numeric(totals[0]);
    else if(totals.length===0){
      const males=matches.filter(o=>get(o,'SEX')==='M'),females=matches.filter(o=>get(o,'SEX')==='F');
      if(males.length===1&&females.length===1)n=numeric(males[0])+numeric(females[0]);
    }
    if(n!==null&&Number.isFinite(n))arr.push({tranche:key,libelle:label,valeur:Math.round(n),millesime:y});
   }
   if(arr.length>=4){groups.push(...arr);break}
  }
  if(!groups.length)errors.push('INSEE : aucune distribution par âge cohérente disponible');
  return {tranches_age:groups,erreurs:errors,source:{nom:'INSEE — Recensement de la population',niveau:'commune',dataset:'DS_RP_POPULATION_PRINC',url:'https://api.insee.fr/melodi/data/DS_RP_POPULATION_PRINC'}};
 }catch(e){return {tranches_age:[],erreurs:['INSEE âge : '+e.message],source:{nom:'INSEE — Recensement de la population',niveau:'commune'}}}
}
module.exports={demographics};
