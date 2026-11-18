'use strict';
const h=require('../logements-insee-complet');
async function main(){
 const profiles=[
  {commune:'85081',epci:'248500589',nomCommune:'Dompierre-sur-Yon',nomEpci:'CA La Roche-sur-Yon Agglomération'},
  {commune:'85191',epci:'248500589',nomCommune:'La Roche-sur-Yon',nomEpci:'CA La Roche-sur-Yon Agglomération'},
  {commune:'44109',epci:'244400404',nomCommune:'Nantes',nomEpci:'Nantes Métropole'},
  {commune:'44194',epci:'244400404',nomCommune:'Sautron',nomEpci:'Nantes Métropole'}
 ];
 for(const [i,arg] of profiles.entries()){
  const start=Date.now(),result=await h.logement(arg);
  if(result.statut!=='disponible'||result.tableaux.length!==5)throw Error(arg.nomCommune+' missing tables');
  const historical=Object.values(result.historique);
  if(historical.length!==4||historical.some(x=>x.commune.length!==9||x.epci.length!==9))throw Error('historical incomplete '+arg.nomCommune);
  let missing=[],total=0;
  for(const t of result.tableaux)for(const r of t.lignes){
   for(const area of ['commune','epci'])for(const k of ['2023','2017','part']){
    total++;
    if(typeof r[area][k]!=='number')missing.push(t.id+' '+r.label+' '+area+' '+k);
   }
   if(typeof r.reference_france!=='number')missing.push('reference '+t.id+' '+r.label);
  }
  console.log(JSON.stringify({code:arg.commune,ville:arg.nomCommune,
   count23:result.commune.total,epci:result.epci.total,
   tests:total,missing,missingCount:missing.length,
   first1968:result.historique.total.commune[0],
   last2023:result.historique.total.commune.at(-1),
   ms:Date.now()-start}));
  if(missing.length)throw Error('INSEE données manquantes pour '+arg.nomCommune+': '+missing.join(', '));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
