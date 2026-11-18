'use strict';
const {portrait}=require('../elections-persona-insee');
portrait('85081').then(data=>{
 console.log('INSEE RESULT',JSON.stringify(data));
 const d=data?.diplomes?.rows,a=data?.anciennete?.rows;
 if(!d||d.length!==5||!a||a.length!==6)throw Error('Tableaux incomplets');
 if(Math.abs(d.reduce((s,x)=>s+x.value,0)-3385.33398)>.5)throw Error('Somme diplomes incohérente');
 if(Math.abs(a.reduce((s,x)=>s+x.value,0)-1896.25172)>.5)throw Error('Somme anciennete incohérente');
}).catch(e=>{console.error(e);process.exitCode=1});
