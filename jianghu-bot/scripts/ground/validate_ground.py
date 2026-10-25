#!/usr/bin/env python3
"""Gate: every ground webp must (1) be NxN, (2) be seamless: edge seam error <= 1.6x interior adjacent-pixel error (ignored when abs seam error <= 5/255),
(3) not be flat (std >= 4), (4) not be too contrasty (std <= 65 so sprites stay readable), (5) mean colour within 90 RGB distance of csv base_hex.
Usage: python3 scripts/validate_ground.py <dir> <csv>   exit code 1 on any FAIL."""
import sys,os,csv
import numpy as np
from PIL import Image
d,c=sys.argv[1],sys.argv[2];fail=0
rows={r['id']:r for r in csv.DictReader(open(c))}
for id_,r in rows.items():
    p=os.path.join(d,id_+'.webp')
    if not os.path.exists(p):print('FAIL missing',id_);fail+=1;continue
    a=np.asarray(Image.open(p).convert('RGB'),float);S=a.shape[0]
    if a.shape[0]!=a.shape[1]:print('FAIL not square',id_);fail+=1;continue
    seamH=np.abs(a[:,0]-a[:,-1]).mean();seamV=np.abs(a[0]-a[-1]).mean()
    inH=np.abs(a[:,1:]-a[:,:-1]).mean();inV=np.abs(a[1:]-a[:-1]).mean()
    ratio=max(seamH/(inH+1e-6),seamV/(inV+1e-6));sd=a.std()
    base=np.array([int(r['base_hex'][i:i+2],16) for i in (1,3,5)]);dist=np.linalg.norm(a.mean((0,1))-base)
    msg=[]
    absmax=max(seamH,seamV)
    if ratio>1.6 and absmax>5.0:msg.append(f'seam ratio {ratio:.2f}>1.6 and abs {absmax:.1f}>5')
    if sd<4:msg.append(f'flat std {sd:.1f}')
    if sd>65:msg.append(f'too contrasty std {sd:.1f}')
    if dist>90:msg.append(f'colour off {dist:.0f}')
    if msg:print('FAIL',id_,'; '.join(msg));fail+=1
print('ground validate:',len(rows)-fail,'/',len(rows),'PASS');sys.exit(1 if fail else 0)
