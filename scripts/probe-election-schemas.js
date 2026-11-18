'use strict';
async function main(){
 const slugs=[
 ['2020-t2','municipales-2020-resultats-2nd-tour'],
 ['2014','elections-municipales-2014-resultats-par-bureaux-de-vote'],
 ['2008-150','elections-municipales-2008-resultats-572150'],
 ['2008-152','elections-municipales-2008-resultats-572152'],
 ['2008-154','elections-municipales-2008-resultats-572154']
 ];
 for(const [year,slug] of slugs){
  const response=await fetch('https://www.data.gouv.fr/api/1/datasets/'+slug+'/');
  const json=await response.json();
  const list=(json.resources||[]).filter(x=>(/csv|txt/i.test(x.format)||/\.csv|\.txt/.test(x.url)));
  for(const file of list){
   if(file.filesize>75_000_000)continue;
   try{
    const r=await fetch(file.url,{headers:{Range:'bytes=0-6000'},signal:AbortSignal.timeout(30000)});
    const reader=r.body.getReader();let buffer=new Uint8Array(0);
    while(buffer.length<6000){
     const part=await reader.read();if(part.done)break;
     const next=new Uint8Array(buffer.length+part.value.length);
     next.set(buffer);next.set(part.value,buffer.length);buffer=next;
    }
    await reader.cancel();
    const raw=new TextDecoder('utf-8').decode(buffer);
    console.log('SCHEMA',year,file.title,'SIZE',file.filesize,'HTTP',r.status,
      'BOM',buffer.slice(0,5).join(','),'HEAD',JSON.stringify(raw.slice(0,3800)));
   }catch(e){console.log('ERROR',year,file.title,e.message)}
  }
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
