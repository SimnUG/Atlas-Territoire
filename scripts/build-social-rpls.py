#!/usr/bin/env python3
"""Build a complete municipality-level RPLS 2025 index and verified Dompierre points.
Official SDES sources only. No household identifiers or landlord identities are saved.
"""
import csv,io,zipfile,json,gzip,urllib.request,math,collections
from pathlib import Path
from pyproj import Transformer
ROOT=Path('public/data');ROOT.mkdir(parents=True,exist_ok=True)
ZIP_URL='https://www.statistiques.developpement-durable.gouv.fr/media/8938/download?inline='
API='https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1/datafiles/f3c2f2cb-8fb1-40fd-8733-964247744c9a/json?millesime=2025-01&DEPCOM=eq:85081'
SOURCE_SITE='https://www.statistiques.developpement-durable.gouv.fr/54-millions-de-logements-locatifs-sociaux-en-france-au-1er-janvier-2025'
FIELDS=list(range(3,10))+list(range(15,27))+list(range(27,39))+list(range(75,82))+list(range(104,117))+list(range(130,143))+list(range(143,156))+list(range(171,182))
assert len(FIELDS)==85
def download(url):
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (Atlas Territoires; RPLS OpenData)'})
 with urllib.request.urlopen(req,timeout=170) as r:return r.read()
def n(x):
 if isinstance(x,(int,float))and math.isfinite(x):return round(x,6) if isinstance(x,float) else x
 return None
def build_aggregates():
 raw=download(ZIP_URL)
 z=zipfile.ZipFile(io.BytesIO(raw))
 xlsx=next(i.filename for i in z.infolist() if i.filename.lower().endswith('xlsx'))
 import openpyxl
 book=openpyxl.load_workbook(io.BytesIO(z.read(xlsx)),read_only=True,data_only=True)
 sheet=book['COMMUNE'];data={}
 for i,row in enumerate(sheet.values):
  if i<5:continue
  code=str(row[2] or '').strip()
  if len(code)!=5 or not code[:2].isdigit():continue
  if not isinstance(row[9],(int,float)):continue
  data[code]=[n(row[idx]) if idx<len(row) else None for idx in FIELDS]
 if len(data)<10000:raise RuntimeError('Nombre insuffisant de communes RPLS '+str(len(data)))
 v=data.get('85081')
 if not v or v[FIELDS.index(9)]!=149:raise RuntimeError('Le contrôle Dompierre 2025 ne vaut pas 149')
 result={'schema':'SDES-RPLS-2025-v1','annee':2025,'fields':FIELDS,'source':SOURCE_SITE,
   'donnees_detaillees':'https://www.data.gouv.fr/datasets/donnees-detaillees-au-logement-du-repertoire-des-logements-locatifs-des-bailleurs-sociaux-rpls',
   'communes':data}
 target=ROOT/'rpls-2025-communes.json.gz'
 with gzip.open(target,'wt',encoding='utf8',compresslevel=8) as f:json.dump(result,f,ensure_ascii=False,separators=(',',':'))
 print('AGGREGATES',len(data),'GZ BYTES',target.stat().st_size,'85081',v[:25],flush=True)
def build_geo():
 rows=json.loads(download(API).decode('utf-8'))
 if len(rows)!=149:raise RuntimeError('Fichier détaillé de Dompierre: '+str(len(rows))+' au lieu de 149')
 grouped=collections.defaultdict(lambda:{'count':0,'years':[],'types':collections.Counter(),'adresse':None,'precision':[]})
 transforms={}
 failures=0
 for row in rows:
  epsg=str(row.get('EPSG') or '')
  x=row.get('X');y=row.get('Y')
  try:x=float(x);y=float(y)
  except:failures+=1;continue
  if epsg not in ('2154',):failures+=1;continue
  key=(round(x,1),round(y,1),epsg)
  record=grouped[key];record['count']+=1
  age=row.get('CONSTRUCT')
  if age and str(age).isdigit():record['years'].append(int(age))
  t=row.get('TYPECONST_LIBELLE')
  if t:record['types'][str(t)]+=1
  dist=row.get('DISTANCE_PRECISION')
  try:record['precision'].append(float(dist))
  except:pass
  # No housing unit identifiers or individual households are exported.
 points=[]
 transform=Transformer.from_crs(2154,4326,always_xy=True)
 for (x,y,epsg),item in grouped.items():
  lng,lat=transform.transform(x,y)
  if not (46.4<lat<47.1 and -1.9<lng<-1):raise RuntimeError('Coordonnées hors commune: '+str([lat,lng]))
  count=item['count']
  points.append({'lat':round(lat,6),'lng':round(lng,6),'nombre':count,
   'annee':round(sum(item['years'])/len(item['years'])) if item['years'] else None,
   'precision_m':round(max(item['precision'])) if item['precision'] else None})
 points.sort(key=lambda a:(a['lat'],a['lng']))
 result={'millesime':2025,'code_insee':'85081','nature':'points de géolocalisation agrégés par coordonnées RPLS',
   'source':SOURCE_SITE,'details':API,'nombre_logements':len(rows),
   'nombre_points':len(points),'non_geolocalises':failures,'points':points,
   'avertissement':"Points indicatifs issus du RPLS; certaines coordonnées peuvent correspondre au centre d'une voie ou d'une parcelle, et non au bâtiment exact."}
 out=ROOT/'rpls-geo-85081.json';out.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
 print('GEO VALID',len(points),'logements',sum(p['nombre'] for p in points),'absent',failures,'PRECISION>100M',sum(p['precision_m']>100 for p in points if p['precision_m'] is not None),flush=True)
 if not 15<=len(points)<=149:raise RuntimeError('Points géographiques incohérents')
if __name__=='__main__':
 build_aggregates()
 build_geo()
