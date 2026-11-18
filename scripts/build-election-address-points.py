#!/usr/bin/env python3
"""Extrait les coordonnées non nominatives d'adresses de Dompierre-sur-Yon, BAN.
Ne jamais associer ces points à un électeur ni déduire le vote à l'adresse.
"""
import csv,gzip,io,json,urllib.request
from pathlib import Path
URL='https://adresse.data.gouv.fr/data/ban/adresses/latest/csv/adresses-85.csv.gz'
out=Path('public/data/elections-address-points-85081.json')
req=urllib.request.Request(URL,headers={'User-Agent':'AtlasTerritoires/1.0'})
with urllib.request.urlopen(req,timeout=180) as response:
 with gzip.GzipFile(fileobj=response) as z:
  lines=io.TextIOWrapper(z,encoding='utf-8-sig',newline='')
  reader=csv.DictReader(lines,delimiter=';')
  print('BAN FIELDS',reader.fieldnames,flush=True)
  points=[];seen=set()
  for row in reader:
   code=(row.get('code_insee') or row.get('code_commune') or '').strip()
   if code!='85081':continue
   try:lat=float(row.get('lat') or row.get('latitude'));lon=float(row.get('lon') or row.get('longitude'))
   except:continue
   if not (46.5<lat<47.0 and -1.7<lon<-1.1):continue
   ident=row.get('id') or row.get('cle_interop') or ''
   if not ident:ident=str(round(lat,7))+','+str(round(lon,7))
   if ident in seen:continue
   seen.add(ident)
   addr=' '.join(x for x in (row.get('numero',''),row.get('rep',''),row.get('nom_voie','')) if x).strip()
   points.append({'lat':round(lat,7),'lng':round(lon,7),'adresse':addr[:150]})
  points.sort(key=lambda a:(a['adresse'],a['lat'],a['lng']))
  if len(points)<250:raise Exception('Couverture BAN anormalement faible '+str(len(points)))
  out.parent.mkdir(parents=True,exist_ok=True)
  out.write_text(json.dumps({'commune':'Dompierre-sur-Yon','code_insee':'85081','nature':'points_adresses_non_nominatifs','source':'Base Adresse Nationale (BAN), IGN / data.gouv.fr','url':URL,'points':points},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
  print('POINTS',len(points),'TAILLE',out.stat().st_size,flush=True)
