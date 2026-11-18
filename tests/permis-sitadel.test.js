'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const sitadel=require('../permis-sitadel');

const source={
 COMM:'85081',TYPE_DAU:'PC',NUM_DAU:'08508116C00005',ETAT_DAU:5,
 DATE_REELLE_AUTORISATION:'2016-04-12',DATE_REELLE_DOC:'2016-09-20',
 NB_LGT_TOT_CREES:14,NB_LGT_IND_CREES:0,NB_LGT_COL_CREES:14,
 NB_LGT_1P:0,NB_LGT_2P:1,NB_LGT_3P:10,NB_LGT_4P:3,
 ADR_NUM_TER:'6',ADR_LIBVOIE_TER:'RUE DU BOIS NOIR',
 DENOM_DEM:'IMMOBILIERE PODELHA',SEC_CADASTRE1:'AC',NUM_CADASTRE1:'0123'
};
test('Permis Sitadel : PC par code exact, logements et pièces',()=>{
 const r=sitadel.normalize(source,'85081');
 assert.equal(r.nombre,14);
 assert.equal(r.col,14);
 assert.equal(r.ind,0);
 assert.equal(r.typologie,'appartements');
 assert.equal(r.status,'Commencé');
 assert.equal(r.annee,2016);
 assert.equal(r.adresse,'6 RUE DU BOIS NOIR');
 assert.deepEqual(r.pieces,[0,1,10,3,null,null]);
 assert.deepEqual(r.parcelles,['AC 0123']);
});
test('Permis Sitadel : refus DP, annulé, mauvaise commune, projet sans logement',()=>{
 assert.equal(sitadel.normalize({...source,TYPE_DAU:'DP'},'85081'),null);
 assert.equal(sitadel.normalize({...source,ETAT_DAU:'4'},'85081'),null);
 assert.equal(sitadel.normalize({...source,COMM:'44020'},'85081'),null);
 assert.equal(sitadel.normalize({...source,NB_LGT_TOT_CREES:0},'85081'),null);
});
test('Permis Sitadel : distinction autorisé, commencé, terminé et absence DOC',()=>{
 assert.equal(sitadel.normalize({...source,ETAT_DAU:2,DATE_REELLE_DOC:null},'85081').status,'Autorisé');
 assert.equal(sitadel.normalize({...source,ETAT_DAU:6,DATE_REELLE_DAACT:'2017-08-05'},'85081').status,'Terminé');
 assert.equal(sitadel.normalize({...source,DATE_REELLE_DOC:null},'85081').date_doc,null);
});
test('Permis Sitadel : confidentialité demandeur',()=>{
 assert.equal(sitadel.normalize({...source,DENOM_DEM:'secret'},'85081').demandeur,null);
});
test('Permis Sitadel : formats date et extraction tableaux API',()=>{
 assert.equal(sitadel.date('20160412'),'2016-04-12');
 assert.equal(sitadel.date('2016-02-30'),null);
 assert.deepEqual(sitadel.extractArray({data:{rows:[source]}}),[source]);
 assert.deepEqual(sitadel.extractArray({rows:[source]}),[source]);
 assert.equal(sitadel.valid('85081'),true);
 assert.equal(sitadel.valid('44201'),true);
 assert.equal(sitadel.valid('75056'),false);
});
test('Permis Sitadel : PC mixte conserve logements des deux types',()=>{
 const r=sitadel.normalize({...source,NB_LGT_IND_CREES:3,NB_LGT_COL_CREES:11},'85081');
 assert.equal(r.typologie,'mixte');
 assert.equal(r.nombre,14);
 assert.equal(r.ind,3);
 assert.equal(r.col,11);
});
