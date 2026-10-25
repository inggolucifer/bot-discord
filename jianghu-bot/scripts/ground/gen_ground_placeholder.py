#!/usr/bin/env python3
"""Procedural PLACEHOLDER ground textures (so the pipeline works before AI images exist).
Usage: python3 scripts/gen_ground_placeholder.py <out_dir>   -> writes art_input/ground/<id>_v{1..3}.png (512x512)
Real AI images with the same file names overwrite these."""
import sys,os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from ground_families import F
S=512
def hx(h): h=h.lstrip('#'); return np.array([int(h[i:i+2],16) for i in (0,2,4)],float)
def fbm(rng,oct=5,base=4):
    out=np.zeros((S,S));amp=1;tot=0
    for o in range(oct):
        n=base*2**o
        g=rng.random((n+1,n+1))
        im=Image.fromarray((g*255).astype(np.uint8)).resize((S,S),Image.BICUBIC)
        out+=np.asarray(im,float)/255*amp;tot+=amp;amp*=0.5
    return out/tot
def make(kind,b,a,seed):
    rng=np.random.default_rng(seed);n=fbm(rng);m=fbm(rng,4,8)
    t=np.clip((n-n.min())/(np.ptp(n)+1e-9),0,1)
    if kind in('crack','lava'):
        r=np.abs(m-0.5)*2;line=(r<0.04).astype(float);t=np.clip(t*0.7+line*0.6,0,1)
    elif kind=='dune':
        yy=np.arange(S)[:,None]/S;t=np.clip(0.5+0.25*np.sin((yy*14+n*3)*np.pi*2),0,1)*0.7+t*0.3
    elif kind=='tile':
        g=64;yy,xx=np.mgrid[0:S,0:S];seam=(((xx+1)%g<2)|((yy+1)%g<2)).astype(float);t=np.clip(t*0.8-seam*0.35,0,1)
    elif kind=='furrow':
        yy=np.arange(S)[:,None];t=np.clip(0.5+0.3*np.sin(yy/S*np.pi*2*16)+ (t-0.5)*0.5,0,1)
    elif kind=='wave':
        xx=np.arange(S)[None,:]/S;t=np.clip(0.5+0.2*np.sin((xx*10+n*2)*np.pi*2),0,1)
    elif kind=='ice':
        r=np.abs(m-0.5)*2;t=np.clip(t*0.6+(r<0.03)*0.7,0,1)
    A,B=hx(a),hx(b)
    img=B[None,None,:]*(1-t[...,None])+A[None,None,:]*t[...,None]
    img*= (0.94+0.12*fbm(rng,3,16))[...,None]
    return Image.fromarray(np.clip(img,0,255).astype(np.uint8))
if __name__=='__main__':
    out=sys.argv[1];os.makedirs(out,exist_ok=True)
    for i,(fid,tt,b,a,k,p) in enumerate(F):
        for v in (1,2,3):
            make(k,b,a,i*10+v).save(os.path.join(out,f'{fid}_v{v}.png'))
    print('placeholder written',len(F)*3)
