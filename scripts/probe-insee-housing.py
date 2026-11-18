#!/usr/bin/env python3
import requests,zipfile,io,csv,time,json,collections,sys
URLS={
 'series':'https://www.insee.fr/fr/statistiques/fichier/9003931/DS_RP_SERIE_HISTORIQUE_2023_CSV_FR.zip',
 'principaux':'https://www.insee.fr/fr/statistiques/fichier/8997194/DS_RP_LOGEMENT_PRINC_2023_CSV_FR.zip',
 'detail':'https://www.insee.fr/fr/statistiques/fichier/8998387/DS_RP_TD_LOGEMENT_CARACT_PRINC_2023_CSV_FR.zip'
}
for name,url in URLS.items():
 try:
  t=time.monotonic()
  r=requests.get(url,timeout=180,headers={'User-Agent':'Mozilla/5.0','Accept':'*/*'});r.raise_for_status()
  print('SOURCE',name,'download',len(r.content),'elapsed',round(time.monotonic()-t,1),'zip',r.content[:4],flush=True)
  z=zipfile.ZipFile(io.BytesIO(r.content))
  print('ENTRIES',[(a.filename,a.file_size) for a in z.infolist()][:10],flush=True)
  for m in z.infolist():
   if not m.filename.lower().endswith(('.csv','.txt')):continue
   raw=z.open(m)
   tline=io.TextIOWrapper(raw,encoding='utf-8-sig',errors='replace',newline='')
   head=tline.readline()
   print('CSV',name,m.filename,'HEAD',repr(head[:1500]),flush=True)
   for idx in range(5):
    print('FIRST',name,repr(tline.readline()[:1500]),flush=True)
   break
 except Exception as e:print('ERROR',name,repr(e),flush=True)
