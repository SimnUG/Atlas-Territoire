#!/usr/bin/env python3
"""Complète les variations 2017→2023 d'emménagement avec les bases INSEE RP2017.
Source : https://www.insee.fr/fr/statistiques/4515532
Fichier exact : base-ccc-logement-2017.zip
"""
import csv,io,json,urllib.request,zipfile,math
from pathlib import Path
SOURCE='https://www.insee.fr/fr/statistiques/fichier/4515532/base-ccc-logement-2017.zip'
TARGET=Path('public/data/logements-85081.json')
EPCI='248500589'
def fetch(url):
 req=urllib.request.Request(url,headers={'User-Agent':'AtlasTerritoires/1.0','Accept':'*/*'})
 with urllib.request.urlopen(req,timeout=150) as r:return r.read()
def num(value):
 try:return float(str(value).strip().replace(' ','').replace(',','.'))
 except:return None
def main():
 data=json.loads(TARGET.read_text(encoding='utf-8'))
 members=json.loads(fetch('https://geo.api.gouv.fr/epcis/'+EPCI+'/communes?fields=code,nom'))
 codes={str(v['code']) for v in members}
 print('MEMBERS',len(codes),sorted(codes),flush=True)
 arc=zipfile.ZipFile(io.BytesIO(fetch(SOURCE)))
 csvs=[i for i in arc.infolist() if i.filename.lower().endswith('.csv') and i.file_size>500000]
 if not csvs:raise RuntimeError('Aucun CSV principal trouvé '+str(arc.namelist()[:15]))
 largest=max(csvs,key=lambda z:z.file_size)
 print('CSV',largest.filename,largest.file_size,flush=True)
 reader=csv.DictReader(io.TextIOWrapper(arc.open(largest),encoding='utf-8-sig',errors='replace',newline=''),delimiter=';')
 print('COLUMNS',reader.fieldnames[:25],flush=True)
 keys=['P17_MEN_ANEM0002','P17_MEN_ANEM0204','P17_MEN_ANEM0509','P17_MEN_ANEM10P']
 if not all(k in reader.fieldnames for k in keys):
  raise RuntimeError('Colonnes INSEE manquantes '+str([k for k in keys if k not in reader.fieldnames]))
 epci={k:0 for k in keys};municipal=None;matched=set()
 for row in reader:
  code=(row.get('CODGEO') or '').strip()
  if code not in codes:continue
  values=[num(row.get(k)) for k in keys]
  if any(v is None or not math.isfinite(v) or v<0 for v in values):continue
  if code in matched:continue
  matched.add(code)
  for k,v in zip(keys,values):epci[k]+=v
  if code=='85081':municipal=dict(zip(keys,values))
 print('MATCHED',len(matched),flush=True)
 print('COMMUNE',municipal,'EPCI',epci,flush=True)
 if municipal is None:raise RuntimeError('Commune 85081 absente')
 if len(matched)<10:raise RuntimeError('Trop peu de communes EPCI : '+str(len(matched)))
 if abs(sum(municipal.values())-1637)>25:raise RuntimeError('Total 2017 commune incohérent')
 if abs(sum(epci.values())-44058)>300:raise RuntimeError('Total 2017 EPCI incohérent')
 rows=data['tableaux'][-1]['lignes']
 if len(rows)!=4:raise RuntimeError('Quatre catégories attendues')
 for row,k in zip(rows,keys):
  for area,source in [('commune',municipal),('epci',epci)]:
   old=int(round(source[k]))
   new=row[area]['2023']
   if old<=0:raise RuntimeError('Dénominateur nul')
   row[area]['2017']=old
   row[area]['variation']=round((new/old-1)*100,1)
 data['source']['url_millesime_2017']='https://www.insee.fr/fr/statistiques/4515532'
 TARGET.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('SUCCESS',[(r['label'],r['commune']['2017'],r['commune']['variation'],
   r['epci']['2017'],r['epci']['variation']) for r in rows],flush=True)
if __name__=='__main__':main()
