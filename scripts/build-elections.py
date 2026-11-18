#!/usr/bin/env python3
"""Municipales officielles 2008/2014/2020/2026, Dompierre-sur-Yon.
Sources: Ministère de l'Intérieur via data.gouv.fr.
Toutes les valeurs sont extraites de données officielles, jamais des captures.
La cartographie de personnes et les limites de BV ne sont pas inférées.
"""
import csv,io,json,os,re,urllib.request
from collections import defaultdict
from pathlib import Path

CODE='85081'
SOURCES={
'2026_1':'https://www.data.gouv.fr/api/1/datasets/r/1428132c-ad5e-437e-a928-7c2a254e40eb',
'2026_2':'https://www.data.gouv.fr/api/1/datasets/r/ac97f1d2-64b3-453e-90e6-485913aabd04',
'2020_1':'https://static.data.gouv.fr/resources/elections-municipales-2020-resultats/20200525-133704/2020-05-18-resultats-communes-de-1000-et-plus.txt',
'2020_2':'https://static.data.gouv.fr/resources/municipales-2020-resultats-2nd-tour/20200629-192435/2020-06-29-resultats-t2-communes-de-1000-hab-et-plus.txt',
'2014':'https://static.data.gouv.fr/resources/elections-municipales-2014-resultats-par-bureaux-de-vote/20150925-122128/MN14_Bvot_T1T2.txt',
'2008':'https://static.data.gouv.fr/resources/elections-municipales-2008-communes-de-plus-de-3-500-habitants-resultats-par-bureaux-de-vote-1/20150925-122851/MN08_BVot_T1T2.txt'
}
BV2020='https://static.data.gouv.fr/resources/elections-municipales-2020-resultats/20200525-133745/2020-05-18-resultats-par-niveau-burvot-t1-france-entiere.txt'
TARGET=Path('public/data/elections-85081.json')
def num(s):
 if s is None:return None
 t=str(s).replace(' ','').replace('\u202f','').replace(',','.').strip()
 if not t:return None
 try:return int(round(float(t)))
 except:return None
def den(s):
 if s is None:return None
 try:return float(str(s).replace('%','').replace(' ','').replace(',','.'))
 except:return None
def fetch(url):
 req=urllib.request.Request(url,headers={'User-Agent':'AtlasTerritoires/1.0','Accept':'text/plain,text/csv'})
 with urllib.request.urlopen(req,timeout=180) as f: return f.read()
def text(data):
 for charset in ('utf-8-sig','cp1252','latin-1'):
  try:return data.decode(charset)
  except UnicodeDecodeError:pass
 return data.decode('latin-1','replace')
def city(dep,commune):
 d=str(dep).strip().upper();c=str(commune).strip().upper()
 return d in ('85','085') and c.lstrip('0') in ('81','85081')
def candidate(name,firstname,nuance,votes,party=None):
 return {'nom':(str(firstname or '').strip()+' '+str(name or '').strip()).strip(),
  'nuance':str(nuance or '').strip().upper(),'voix':num(votes),
  'liste':str(party or '').strip()}
def aggregate(year,tour,offices,url):
 if not offices:return None
 inscriptions=sum(b['inscrits'] for b in offices if b.get('inscrits') is not None)
 abstentions=sum(b['abstentions'] for b in offices if b.get('abstentions') is not None) if all(b.get('abstentions') is not None for b in offices) else None
 votants=sum(b['votants'] for b in offices if b.get('votants') is not None)
 exprimes=sum(b['exprimes'] for b in offices if b.get('exprimes') is not None)
 blanc=sum(b.get('blancs',0) for b in offices) if all(b.get('blancs') is not None for b in offices) else None
 nul=sum(b.get('nuls',0) for b in offices) if all(b.get('nuls') is not None for b in offices) else None
 candidates={}
 for office in offices:
  for c in office['candidats']:
   key=(c['nom'].upper(),c['nuance'])
   if key not in candidates:candidates[key]={**c,'voix':0}
   if c['voix'] is not None:candidates[key]['voix']+=c['voix']
 rows=sorted(candidates.values(),key=lambda x:-x['voix'])
 for c in rows:c['part']=round(100*c['voix']/exprimes,2) if exprimes else None
 return {'annee':year,'tour':tour,'inscrits':inscriptions,'abstentions':abstentions,'votants':votants,
 'exprimes':exprimes,'blancs':blanc,'nuls':nul,'candidats':rows,'bureaux':offices,'source':url}
def office(num_bv,ins,vot,exp,blanc,nul,abst,candidates):
 return {'code':str(num_bv).zfill(4),'libelle':'Bureau '+str(num_bv).zfill(4),'inscrits':num(ins),
 'votants':num(vot),'exprimes':num(exp),'abstentions':num(abst),
 'blancs':num(blanc),'nuls':num(nul),'candidats':candidates}
def from2026(year,round_no,raw,url):
 found=[]
 it=csv.DictReader(io.StringIO(text(raw)),delimiter=';')
 for r in it:
  if not city(r.get('Code département'),r.get('Code commune')):continue
  candidates=[]
  for i in range(1,32):
   name=r.get('Nom candidat '+str(i))
   if not name:continue
   c=candidate(name,r.get('Prénom candidat '+str(i)),r.get('Nuance liste '+str(i)),r.get('Voix '+str(i)),r.get('Libellé de liste '+str(i)))
   if c['voix'] is not None:candidates.append(c)
  if not candidates:continue
  found.append(office(r.get('Code BV') or '1',r.get('Inscrits'),r.get('Votants'),r.get('Exprimés'),
   r.get('Blancs'),r.get('Nuls'),r.get('Abstentions'),candidates))
 return aggregate(year,round_no,found,url)
