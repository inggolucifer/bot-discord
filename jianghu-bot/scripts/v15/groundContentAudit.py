#!/usr/bin/env python3
"""
scripts/v15/groundContentAudit.py
Audits all 144 macro ground textures for baked paths and streaks.
"""

import os
import glob
import json
import sys
from pixelGates import analyze_baked_path, analyze_ground_color_sanity

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JIANGHU_BOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
GROUND_DIR = os.path.join(JIANGHU_BOT_DIR, 'web-dashboard/public/assets/ground/v11')

def main():
    macro_files = sorted(glob.glob(os.path.join(GROUND_DIR, '*_m[1-4].webp')))
    print(f"[groundContentAudit] Auditing {len(macro_files)} macro textures in {GROUND_DIR}...")

    results = []
    baked_files = []

    for f in macro_files:
        basename = os.path.basename(f)
        bp = analyze_baked_path(f)
        
        info = {
            'file': basename,
            'hasBakedPath': bp['hasBakedPath'],
            'flaggedCount': len(bp.get('flaggedComponents', [])),
            'flaggedComponents': bp.get('flaggedComponents', [])
        }
        results.append(info)
        if bp['hasBakedPath']:
            baked_files.append(basename)
            print(f"  [BAKED PATH DETECTED] {basename}: {len(bp['flaggedComponents'])} component(s)")

    out_data = {
        'totalAudited': len(macro_files),
        'cleanCount': len(macro_files) - len(baked_files),
        'bakedCount': len(baked_files),
        'bakedFiles': baked_files,
        'results': results
    }

    out_path = os.path.join(JIANGHU_BOT_DIR, 'review/v15_ground_audit.json')
    with open(out_path, 'w') as fp:
        json.dump(out_data, fp, indent=2)

    print(f"\n[groundContentAudit] Done. Clean: {out_data['cleanCount']}/{out_data['totalAudited']}, Baked: {out_data['bakedCount']}")
    print(f"Report saved to: {out_path}")

if __name__ == '__main__':
    main()
