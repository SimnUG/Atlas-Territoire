import json,urllib.request
names=["elections-municipales-2026-resultats-du-premier-tour","elections-municipales-2026-resultats-du-second-tour","elections-municipales-2020-resultats-1er-tour","municipales-2020-resultats-2nd-tour","elections-municipales-2014-resultats-par-bureaux-de-vote","elections-municipales-2008-communes-de-plus-de-3-500-habitants-resultats-par-bureaux-de-vote-1"]
for slug in names:
 try:
  u="https://www.data.gouv.fr/api/1/datasets/"+slug+"/"
  d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"AtlasTerritoires/1.0"}),timeout=25))
  print("\nSOURCE",slug,d.get("id"))
  for x in d.get("resources",[]):print("  ",x.get("id"),x.get("title"),x.get("filesize"),x.get("url"))
 except Exception as e:print("ERREUR",slug,repr(e))
