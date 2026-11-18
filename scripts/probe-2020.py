import urllib.request
for label,url in [('2020T1','https://static.data.gouv.fr/resources/elections-municipales-2020-resultats/20200525-133745/2020-05-18-resultats-par-niveau-burvot-t1-france-entiere.txt'),('2020T2','https://static.data.gouv.fr/resources/municipales-2020-resultats-2nd-tour/20200629-192438/resultats-par-niveau-burvot-t2-france-entiere.txt')]:
 try:
  with urllib.request.urlopen(url,timeout=60) as r:data=r.read(4000)
  print(label,repr(data[:2500]))
 except Exception as e: print('ERROR',label,e)
