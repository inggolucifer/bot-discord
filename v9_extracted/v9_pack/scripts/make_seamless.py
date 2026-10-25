#!/usr/bin/env python3
"""Make AI-generated images seamless + size-normalise + write webp.
Usage: python3 scripts/make_seamless.py <in_dir> <out_dir> [--size 256]
For each *.png/jpg in in_dir: centre-crop to square, resize to --size, cross-fade seamless (offset blend), save <out_dir>/<name>.webp (quality 90).
Method: out = img*m + roll(img, S/2, S/2)*(1-m), m=(sin(pi x/S)*sin(pi y/S))**0.6 -> m==0 on all 4 borders, where roll() is continuous across the tile edge."""
import sys,os,glob
import numpy as np
from PIL import Image
def seamless(a):
    S=a.shape[0];x=np.arange(S)
    w=np.sin(np.pi*(x+0.5)/S);m=(np.outer(w,w))**0.6
    r=np.roll(np.roll(a,S//2,0),S//2,1)
    return a*m[...,None]+r*(1-m[...,None])
def main():
    inp,out=sys.argv[1],sys.argv[2];size=256
    if '--size' in sys.argv:size=int(sys.argv[sys.argv.index('--size')+1])
    os.makedirs(out,exist_ok=True);n=0
    for f in sorted(glob.glob(os.path.join(inp,'*'))):
        if not f.lower().endswith(('.png','.jpg','.jpeg','.webp')):continue
        im=Image.open(f).convert('RGB');w,h=im.size;s=min(w,h)
        im=im.crop(((w-s)//2,(h-s)//2,(w-s)//2+s,(h-s)//2+s)).resize((size,size),Image.LANCZOS)
        a=seamless(np.asarray(im,float))
        # restore mean contrast lost by blending: match per-channel std to source
        src=np.asarray(im,float);a=(a-a.mean((0,1)))*(src.std((0,1))/(a.std((0,1))+1e-6))+src.mean((0,1))
        Image.fromarray(np.clip(a,0,255).astype(np.uint8)).save(os.path.join(out,os.path.splitext(os.path.basename(f))[0]+'.webp'),quality=90)
        n+=1
    print('seamless written',n)
main()
