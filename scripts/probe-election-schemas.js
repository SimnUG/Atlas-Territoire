'use strict';
async function main(){
 const slugs=[
 ['2026-t1','elections-municipales-2026-resultats-du-premier-tour'],
 ['2026-t2','elections-municipales-2026-resultats-du-second-tour'],
 ['2020-t1','elections-municipales-2020-resultats']
 ];
 for(const [year,slug] of slugs){
  const response=await fetch('https://www.data.gouv.fr/api/1/datasets/'+slug+'/');
  const json=await response.json();
  const list=(json.resources||[]).filter(x=>/bv|commune|burvot|bureau de vote/i.test(x.title)&&(/csv|txt/i.test(x.format)||/\.csv|\.txt/.test(x.url)));
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
