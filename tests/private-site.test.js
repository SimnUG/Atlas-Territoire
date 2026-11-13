'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const auth=require('../site-auth');
test('Identifiants de test : validation du mot de passe et refus des erreurs',()=>{
 const salt='salt-de-test';
 const known=auth.digest('alice','mot-de-passe-de-test',salt);
 assert.equal(auth.verify('alice','mot-de-passe-de-test',known,salt,'alice'),true);
 assert.equal(auth.verify('alice','erreur',known,salt,'alice'),false);
 assert.equal(auth.verify('bob','mot-de-passe-de-test',known,salt,'alice'),false);
});
function request(header){
 const headers=header===null?{}:{authorization:header};
 const req={headers};
 const res={
  headers:{},status:null,ended:false,body:'',
  setHeader(k,v){this.headers[k]=v},
  writeHead(status,headers){this.status=status;Object.assign(this.headers,headers)},
  end(content){this.ended=true;this.body=String(content??'')}
 };
 return {req,res};
}
test('Aucun visiteur anonyme ne peut consulter le site ou les API',()=>{
 for(const invalid of [null,'','Bearer anything','Basic !','Basic YWxpY2U6ZXJyZXVy']){
  const {req,res}=request(invalid);
  assert.equal(auth.allow(req,res),false);
  assert.equal(res.status,401);
  assert.equal(res.ended,true);
  assert.match(res.headers['WWW-Authenticate'],/^Basic realm=/);
  assert.match(res.headers['X-Robots-Tag'],/noindex/);
  assert.match(res.headers['Cache-Control'],/no-store/);
 }
});
test('Le contrôle précède toutes les routes publiques et API',()=>{
 const server=fs.readFileSync('server.js','utf8');
 const position=server.indexOf("if(!privateAccess.allow(req,res))return");
 assert.ok(position>0);
 assert.ok(position<server.indexOf("if(url.pathname==='/api/catalogue')"));
 assert.ok(position<server.indexOf("const pathname=url.pathname==='/'"));
});
test('Aucun mot de passe en clair ou adresse personnelle dans les sources',()=>{
 const source=fs.readFileSync('site-auth.js','utf8');
 assert.match(source,/timingSafeEqual/);
 assert.match(source,/PASSWORD_DIGEST/);
 assert.doesNotMatch(source,/motdepasse\s*=|password\s*=\s*['"][A-Za-z0-9_-]{20,}['"]/i);
});
