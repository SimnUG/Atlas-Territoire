'use strict';
/**
 * ATLAS Territoires — Accès privé par HTTP Basic Auth.
 *
 * Le mot de passe aléatoire fort a été communiqué uniquement au propriétaire.
 * Aucun mot de passe en clair dans GitHub.
 * Le dépôt ne contient que l'empreinte SHA-256 salée d'un secret à haute entropie.
 * L'authentification s'applique à toutes les routes, assets et API.
 */
const crypto=require('node:crypto');
const USER='atlas-prive';
const SALT='be0bdee6c3168d903fdce5b29a92eedc';
const PASSWORD_DIGEST='470d3c7878d1ebb6199de807b270bf5c5128c88ead9e4a50c18a9032812fd61d';
function digest(user,password,salt=SALT){
 return crypto.createHash('sha256')
  .update(salt+'\0'+user+'\0'+password,'utf8').digest('hex');
}
function verify(user,password,expected=PASSWORD_DIGEST,salt=SALT,expectedUser=USER){
 if(typeof user!=='string'||typeof password!=='string')return false;
 if(password.length>512||user.length>128)return false;
 const candidate=Buffer.from(digest(user,password,salt),'hex');
 const known=Buffer.from(expected,'hex');
 return known.length===candidate.length
  &&crypto.timingSafeEqual(candidate,known)
  &&user===expectedUser;
}
function allow(req,res){
 const common={
  'Cache-Control':'private, no-store, max-age=0',
  'Pragma':'no-cache',
  'X-Robots-Tag':'noindex, nofollow, noarchive',
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
  'Referrer-Policy':'no-referrer',
  'Vary':'Authorization'
 };
 for(const [key,val] of Object.entries(common))res.setHeader(key,val);
 const raw=req.headers?.authorization;
 let authenticated=false;
 if(typeof raw==='string' && raw.length<=2048
  &&/^Basic [A-Za-z0-9+/]+={0,2}$/.test(raw)){
  try{
   const decoded=Buffer.from(raw.slice(6),'base64').toString('utf8');
   const colon=decoded.indexOf(':');
   if(colon>0){
    authenticated=verify(decoded.slice(0,colon),decoded.slice(colon+1));
   }
  }catch(_){ authenticated=false }
 }
 if(authenticated)return true;
 res.writeHead(401,{
  ...common,
  'WWW-Authenticate':'Basic realm="ATLAS Territoires prive", charset="UTF-8"',
  'Content-Type':'text/plain; charset=utf-8'
 });
 res.end('Acces prive : identifiant et mot de passe requis.');
 return false;
}
module.exports={allow,verify,digest};
