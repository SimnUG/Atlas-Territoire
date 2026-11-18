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
