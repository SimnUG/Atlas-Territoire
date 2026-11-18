'use strict';
/* Pré-agrège les profils de migrations depuis l’INSEE pour le cache de production.
 * Ne publie jamais les microdonnées individuelles.
 */
const fs=require('node:fs');
const path=require('node:path');
const {detail}=require('../migrations-detail-insee');
async function run(){
 const codes=(process.env.MIGRATION_COMMUNES||'85081').split(',').map(x=>x.trim()).filter(x=>/^(?:\d{5}|2[AB]\d{3})$/i.test(x));
 const dir=path.resolve(__dirname,'../public/data');
 await fs.promises.mkdir(dir,{recursive:true});
 for(const code of codes){
  const file=path.join(dir,'migrations-'+code+'.json');
  // Régénération contrôlée lors du lancement de la tâche dédiée.
  await fs.promises.rm(file,{force:true});
  console.log('Données INSEE MIGCOM 2023 : '+code);
  const result=await detail(code);
  if(result.statut!=='disponible'||!result.mobiles?.total||!result.memeLogement)throw Error('Résultat non vérifié '+code);
  await fs.promises.writeFile(file,JSON.stringify(result));
  console.log('Fichier '+file+' : '+Math.round(result.total)+' personnes, '+Math.round(result.mobiles.total)+' mobiles');
 }
}
run().catch(e=>{console.error(e);process.exitCode=1});
