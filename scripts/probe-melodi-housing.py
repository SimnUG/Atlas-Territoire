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
