'use strict';
const datasets=[
 'elections-municipales-2026-resultats-du-premier-tour',
 'elections-municipales-2026-resultats-du-second-tour',
 'elections-municipales-2020-resultats',
 'elections-municipales-2014-resultats',
 'elections-municipales-2008-resultats',
 'municipales-2020-resultats-2nd-tour',
 'elections-municipales-2014-resultats-par-bureaux-de-vote',
 'elections-municipales-2014-resultats-1er-tour',
 'elections-municipales-2014-resultats-1er-to-0',
 'elections-municipales-2008-resultats-572150',
 'elections-municipales-2008-resultats-572152',
 'elections-municipales-2008-resultats-572154'
];
(async()=>{
 for(const slug of datasets){
  try{
   const url='https://www.data.gouv.fr/api/1/datasets/'+slug+'/';
   const r=await fetch(url,{signal:AbortSignal.timeout(30000)});
   const d=await r.json();
   console.log('DATASET',slug,r.status,d.title,d.id,'resources',d.resources?.length);
   for(const file of d.resources||[]){
    console.log('FILE',file.title||'',file.filesize||0,file.format||'',file.url||'');
   }
  }catch(e){console.log('ERROR',slug,e.message)}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
