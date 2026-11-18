import urllib.request, urllib.parse, json, sys
BASE='https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1'
RID='f3c2f2cb-8fb1-40fd-8733-964247744c9a'
def get(url):
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (Atlas Territoires; SDES OpenData)'})
  with urllib.request.urlopen(req,timeout=45) as r:
   b=r.read(350000)
   print('HTTP',r.status,'LEN',len(b),'TYPE',r.headers.get('Content-Type'),'URL',r.geturl(),flush=True)
   return b.decode('utf-8-sig','replace')
 except Exception as e:
  print('ERROR',repr(e),'URL',url,flush=True);return ''
u=f'{BASE}/datafiles/{RID}'
x=get(u)
try:
 d=json.loads(x)
 print('META STRUCT',str(type(d)),list(d)[:30],flush=True)
 print('META',json.dumps(d,ensure_ascii=False)[:13000],flush=True)
except:print('RAW META',x[:2500],flush=True)
for q in [{'pageSize':'1'}, {'pageSize':'5','CODE_COMMUNE':'85081'}, {'pageSize':'5','CODECOM':'85081'},{'pageSize':'5','COMMUNE':'85081'}, {'pageSize':'5','CodeCommune':'85081'}]:
 url=f'{BASE}/datafiles/{RID}/rows?'+urllib.parse.urlencode(q)
 raw=get(url)
 try:
  d=json.loads(raw)
  print('QUERY',q,'TOP',list(d)[:15] if isinstance(d,dict) else type(d),'DATA',json.dumps(d,ensure_ascii=False)[:3500],flush=True)
 except:print('QUERY RAW',q,raw[:500],flush=True)
# Optional catalogue API
raw=get(f'{BASE}/datasets/6390f7cb84f0679b04942fc2')
print('CATALOGUE',raw[:3500],flush=True)
