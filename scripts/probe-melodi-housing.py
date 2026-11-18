import requests,json,time
BASE='https://api.insee.fr/melodi/data/'
for ds in ['DS_RP_SERIE_HISTORIQUE','DS_RP_LOGEMENT_PRINC','DS_RP_TD_LOGEMENT_CARACT_PRINC']:
 for geo in ['GEO=COM-85081','GEO=85081']:
  try:
   u=BASE+ds+'?'+geo+'&maxResult=3'
   r=requests.get(u,timeout=28,headers={'Accept':'application/json'})
   print('QUERY',ds,geo,'STATUS',r.status_code,'SIZE',len(r.content),'TEXT',r.text[:1250],flush=True)
  except Exception as e:print('ERR',ds,geo,str(e),flush=True)

import collections
def inspect(ds,geo,period):
 try:
  q={'GEO':geo,'maxResult':25000}
  if period:q['TIME_PERIOD']=period
  rr=requests.get(BASE+ds,params=q,timeout=75)
  d=rr.json()
  rows=d.get('observations',[])
  print('INSPECT',ds,geo,period,'status',rr.status_code,'len',len(rows),'size',len(rr.content),'PAGING',d.get('paging'),flush=True)
  if rows:
   keys=sorted(set(k for row in rows for k in row.get('dimensions',{})))
   for key in keys:
    ct=collections.Counter(row.get('dimensions',{}).get(key) for row in rows)
    print('DIM',key,'N',len(ct),'TOP',ct.most_common(18),flush=True)
   for row in rows:
    dim=row.get('dimensions',{})
    if all(dim.get(x)=='_T' for x in ['BUILD_END','TDW','TSH']) and dim.get('TIME_PERIOD')==period:
     print('TOTAL_DIM',str(dim)[:400],row.get('measures'),flush=True)
 except Exception as e:print('INSPECT ERROR',ds,geo,period,repr(e),flush=True)
for ds,g,t in [
 ('DS_RP_SERIE_HISTORIQUE','GEO=COM-85081',None),
 ('DS_RP_LOGEMENT_PRINC','COM-85081','2023'),
 ('DS_RP_TD_LOGEMENT_CARACT_PRINC','COM-85081','2023'),
 ('DS_RP_SERIE_HISTORIQUE','EPCI-248500589',None),
 ('DS_RP_LOGEMENT_PRINC','FRANCE-F','2023')
]:
 inspect(ds,g.replace('GEO=',''),t)

def dims(ds,geo,period='2023'):
 q={'GEO':geo,'maxResult':10000}
 if period:q['TIME_PERIOD']=period
 rr=requests.get(BASE+ds,params=q,timeout=75)
 rows=rr.json().get('observations',[])
 print('TOTALS',ds,geo,period,'rows',len(rows),flush=True)
 def dim(row,key):return row.get('dimensions',{}).get(key)
 for row in rows:
  dd=row['dimensions']
  dims=['TDW','TSH','NOR','L_STAY','OCS','BUILD_END']
  k=[(d,dd.get(d))for d in dims if dd.get(d) and dd.get(d)!='_T']
  if dd.get('RP_MEASURE')!='DWELLINGS':continue
  if dd.get('TDW')!='_T' and any(dd.get(i)!='_T' for i in ['BUILD_END','L_STAY','NOR','TSH']):continue
  if dd.get('TSH')!='_T' and any(dd.get(i)!='_T' for i in ['BUILD_END','L_STAY','NOR','TDW']):continue
  if dd.get('L_STAY')!='_T' and any(dd.get(i)!='_T' for i in ['BUILD_END','TSH','NOR','TDW']):continue
  if dd.get('NOR')!='_T' and any(dd.get(i)!='_T' for i in ['BUILD_END','TSH','L_STAY','TDW']):continue
  if dd.get('BUILD_END')!='_T' and any(dd.get(i)!='_T' for i in ['NOR','TSH','L_STAY','TDW']):continue
  print('ROW',dd.get('TIME_PERIOD'),dd.get('OCS'),[(d,dd[d]) for d in dims if dd.get(d)!='_T'],
   row.get('measures',{}).get('OBS_VALUE_NIVEAU',{}).get('value'),flush=True)
for ds,geo,period in [
 ('DS_RP_LOGEMENT_PRINC','COM-85081','2023'),
 ('DS_RP_LOGEMENT_PRINC','COM-85081','2017'),
 ('DS_RP_LOGEMENT_PRINC','FRANCE-F','2023'),
 ('DS_RP_LOGEMENT_PRINC','EPCI-248500589','2023')
]:
 dims(ds,geo,period)