def from2020(year,tour,raw,url):
 s=text(raw).replace('\x00','')
 lines=s.splitlines()
 if not lines:return None
 sep='\t' if '\t' in lines[0] else ';'
 it=csv.reader(io.StringIO(s),delimiter=sep)
 header=next(it)
 # 2020: aggregate candidate blocks of 12 columns after Exprimés, or data with bureau number.
 dest=[]
 for row in it:
  if len(row)<31 or not city(row[0],row[2]):continue
  i=18
  office_no='1'
  if 'Code du b.vote' in header:
   i=19;office_no=row[4]
  cs=[]
  while i+11<len(row):
   block=row[i:i+12]
   if not block[3].strip() and not block[10].strip():break
   cand=candidate(block[3],block[4],block[1],block[9],block[5])
   if cand['voix'] is not None:cs.append(cand)
   i+=12
  if not cs:continue
  dest.append(office(office_no,row[4] if office_no=='1' else row[6],row[7] if office_no=='1' else row[9],row[15] if office_no=='1' else row[16],
   row[9] if office_no=='1' else row[11],row[12] if office_no=='1' else row[14],row[5] if office_no=='1' else row[7],cs))
 return aggregate(year,tour,dest,url)
def from2014(raw,url):
 groups=defaultdict(lambda:{'ins':None,'vot':None,'exp':None,'cs':[]})
 for line in text(raw).splitlines():
  if not line or line.startswith('--'):continue
  parts=line.split(';')
  if len(parts)<13 or not city(parts[1],parts[2]):continue
  tour=num(parts[0]);bv=parts[4]
  if tour not in (1,2):continue
  k=(tour,bv)
  g=groups[k];g.update(ins=parts[5],vot=parts[6],exp=parts[7])
  c=candidate(parts[9],parts[10],parts[11],parts[12]);g['cs'].append(c)
 rounds={}
 for tour in (1,2):
  offices=[]
  for (r,bv),g in groups.items():
   if r!=tour:continue
   ins=num(g['ins']);vot=num(g['vot']);expr=num(g['exp'])
   offices.append(office(bv,ins,vot,expr,None,None,(ins-vot if ins is not None and vot is not None else None),g['cs']))
  if offices:rounds[tour]=aggregate(2014,tour,offices,url)
 return rounds
def from2008(raw,url):
 groups=defaultdict(list)
 current=None;headers=None
 for line in text(raw).splitlines():
  if line.strip().lower().startswith('tour1'):current=1;headers=None;continue
  if line.strip().lower().startswith('tour2'):current=2;headers=None;continue
  if not line.strip() or current is None:continue
  if line.startswith("Date de l'export"):headers=line.split(';');continue
  row=line.split(';')
  if len(row)<25 or not city(row[1],row[3]):continue
  if current not in (1,2):continue
  bv=row[5];cs=[]
  for i in range(17,len(row)-8,9):
   blk=row[i:i+9]
   if len(blk)<9 or not blk[2].strip():break
   cc=candidate(blk[2],blk[3],blk[0],blk[6],blk[4])
   if cc['voix'] is not None:cs.append(cc)
  if not cs:continue
  ins=num(row[6]);vot=num(row[9])
  x=office(bv,ins,vot,row[14],None,None,row[7],cs)
  x['blancs_nuls_combines']=num(row[11])
  groups[current].append(x)
 rounds={}
 for tour,offices in groups.items():rounds[tour]=aggregate(2008,tour,offices,url)
 return rounds
def main():
 results=[]
 for key in ['2026_1','2026_2','2020_1','2020_2','2014','2008']:
  url=SOURCES[key]
  try:
   print('Lecture '+key+' '+url,flush=True)
   raw=fetch(url)
   print('Taille ',len(raw),flush=True)
   if key.startswith('2026'):value=from2026(2026,int(key[-1]),raw,url);item=[value] if value else []
   elif key.startswith('2020'):value=from2020(2020,int(key[-1]),raw,url);item=[value] if value else []
   elif key=='2014':item=list(from2014(raw,url).values())
   else:item=list(from2008(raw,url).values())
   print('Trouvés ',[(x['annee'],x['tour'],x['inscrits'],len(x['bureaux']),[(c['nom'],c['voix']) for c in x['candidats'][:3]]) for x in item],flush=True)
   results.extend(item)
  except Exception as e:
   print('ERREUR '+key+' '+repr(e),flush=True)
 if not any(x['annee']==2026 and x['tour']==1 and x['exprimes']==1555 for x in results):
  raise SystemExit('Échec validation ministérielle 2026 : attendu 1555 exprimés Dompierre-sur-Yon')
 result={'code_insee':CODE,'commune':'Dompierre-sur-Yon','scrutins':sorted(results,key=lambda x:(-x['annee'],x['tour'])),
  'sources':[{'annee':x['annee'],'tour':x['tour'],'url':x['source']} for x in results],
  'note':'Bureaux de vote : données administratives. Pas de géolocalisation de résidents ni d’attribution de voix aux adresses individuelles.'}
 TARGET.parent.mkdir(parents=True,exist_ok=True)
 TARGET.write_text(json.dumps(result,ensure_ascii=False,indent=1))
 print('PUBLIÉ',TARGET,'scrutins',len(results),flush=True)
if __name__=='__main__':main()
