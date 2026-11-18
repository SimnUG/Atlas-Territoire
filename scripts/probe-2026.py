import urllib.request,csv,io
u='https://www.data.gouv.fr/api/1/datasets/r/4feeef01-24f7-4d5a-914f-8aa806f31ec2'
with urllib.request.urlopen(u,timeout=120) as f: raw=f.read()
print('SIZE',len(raw),flush=True)
s=raw.decode('utf-8-sig')
r=csv.DictReader(io.StringIO(s),delimiter=';')
print('HEADER',r.fieldnames[:32],flush=True)
found=0
for row in r:
 if 'DOMPIERRE' in repr(row).upper() and 'YON' in repr(row).upper():
  print('MATCH',repr({k:v for k,v in list(row.items())[:42]}),flush=True);found+=1
print('COUNT',found)
