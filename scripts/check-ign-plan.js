'use strict';
async function main(){
 const z=14,lat=46.738,lon=-1.39;
 const x=Math.floor((lon+180)/360*2**z);
 const y=Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*2**z);
 const url=new URL('https://data.geopf.fr/wmts');
 for(const [k,v] of Object.entries({SERVICE:'WMTS',REQUEST:'GetTile',VERSION:'1.0.0',LAYER:'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',STYLE:'normal',TILEMATRIXSET:'PM',TILEMATRIX:z,TILEROW:y,TILECOL:x,FORMAT:'image/png'}))url.searchParams.set(k,v);
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
 const bytes=Buffer.from(await response.arrayBuffer());
 console.log('IGN tile:',response.status,'type:',response.headers.get('content-type'),'bytes:',bytes.length,'zoom:',z,'x:',x,'y:',y);
 if(!response.ok||!response.headers.get('content-type')?.includes('image/')||bytes.length<1000)throw Error('Fond de plan IGN indisponible');
}
main().catch(e=>{console.error(e);process.exitCode=1});
