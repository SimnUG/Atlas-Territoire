'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const housing=require('../logements-insee-complet');
const hist=new Map([
 [1968,{_T:384,DW_MAIN:362,DW_SEC_DW_OCC:8,DW_VAC:14}],
 [2023,{_T:1984.59403,DW_MAIN:1896.25172,DW_SEC_DW_OCC:20.46956,DW_VAC:67.87275}]
]);
function series(){
 const rows=[];
 for(const [year,categories] of hist){
  for(const [oc,val] of Object.entries(categories)){
   rows.push({dimensions:{TIME_PERIOD:String(year),OCS:oc,RP_MEASURE:'DWELLINGS'},
    measures:{OBS_VALUE_NIVEAU:{value:val}}});
  }
 }
 return rows;
}
const sample=(year,oc,filtered,val)=>{
 const d={TIME_PERIOD:String(year),OCS:oc,RP_MEASURE:'DWELLINGS',TDW:'_T',TSH:'_T',NOR:'_T',L_STAY:'_T',BUILD_END:'_T',NRG_SRC:'_T',CARPARK:'_T',CARS:'_T'};
 Object.assign(d,filtered);
 return {dimensions:d,measures:{OBS_VALUE_NIVEAU:{value:val}}};
};
const makeHousing=()=>[
 sample(2023,'_T',{},1984.59403),
 sample(2023,'DW_MAIN',{},1896.25172),
 sample(2023,'DW_SEC_DW_OCC',{},20.46956),
 sample(2023,'DW_VAC',{},67.87275),
 sample(2023,'_T',{TDW:'1'},1940.85687),
 sample(2023,'_T',{TDW:'2'},39.44095),
 sample(2023,'_T',{TDW:'3T6'},4.29622),
 sample(2023,'DW_MAIN',{TSH:'100'},1541.39281),
 sample(2023,'DW_MAIN',{TSH:'200'},351.5626),
 sample(2023,'DW_MAIN',{TSH:'221'},106.04465),
 sample(2023,'DW_MAIN',{TSH:'300'},3.29631),
 ...[['R1',1.14155],['R2',32.8842],['R3',195.45276],['R4',533.32538],['R_GE5',1133.44784]].map(([v,n])=>sample(2023,'DW_MAIN',{NOR:v},n)),
 ...[['Y_LT2',194.59277],['Y2T4',312.40571],['Y5T9',289.37159],['Y10T19',505.43451],['Y20T29',219.0873],['Y_GE30',375.35983]].map(([v,n])=>sample(2023,'DW_MAIN',{L_STAY:v},n)),
 sample(2017,'_T',{},1722.07442),
 sample(2017,'DW_MAIN',{},1637),
 sample(2017,'DW_SEC_DW_OCC',{},13),
 sample(2017,'DW_VAC',{},72),
 ...[['1',1693.3414],['2',26.7493],['3T6',1.98372]].map(([v,n])=>sample(2017,'_T',{TDW:v},n)),
 ...[['100',1327.76044],['200',302.13016],['221',77.56894],['300',7.10941]].map(([v,n])=>sample(2017,'DW_MAIN',{TSH:v},n)),
 ...[['R1',4],['R2',22],['R3',169],['R4',464],['R_GE5',979]].map(([v,n])=>sample(2017,'DW_MAIN',{NOR:v},n)),
 ...[['Y_LT2',157.59417],['Y2T4',265.08284],['Y5T9',301.52446],['Y10T19',400.11518],['Y20T29',162.56801],['Y_GE30',350.11533]].map(([v,n])=>sample(2017,'DW_MAIN',{L_STAY:v},n))
];
test('Dompierre housing dimensions are extracted without interpolation or duplicate totals',()=>{
 const rows=makeHousing(),m=housing.ext(housing.metrics(rows,2023)),old=housing.ext(housing.metrics(rows,2017));
 assert.equal(Math.round(m.total),1985);
 assert.equal(Math.round(m.horsHlm),246);
 assert.equal(Math.round(m.em10plus),1100);
 assert.equal(Math.round(old.em10plus),913);
 assert.equal(Math.round(m.maisons),1941);
 assert.equal(Math.round(m.hlm),106);
 assert.equal(Math.round(m.piece5),1133);
});
test('Historical dimensions preserve 1968 and 2023, missing years remain null',()=>{
 const obs=series(),area=housing.createArea('85081','Dompierre',obs,makeHousing());
 assert.equal(area.historique.total.donnees[0].valeur,384);
 assert.equal(area.historique.total.donnees[8].valeur,1985);
 assert.equal(area.historique.total.donnees[3].valeur,null);
});
test('5 comparison tables have 2017/2023 changes, 2023 shares and France reference',()=>{
 const c=housing.createArea('85081','Dompierre',series(),makeHousing());
 const e=housing.createArea('248500589','Agglomération',series(),makeHousing());
 const f=housing.createArea('FRANCE-F','France',[],makeHousing());
 const result=housing.assemble(c,e,f);
 assert.equal(result.tableaux.length,5);
 assert.equal(result.tableaux.reduce((n,t)=>n+t.lignes.length,0),20);
 const maisons=result.tableaux.find(x=>x.id==='type').lignes[0];
 assert.equal(maisons.commune['2023'],1941);
 assert.equal(maisons.commune['2017'],1693);
 assert.ok(Math.abs(maisons.commune.variation-14.6)<.11);
 assert.ok(Math.abs(maisons.commune.part-97.8)<.11);
 const ten=result.tableaux.find(x=>x.id==='anciennete').lignes[3];
 assert.equal(ten.commune['2023'],1100);
 assert.equal(ten.commune['2017'],913);
 assert.ok(ten.reference_france!==null);
});
test('Missing INSEE observations are unknown and not replaced by zeros',()=>{
 assert.equal(housing.one([],2023,'_T'),null);
 assert.equal(housing.metrics([],2023).total,null);
 assert.throws(()=>housing.createArea('44001','X',[],[]));
});
