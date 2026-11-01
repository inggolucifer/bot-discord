#!/usr/bin/env python3
"""verify_v17.py - alat ukur independen V17. DIKUNCI: jangan diubah. Pakai: python verify_v17.py <cmd> <png> [opsi]
Semua ukuran memakai PNG &ground=only&grid=0 (tanpa objek/HUD). cell_px = 38*zoom."""
import sys, json, numpy as np
from PIL import Image
def load(p): return np.asarray(Image.open(p).convert('RGB')).astype(np.float64)
def hsv(a):
    r,g,b=a[...,0]/255,a[...,1]/255,a[...,2]/255
    mx=np.maximum(np.maximum(r,g),b); mn=np.minimum(np.minimum(r,g),b); d=mx-mn
    h=np.zeros_like(mx); m=d>1e-9
    rm=m&(mx==r); gm=m&(mx==g)&~rm; bm=m&~rm&~gm
    h[rm]=((g-b)[rm]/d[rm])%6; h[gm]=(b-r)[gm]/d[gm]+2; h[bm]=(r-g)[bm]/d[bm]+4
    return h*60, np.where(mx>0,d/np.maximum(mx,1e-9),0), mx
def farm(a):
    h,s,v=hsv(a); n=h.size
    water=(h>=150)&(h<=235)&(s>0.15)
    land=~water
    L=max(land.sum(),1)
    brown=land&(h>=20)&(h<68)&(s>0.22)
    green=land&(h>=68)&(h<=140)&(s>0.18)
    # koherensi sapuan (structure tensor)
    g=a.mean(axis=2); gy,gx=np.gradient(g)
    jxx=(gx*gx).mean(); jyy=(gy*gy).mean(); jxy=(gx*gy).mean()
    tr=jxx+jyy; det=jxx*jyy-jxy*jxy; disc=max(tr*tr/4-det,0)**.5
    l1=tr/2+disc; l2=tr/2-disc
    return dict(brown=round(float(brown.sum()/L),3), green=round(float(green.sum()/L),3),
                water=round(float(water.mean()),3), coherence=round(float((l1-l2)/(l1+l2+1e-9)),3))
def boundary(a, cell_px, y0=None, y1=None):
    """lebar transisi 10-90% (sel) pada batas vertikal dominan; profil rata-rata per kolom, dari jarak warna ke plateau kiri/kanan."""
    H,W,_=a.shape; y0=y0 or 0; y1=y1 or H
    prof=a[y0:y1].mean(axis=0)
    k=int(cell_px*3)
    best=None
    d=np.linalg.norm(prof[k:]-prof[:-k],axis=1)  # perbedaan antar jendela sejarak 3 sel
    # cari kolom dgn lompatan terbesar antara rata2 kiri(2 sel) dan kanan(2 sel)
    w=int(cell_px*2); sc=[]
    for x in range(w,W-w):
        sc.append((np.linalg.norm(prof[x:x+w].mean(0)-prof[x-w:x].mean(0)),x))
    jump,x=max(sc)
    left=prof[x-w:x-int(cell_px*0.2)].mean(0); right=prof[x+int(cell_px*0.2):x+w].mean(0)
    vec=right-left; n2=(vec**2).sum()
    if n2<1: return dict(jump=round(float(jump),1),widthCells=None)
    t=((prof-left)@vec)/n2; seg=t[x-w:x+w]
    t=np.clip(seg,0,1)
    i10=np.argmax(t>=0.1); i90=np.argmax(t>=0.9)
    return dict(jump=round(float(jump),1), x=int(x), widthPx=int(abs(i90-i10)), widthCells=round(abs(i90-i10)/cell_px,2))
def straight_runs(a, cell_px, thr=14.0, y0=None,y1=None):
    """kelurusan batas: per baris, posisi x lompatan terbesar; RMS penyimpangan dari garis lurus (sel) & rentang."""
    H=a.shape[0]; y0=y0 or 0; y1=y1 or H; w=int(cell_px*1.5)
    xs=[]
    for y in range(y0,y1,4):
        row=a[y]; best=(0,0)
        for x in range(w,row.shape[0]-w,2):
            j=np.linalg.norm(row[x:x+w//2].mean(0)-row[x-w//2:x].mean(0))
            if j>best[0]: best=(j,x)
        if best[0]>=thr: xs.append(best[1])
    if len(xs)<10: return dict(rows=len(xs),rmsCells=None)
    xs=np.array(xs,float); p=np.polyfit(np.arange(len(xs)),xs,1)
    return dict(rows=len(xs), rmsCells=round(float(np.std(xs-np.polyval(p,np.arange(len(xs))))/cell_px),3))
if __name__=='__main__':
    c,p=sys.argv[1],sys.argv[2]; a=load(p); z=float(sys.argv[3]) if len(sys.argv)>3 else 1.0
    cell=38*z
    if c=='farm': print(json.dumps(farm(a)))
    elif c=='boundary': print(json.dumps(boundary(a,cell)))
    elif c=='straight': print(json.dumps(straight_runs(a,cell)))
