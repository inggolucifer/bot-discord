#!/usr/bin/env python3
"""Compute opaque-content bbox (alpha>24) for every atlas frame. Output world-data/sprite-bbox.json
{frameId:{srcW,srcH,x0,y0,x1,y1 (all as fractions 0..1 of the source frame), contentW,contentH (px)}}
Usage (from ROOT): python3 scripts/computeBBox.py"""
import json,glob,os
import numpy as np
from PIL import Image
A='web-dashboard/public/assets/atlas/';out={}
for jf in sorted(glob.glob(A+'*.json')):
    if jf.endswith('atlas_index.json'):continue
    j=json.load(open(jf));page=j.get('meta',{}).get('image') or os.path.basename(jf)[:-5]+'.webp'
    p=A+os.path.basename(page)
    if not os.path.exists(p):p=jf[:-5]+'.webp'
    if not os.path.exists(p):continue
    im=Image.open(p).convert('RGBA');a=np.asarray(im)[:,:,3]
    for k,v in j['frames'].items():
        f=v['frame'];sub=a[f['y']:f['y']+f['h'],f['x']:f['x']+f['w']]
        ys,xs=np.where(sub>24)
        if len(xs)==0:continue
        x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
        out[k]={'srcW':f['w'],'srcH':f['h'],'x0':round(x0/f['w'],4),'y0':round(y0/f['h'],4),'x1':round(x1/f['w'],4),'y1':round(y1/f['h'],4),'contentW':int(x1-x0),'contentH':int(y1-y0)}
json.dump(out,open('world-data/sprite-bbox.json','w'));print('frames',len(out))
