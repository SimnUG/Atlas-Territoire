import urllib.request
sources={
'2026-BV':'https://www.data.gouv.fr/api/1/datasets/r/1428132c-ad5e-437e-a928-7c2a254e40eb',
'2026-COM':'https://www.data.gouv.fr/api/1/datasets/r/4feeef01-24f7-4d5a-914f-8aa806f31ec2',
'2020-T1':'https://static.data.gouv.fr/resources/elections-municipales-2020-resultats/20200525-133704/2020-05-18-resultats-communes-de-1000-et-plus.txt',
'2020-T2':'https://static.data.gouv.fr/resources/municipales-2020-resultats-2nd-tour/20200629-192435/2020-06-29-resultats-t2-communes-de-1000-hab-et-plus.txt',
'2014-BV':'https://static.data.gouv.fr/resources/elections-municipales-2014-resultats-par-bureaux-de-vote/20150925-122128/MN14_Bvot_T1T2.txt',
'2008-BV':'https://static.data.gouv.fr/resources/elections-municipales-2008-communes-de-plus-de-3-500-habitants-resultats-par-bureaux-de-vote-1/20150925-122851/MN08_BVot_T1T2.txt'}
for name,url in sources.items():
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=50) as f:
   a=f.read(6000)
  print('\nSOURCE',name,'status OK,',len(a),'bytes header:',repr(a[:1300]))
 except Exception as e:print('ERROR',name,str(e))

print("DETAIL PROBE 2026 CSV")
import csv,io
u=sources['2026-BV']
raw=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=100).read().decode('utf-8-sig')
reader=csv.DictReader(io.StringIO(raw),delimiter=';')
print('FIELDS',reader.fieldnames[:32])
for row in reader:
 if 'DOMPIERRE' in str(row).upper() and 'YON' in str(row).upper():
  print('ROW',repr({k:v for k,v in list(row.items())[:32]}));break
print('DETAIL 2008')
u=sources['2008-BV']
raw=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=100).read().decode('latin1')
for line in raw.splitlines():
 if ';85;' in line and 'Dompierre-sur-Yon' in line:
  print('ROW2008',repr(line[:950]));break
