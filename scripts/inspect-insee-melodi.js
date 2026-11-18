async function main(){
 const datasets=['DS_RP_TD_MIGRES_PRINC','DS_RP_TD_MIGRES_COMP'];
 for(const name of datasets){
  const u=new URL('https://api.insee.fr/melodi/data/'+name);
  u.searchParams.set('GEO','COM-85081');
  u.searchParams.set('TIME_PERIOD','2023');
  u.searchParams.set('maxResult','1000');
  const r=await fetch(u,{signal:AbortSignal.timeout(35000)});
  console.log(name,r.status,u.toString());
  const text=await r.text();
  console.log(text.slice(0,4500));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});