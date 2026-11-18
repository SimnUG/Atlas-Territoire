#!/usr/bin/env python3
"""Compile official Ministry municipal election 2026 rounds 1 & 2 for all 44/85.
Only code-level commune and bureau totals are exported; no voter-level records.
"""
import csv,gzip,io,json,collections,urllib.request,time,sys,math
from pathlib import Path

BASE='https://www.data.gouv.fr/api/1/datasets/'
DATASETS=[
 (1,'elections-municipales-2026-resultats-du-premier-tour','Résultats - BV par communes'),
 (2,'elections-municipales-2026-resultats-du-second-tour','Résultats - Bureau de vote')
]
ROOT=Path('public/data')
CODES=set(json.loads(gzip.decompress((ROOT/'logements-44-85-2023.json.gz').read_bytes()).decode('utf-8'))['communes'])
assert len(CODES)==460,len(CODES)
SRC={};RESULT=collections.defaultdict(dict)
def req(url):
 r=urllib.request.Request(url,headers={'User-Agent':'Atlas Territoires (ministry open data)','Accept':'*/*'})
 return urllib.request.urlopen(r,timeout=180)
def value(raw):
 try:return int(str(raw or '0').strip().replace(' ',''))
 except:return 0
def candidates(row):
 names=[]
 for i in range(1,25):
  voce=row.get(f'Voix {i}')
  if voce is None:break
  if not str(voce).strip():continue
  surname=(row.get(f'Nom candidat {i}') or '').strip()
  firstname=(row.get(f'Prénom candidat {i}') or '').strip()
  label=(row.get(f'Libellé de liste {i}') or row.get(f'Libellé abrégé de liste {i}') or '').strip()
  name=' '.join(x for x in [firstname,surname] if x) or label or 'Liste '+str(i)
  key=str(i)+'|'+name
  names.append({'key':key,'nom':name,'nuance':(row.get(f'Nuance liste {i}') or '').strip(),
    'liste':label,'voix':value(voce)})
 return names
def aggregate(annee,tour,rows,url):
 group=collections.defaultdict(list)
 for row in rows:
  code=str(row.get('Code commune') or '').strip()
  if code not in CODES:continue
  group[code].append(row)
 for code,bureaux in group.items():
  total={'annee':annee,'tour':tour,'inscrits':0,'abstentions':0,
   'votants':0,'exprimes':0,'blancs':0,'nuls':0,'blancs_nuls':0,
   'candidats':[],'bureaux':[],'source':url}
  sums={}
  for row in bureaux:
   b={'code':str(row.get('Code BV') or '').strip(),'libelle':"Bureau "+str(row.get('Code BV') or '').strip()}
   for k,v in [('inscrits','Inscrits'),('abstentions','Abstentions'),('votants','Votants'),
    ('exprimes','Exprimés'),('blancs','Blancs'),('nuls','Nuls')]:
    b[k]=value(row.get(v));total[k]+=b[k]
   b['candidats']=candidates(row);b['blancs_nuls']=b['blancs']+b['nuls']
   total['bureaux'].append(b)
   for cand in b['candidats']:
    if cand['key'] not in sums:
     sums[cand['key']]={k:v for k,v in cand.items() if k!='key'}
    else:
     sums[cand['key']]['voix']+=cand['voix']
  total['blancs_nuls']=total['blancs']+total['nuls']
  total['candidats']=[{**x,'part':round(x['voix']*100/total['exprimes'],2) if total['exprimes'] else 0}
   for x in sums.values()]
  total['candidats'].sort(key=lambda x:(-x['voix'],x['nom']))
  RESULT[code][tour]=total
  assert total['votants']<=total['inscrits']+1,(code,tour,'votants')
  assert total['blancs']+total['nuls']+total['exprimes']==total['votants'],(code,tour,'votes')
 return {code:len(rows) for code,rows in group.items()}
for tour,slug,label in DATASETS:
 with req(BASE+slug+'/') as resp:meta=json.load(resp)
 candidates_meta=[x for x in meta['resources'] if label.lower() in (x.get('title') or '').lower() and
  ('csv' in (x.get('format') or '').lower() or '.csv' in (x.get('url') or ''))]
 if len(candidates_meta)!=1:raise RuntimeError('Ambiguous official resource '+slug+str([x['title'] for x in candidates_meta]))
 u=candidates_meta[0]['url']
 SRC[str(tour)]=u
 print('FETCH',slug,candidates_meta[0]['title'],candidates_meta[0].get('filesize'),flush=True)
 ts=time.monotonic()
 with req(u) as resp:
  reader=csv.DictReader(io.TextIOWrapper(resp,encoding='utf-8-sig',errors='replace',newline=''),delimiter=';')
  stats=aggregate(2026,tour,reader,u)
 print('DONE',tour,'codes',len(stats),'BVs',sum(stats.values()),'seconds',round(time.monotonic()-ts,1),flush=True)
mapdata={code:{'code_insee':code,'scrutins':sorted(x.values(),key=lambda v:v['tour']),
 'source':'Ministère de l’Intérieur — municipales 2026, par bureaux de vote'}
 for code,x in RESULT.items()}
report={'date':'2026-11-18','annee':2026,'total_communes':len(CODES),
 'couverture_1er_tour':sum(1 for x in mapdata.values() if any(v['tour']==1 for v in x['scrutins'])),
 'couverture_2e_tour':sum(1 for x in mapdata.values() if any(v['tour']==2 for v in x['scrutins'])),
 'communes_absentes':sorted(CODES-mapdata.keys()),
 'nombre_bureaux':sum(len(v['bureaux']) for x in mapdata.values() for v in x['scrutins']),
 'sources':SRC}
ROOT.joinpath('elections-2026-44-85-couverture.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=ROOT/'elections-2026-44-85.json.gz'
with gzip.open(p,'wt',encoding='utf-8',compresslevel=8) as f:
 json.dump({'schema':'ATLAS-MUNICIPALES-2026-v1','sources':SRC,'communes':mapdata},f,ensure_ascii=False,separators=(',',':'))
print('SUMMARY',json.dumps(report,ensure_ascii=False),'archiveKB',round(p.stat().st_size/1024),flush=True)
if report['couverture_1er_tour']<450:raise RuntimeError('Couverture premier tour insuffisante')
