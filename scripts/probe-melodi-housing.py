import requests,json,time
BASE='https://api.insee.fr/melodi/data/'
for ds in ['DS_RP_SERIE_HISTORIQUE','DS_RP_LOGEMENT_PRINC','DS_RP_TD_LOGEMENT_CARACT_PRINC']:
 for geo in ['GEO=COM-85081','GEO=85081']:
  try:
   u=BASE+ds+'?'+geo+'&maxResult=3'
   r=requests.get(u,timeout=28,headers={'Accept':'application/json'})
   print('QUERY',ds,geo,'STATUS',r.status_code,'SIZE',len(r.content),'TEXT',r.text[:1250],flush=True)
  except Exception as e:print('ERR',ds,geo,str(e),flush=True)
