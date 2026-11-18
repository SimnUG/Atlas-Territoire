'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const zones=require('../zonage-abc-2026');

const csv=()=>{
 const lines=['Code INSEE de la commune;Nom de la commune;Zonage ABC en vigueur au 26 juin 2026'];
 for(let i=10000;i<45005;i++){
   lines.push(i+';Commune '+i+';'+(i%5===0?'A':i%5===1?'A bis':i%5===2?'B1':i%5===3?'B2':'C'));
 }
 lines.push('85081;Dompierre-sur-Yon;C');
 lines.push('85191;La Roche-sur-Yon;B1');
 return lines.join('\n');
};

test('les cinq zones reconnues sans confusion',()=>{
 assert.equal(zones.zoneCanon('A bis'),'A bis');
 assert.equal(zones.zoneCanon('Abis'),'A bis');
 assert.equal(zones.zoneCanon('Zone B1'),'B1');
 assert.equal(zones.zoneCanon(' B2 '),'B2');
 assert.equal(zones.zoneCanon('zone C'),'C');
 assert.equal(zones.zoneCanon('Z'),null);
});
test('codes géographiques valides',()=>{
 assert.ok(zones.validCode('85081'));
 assert.ok(zones.validCode('44109'));
 assert.equal(zones.validCode('8517'),false);
 assert.equal(zones.validCode('85170-commune'),false);
});
test('CSV officiel : extraction par code INSEE et conservation de chaque zonage',()=>{
 const list=zones.parseCsv(csv());
 assert.ok(list.size>30000);
 assert.equal(list.get('85081'),'C');
 assert.equal(list.get('85191'),'B1');
 assert.equal(list.get('44000'),'A');
 assert.equal(list.get('12002'),'B1');
 assert.equal(list.get('99999'),undefined);
});
test('CSV incomplet rejeté, aucune valeur fictive',()=>{
 assert.throws(()=>zones.parseCsv('Code INSEE;Zonage ABC\n85081;C'),/incomplet/);
});
test('CSV : lignes citées et détection de tabulation',()=>{
 const rows=[['Code INSEE de la commune','Commune','Zonage ABC en vigueur au 26 juin 2026']];
 assert.equal(zones.locateHeader(rows).code,0);
 assert.equal(zones.locateHeader(rows).zone,2);
});
