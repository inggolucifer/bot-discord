#!/usr/bin/env python3
"""Writes web-dashboard/public/assets/ground/ground-manifest.json: {terrainType: {family, variants:[ids]}} from the csv.
Usage: python3 scripts/build_ground_manifest.py <csv> <out_json>"""
import sys,csv,json
m={};fam={}
for r in csv.DictReader(open(sys.argv[1])):
    f=r['id'].rsplit('_v',1)[0];fam.setdefault(f,{'terrains':r['terrain_types'].split(','),'variants':[]})['variants'].append(r['id'])
for f,v in fam.items():
    for t in v['terrains']:m[t]={'family':f,'variants':v['variants']}
json.dump({'tileSizePx':256,'tilesPerTexture':4,'terrains':m},open(sys.argv[2],'w'),indent=1);print('manifest',len(m),'terrains')
