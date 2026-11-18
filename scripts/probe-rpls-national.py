import urllib.request,zipfile,io,json,csv,sys
URL='https://www.statistiques.developpement-durable.gouv.fr/media/8938/download?inline='
req=urllib.request.Request(URL,headers={'User-Agent':'Mozilla/5.0'})
with urllib.request.urlopen(req,timeout=100) as f: raw=f.read()
print('TOTAL BYTES',len(raw),'TYPE',raw[:15],flush=True)
z=zipfile.ZipFile(io.BytesIO(raw))
for entry in z.infolist():
 print('ENTRY',entry.filename,'bytes',entry.file_size,flush=True)
for entry in z.infolist():
 if not entry.filename.lower().endswith(('.csv','.txt','.xlsx','.xls')):continue
 print('INSPECT',entry.filename)
 if entry.filename.lower().endswith(('.csv','.txt')):
  dat=z.read(entry)[:2400];print('HEADER',repr(dat[:2400]),flush=True)
 elif entry.filename.lower().endswith('.xlsx'):
  try:
   import openpyxl
   book=openpyxl.load_workbook(io.BytesIO(z.read(entry)),read_only=True,data_only=True)
   print('SHEETS',book.sheetnames,flush=True)
   for sheet in book.worksheets:
    print('SHEET',sheet.title,'DIMS',sheet.max_row,sheet.max_column,flush=True)
    for row in list(sheet.values)[:4]:print('ROW',repr(row[:35]),flush=True)
  except Exception as ex:print('XLSX ERR',repr(ex),flush=True)

book=openpyxl.load_workbook(io.BytesIO(z.read(max([i for i in z.infolist() if i.filename.endswith('.xlsx')],key=lambda x:x.file_size))),read_only=True,data_only=True)
sheet=book['COMMUNE']
head=[];found=False
for i,row in enumerate(sheet.values):
 if i<5:head.append(row)
 if i<5:continue
 if any('Dompierre-sur-Yon' in str(x) for x in row[:5]):
  found=True
  print('MATCH ROW',i,'FIRST',repr(row[:8]),flush=True)
  for col in range(len(row)):
   vals=[str(head[r][col] or '')[:52] if col<len(head[r]) else '' for r in range(len(head))]
   print('INDEX',col,'HEAD',repr(vals),'VALUE',repr(row[col]),flush=True)
  break
if not found: print('NO ROW for Dompierre',flush=True)
