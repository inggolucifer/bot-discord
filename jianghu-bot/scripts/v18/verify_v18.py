#!/usr/bin/env python3
"""verify_v18.py — alat ukur V18 (TERKUNCI, jangan diubah). Semua PNG = ground-only, grid off.
cell_px = 38*zoom.   cmd: farm | road | repeat | band | seam
"""
import sys, json, numpy as np
from PIL import Image
from scipy import ndimage as ndi
def load(p): return np.asarray(Image.open(p).convert('RGB')).astype(np.float64)
def hsv(a):
    import colorsys
    r,g,b=a[...,0]/255,a[...,1]/255,a[...,2]/255
    mx=np.maximum(np.maximum(r,g),b); mn=np.minimum(np.minimum(r,g),b); d=mx-mn
    h=np.zeros_like(mx); m=d>1e-9
    rm=m&(mx==r); gm=m&(mx==g)&~rm; bm=m&~rm&~gm
    h[rm]=((g-b)[rm]/d[rm])%6; h[gm]=(b-r)[gm]/d[gm]+2; h[bm]=(r-g)[bm]/d[bm]+4
    return h*60, np.where(mx>0,d/np.maximum(mx,1e-9),0), mx
def lum(a): return 0.2126*a[...,0]+0.7152*a[...,1]+0.0722*a[...,2]
def farm(a):
    """air TIDAK dikecualikan: semua piksel dihitung."""
    h,s,v=hsv(a)
    water=(h>=150)&(h<=235)&(s>0.15)
    brown=(h>=20)&(h<68)&(s>0.22)
    green=(h>=68)&(h<=140)&(s>0.18)&~water
    return dict(green=round(float(green.mean()),3),brown=round(float(brown.mean()),3),water=round(float(water.mean()),3))
def road(with_png,noroad_png,cell):
    A=load(with_png); B=load(noroad_png)
    d=np.abs(A-B).max(axis=2); m=ndi.median_filter((d>18).astype(np.uint8),size=5).astype(bool)
    if m.sum()<cell*cell*2: return dict(error='mask kosong',area=int(m.sum()))
    # lubang di dalam jalan (komponen latar yg terkurung, luas > 0.02 sel^2)
    filled=ndi.binary_fill_holes(m); holes=filled&~m
    lab,n=ndi.label(holes); sizes=ndi.sum(holes,lab,range(1,n+1)) if n else []
    holeCount=int(sum(1 for s in sizes if s>0.02*cell*cell))
    from skimage.morphology import skeletonize
    dt=ndi.distance_transform_edt(filled); sk=skeletonize(filled)
    # buang 1.0 sel dekat ujung/persimpangan/tepi gambar
    H,W=filled.shape; inner=np.zeros_like(sk); mg=int(cell*1.0); inner[mg:H-mg,mg:W-mg]=True
    nb=ndi.convolve(sk.astype(int),np.ones((3,3)),mode='constant')-sk
    junc=ndi.binary_dilation((sk&(nb>=3)),iterations=int(cell*0.9))
    sel=sk&inner&~junc
    r=dt[sel]
    if r.size<20: return dict(error='skeleton terlalu pendek',n=int(r.size))
    w=2*r/cell
    widthCV=float(w.std()/w.mean()); lobe=float(np.percentile(w,98)/np.median(w))
    # kontras terhadap sekitar
    ring=ndi.binary_dilation(filled,iterations=int(cell*1.5))&~ndi.binary_dilation(filled,iterations=int(cell*0.3))
    L=lum(B); La=lum(A)
    dL=float(La[filled].mean()-La[ring].mean())
    Aroad=A[filled].mean(axis=0); Mx,Mn=Aroad.max(),Aroad.min()
    sat=float((Mx-Mn)/max(Mx,1)); BmR=float(Aroad[2]-Aroad[0])
    return dict(holes=holeCount,widthCells=round(float(w.mean()),2),widthCV=round(widthCV,3),lobeRatio=round(lobe,3),dL=round(dL,1),sat=round(sat,3),BminusR=round(BmR,1))
def repeat(a,cell):
    """autokorelasi luminansi (high-pass) lag 4..30 sel; puncak > 0.35 = pola berulang/cermin."""
    g=lum(a); g=g-ndi.gaussian_filter(g,cell*1.5); g=g[::2,::2]; c=cell/2
    g=(g-g.mean())/(g.std()+1e-9)
    F=np.fft.rfft2(g); ac=np.fft.irfft2(F*np.conj(F),s=g.shape)/g.size
    H,W=g.shape; best=(0,None)
    for dy in range(0,H//2):
        for dx in range(-W//2,W//2):
            pass
    ys=np.fft.fftfreq(H,1/H).astype(int); xs=np.fft.fftfreq(W,1/W).astype(int)
    YY,XX=np.meshgrid(ys,xs,indexing='ij'); dist=np.hypot(YY,XX)/c
    mask=(dist>=4)&(dist<=min(30,W/c/2-1))
    v=ac[mask]; k=int(np.argmax(v)); return dict(maxAutocorr=round(float(v[k]),3),lagCells=round(float(dist[mask][k]),1))
def band(a,cell):
    """banding horizontal + moire frekuensi tinggi."""
    g=lum(a); rows=g.mean(axis=1); rows=rows-ndi.gaussian_filter1d(rows,cell*6)
    bandStd=float(rows.std())
    hp=g-ndi.gaussian_filter(g,2.0); F=np.abs(np.fft.rfft2(hp[:512,:512]-hp[:512,:512].mean()))
    F[0,:3]=0; F[:3,0]=0; sp=F.copy(); sp[:2,:2]=0
    peak=float(sp.max()/(np.median(sp)+1e-9))
    return dict(bandStd=round(bandStd,2),moirePeakRatio=round(peak,1))
def seam(a,cell,chunk=32):
    """lompatan di batas chunk: |kolom batas - rata2 2 kolom tetangga| vs kolom lain (rasio). Perlu cx0 = x piksel batas chunk pertama via argumen."""
    return dict(note='pakai seam <png> <zoom> <x_px_boundary>')
if __name__=='__main__':
    c=sys.argv[1]
    if c=='farm': print(json.dumps(farm(load(sys.argv[2]))))
    elif c=='road': print(json.dumps(road(sys.argv[2],sys.argv[3],38*float(sys.argv[4]))))
    elif c=='repeat': print(json.dumps(repeat(load(sys.argv[2]),38*float(sys.argv[3]))))
    elif c=='band': print(json.dumps(band(load(sys.argv[2]),38*float(sys.argv[3]))))
    elif c=='seam':
        a=load(sys.argv[2]); cell=38*float(sys.argv[3]); x=int(sys.argv[4]); g=lum(a)
        j=np.abs(g[:,x]-0.5*(g[:,x-3]+g[:,x+3])).mean(); base=np.mean([np.abs(g[:,k]-0.5*(g[:,k-3]+g[:,k+3])).mean() for k in range(x-60,x+60,7) if abs(k-x)>8])
        print(json.dumps(dict(seamJump=round(float(j),2),baseJump=round(float(base),2),ratio=round(float(j/(base+1e-9)),2))))
