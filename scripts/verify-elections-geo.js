async function run(){
 for(const url of ['https://geo.api.gouv.fr/communes/85081?fields=codeEpci,nom','https://geo.api.gouv.fr/epcis/248500589/communes?geometry=contour&format=geojson']){
 const res=await fetch(url,{signal:AbortSignal.timeout(20000)});const raw=await res.text();
 console.log(res.status,url,'type',res.headers.get('content-type'),'length',raw.length,'start',raw.slice(0,300));
 if(!res.ok)process.exitCode=1;
 else {const data=JSON.parse(raw);console.log('ARRAY?',Array.isArray(data),'features',data.features?.length,'firstprops',JSON.stringify(data.features?.[0]?.properties||data[0]?.properties||{}).slice(0,250));}
 }
}
run().catch(e=>{console.error(e);process.exitCode=1});