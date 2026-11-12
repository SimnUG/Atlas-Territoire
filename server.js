const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const official = require('./official-data');
const catalog = require('./data-catalog');
const rental = require('./rental-data');
const housing = require('./housing-data');
const territory = require('./territory-extra');
const adminProfile = require('./administrative-profile');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC = path.join(__dirname, 'public');
const allowed = 'https://data.geopf.fr/geocodage/search';

function send(res, status, body, type='application/json; charset=utf-8') {
  res.writeHead(status, {'Content-Type': type, 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}
async function geocode(q, limit=5) {
  if (!q || q.length < 3 || q.length > 180) throw Object.assign(new Error('Adresse de 3 à 180 caractères requise'), {status:400});
  const url = new URL(allowed);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(Math.min(8,Math.max(1,Number(limit)||5))));
  const response=await fetch(url, {signal:AbortSignal.timeout(9500),headers:{'Accept':'application/json'}});
  if(!response.ok) throw Object.assign(new Error('Géocodage officiel momentanément indisponible'),{status:502});
  const json=await response.json();
  return (json.features||[]).map(f=>({
    adresse:f.properties?.label||'', code_insee:f.properties?.citycode||f.properties?.cityCode||null,
    commune:f.properties?.city||null,code_postal:f.properties?.postcode||null,
    ban_id:f.properties?.id||null,type:f.properties?.type||null,score:typeof f.properties?.score==='number'?f.properties.score:null,
    longitude:f.geometry?.coordinates?.[0]??null,latitude:f.geometry?.coordinates?.[1]??null
  }));
}
const pending = new Map();
http.createServer(async(req,res)=>{
  const url = new URL(req.url,'http://localhost');
  if(req.method!=='GET')return send(res,405,{erreur:'Méthode non autorisée'});
  if(url.pathname==='/api/catalogue'){
    return send(res,200,catalog.catalogue(url.searchParams.get('categorie')||''));
  }
  if(url.pathname==='/api/jeux-de-donnees'){
    try {return send(res,200,await catalog.discover((url.searchParams.get('q')||'').trim(),url.searchParams.get('page')||'1'));}
    catch(e){return send(res,503,{erreur:e.message||'Catalogue officiel indisponible'});}
  }
  if(url.pathname==='/api/profil-administratif'){
    const code=(url.searchParams.get('code_insee')||'').trim();
    if(!/^(?:[0-9]{5}|2[AB][0-9]{3})$/i.test(code))return send(res,400,{erreur:'Code INSEE invalide'});
    try{return send(res,200,await adminProfile.profile(code));}
    catch(_){return send(res,200,{commune:null,epci:null,departement:null,region:null,comparaisons:[]});}
  }
  if(url.pathname==='/api/contexte-foncier'){
    const code_insee=(url.searchParams.get('code_insee')||'').trim();
    const longitude=Number(url.searchParams.get('lon'));
    const latitude=Number(url.searchParams.get('lat'));
    if(!/^(?:[0-9]{5}|2[AB][0-9]{3})$/i.test(code_insee)
       ||!Number.isFinite(longitude)||!Number.isFinite(latitude)||Math.abs(longitude)>180||Math.abs(latitude)>90)
      return send(res,400,{erreur:'Coordonnées ou commune invalides'});
    try{
      return send(res,200,await territory.analyze({code_insee,longitude,latitude}));
    }catch(_){
      return send(res,200,{urbanisme:null,risques:null,sources_supplementaires:[]});
    }
  }
  if(url.pathname==='/api/loyers'||url.pathname==='/api/logements-detail'){
    const code=(url.searchParams.get('code_insee')||'').trim();
    if(!/^(?:[0-9]{5}|2[AB][0-9]{3})$/i.test(code))return send(res,400,{erreur:'Code INSEE invalide'});
    try{
      const result=url.pathname==='/api/loyers'
        ?await rental.rent({code,historique:url.searchParams.get('historique')==='1'})
        :await housing.housing(code);
      return send(res,200,result);
    }catch(err){return send(res,502,{erreur:err.message||'Source officielle momentanément indisponible'});}
  }
  if(url.pathname==='/api/health')return send(res,200,{status:'ok',version:'0.5',sources:['INSEE','ADEME','DVF','Sitadel','DGCL–OFGL','Ministère de la Transition écologique']});
  if(url.pathname==='/api/indicateurs'){
    try{
      const code_insee=(url.searchParams.get('code_insee')||'').trim();
      const adresse=(url.searchParams.get('adresse')||'').trim();
      const code_postal=(url.searchParams.get('code_postal')||'').trim();
      const ban_id=(url.searchParams.get('ban_id')||'').trim();
      if(adresse.length>180 || ban_id.length>100)return send(res,400,{erreur:'Paramètres invalides'});
      const result=await official.analyze({code_insee,adresse,code_postal,ban_id});
      return send(res,200,result);
    }catch(e){return send(res,400,{erreur:e.message||'Analyse impossible'})}
  }
  if(url.pathname==='/api/recherche'||url.pathname==='/api/analyse'){
    const q=(url.searchParams.get('adresse')||'').trim();
    try {
      const adresses=await geocode(q,url.pathname==='/api/analyse'?1:5);
      if(url.pathname==='/api/recherche')return send(res,200,{resultats:adresses,source:{nom:'Géoplateforme — Base Adresse Nationale',catalogue:'data.gouv.fr',url:'https://www.data.gouv.fr/dataservices/api-geoplateforme-geocodage'}});
      if(!adresses.length)return send(res,404,{erreur:'Adresse introuvable'});
      return send(res,200,{
        localisation:adresses[0],
        indicateurs:[],
        categories:[
          {id:'demographie',nom:'Démographie',statut:'non_connecte',source_prevue:'INSEE'},
          {id:'immobilier',nom:'Immobilier',statut:'non_connecte',source_prevue:'DVF'},
          {id:'construction',nom:'Construction',statut:'non_connecte',source_prevue:'Sitadel'},
          {id:'revenus',nom:'Revenus et emploi',statut:'non_connecte',source_prevue:'INSEE / Urssaf'},
          {id:'energie',nom:'Énergie et bâtiments',statut:'non_connecte',source_prevue:'ADEME / BDNB'},
          {id:'finances',nom:'Finances locales',statut:'non_connecte',source_prevue:'DGCL / OFGL'}],
        source:{nom:'Géoplateforme — Base Adresse Nationale',catalogue:'data.gouv.fr',url:'https://www.data.gouv.fr/dataservices/api-geoplateforme-geocodage'},
        avertissement:'Seule la localisation est actuellement alimentée par une source officielle. Aucune statistique immobilière ou territoriale n’est inventée.'
      });
    } catch(e){return send(res,e.status||502,{erreur:e.message||'Service indisponible'});}
  }
  const pathname=url.pathname==='/'?'/index.html':url.pathname;
  const pathnameDecoded=decodeURIComponent(pathname);
  const file=path.resolve(PUBLIC,'.'+pathnameDecoded);
  if(!file.startsWith(PUBLIC+path.sep) && file!==path.join(PUBLIC,'index.html'))return send(res,403,{erreur:'Accès interdit'});
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return send(res,404,'Page introuvable','text/plain; charset=utf-8');
  const type=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':'application/octet-stream';
  res.writeHead(200,{'Content-Type':type,'X-Content-Type-Options':'nosniff'});fs.createReadStream(file).pipe(res);
}).listen(PORT,'0.0.0.0',()=>console.log('ATLAS Territoires — port '+PORT));
