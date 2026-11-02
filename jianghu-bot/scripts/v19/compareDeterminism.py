#!/usr/bin/env python3
"""
scripts/v19/compareDeterminism.py
Compares cold, warm, and reversed screenshots for the 6 determinism points.
Criteria:
- max avg |dRGB| <= 1.0
- pct pixels |d| > 12 <= 0.2%
"""
import sys, json, os, glob
import numpy as np
from PIL import Image

shots_dir = os.path.abspath('jianghu-bot/review/shots_v19/determinism')
points = ['P01', 'P04', 'P07', 'P11', 'P13', 'P14']
results = {}
all_pass = True

for pt in points:
    cold_p = os.path.join(shots_dir, f"{pt}_cold.png")
    warm_p = os.path.join(shots_dir, f"{pt}_warm.png")
    rev_p = os.path.join(shots_dir, f"{pt}_reversed.png")

    arr_c = np.asarray(Image.open(cold_p).convert('RGB'), dtype=np.float64)
    arr_w = np.asarray(Image.open(warm_p).convert('RGB'), dtype=np.float64)
    arr_r = np.asarray(Image.open(rev_p).convert('RGB'), dtype=np.float64)

    pairs = [
        ('cold_vs_warm', arr_c, arr_w),
        ('cold_vs_reversed', arr_c, arr_r),
        ('warm_vs_reversed', arr_w, arr_r),
    ]

    pt_results = {}
    pt_pass = True

    for name, A, B in pairs:
        diff = np.abs(A - B)
        avg_diff = float(diff.mean())
        max_channel_diff = diff.max(axis=-1)
        pct_over_12 = float((max_channel_diff > 12).mean() * 100.0)

        pair_pass = (avg_diff <= 1.0) and (pct_over_12 <= 0.20)
        if not pair_pass:
            pt_pass = False
            all_pass = False

        pt_results[name] = {
            'avg_diff': round(avg_diff, 4),
            'pct_over_12': round(pct_over_12, 4),
            'pass': pair_pass
        }

    results[pt] = {
        'pairs': pt_results,
        'pass': pt_pass
    }
    print(f"[{pt}] pass: {pt_pass} | cold_vs_warm avg: {pt_results['cold_vs_warm']['avg_diff']:.4f} (pct>12: {pt_results['cold_vs_warm']['pct_over_12']:.3f}%) | cold_vs_rev avg: {pt_results['cold_vs_reversed']['avg_diff']:.4f} (pct>12: {pt_results['cold_vs_reversed']['pct_over_12']:.3f}%) | warm_vs_rev avg: {pt_results['warm_vs_reversed']['avg_diff']:.4f} (pct>12: {pt_results['warm_vs_reversed']['pct_over_12']:.3f}%)")

output = {
    'all_pass': all_pass,
    'results': results
}

raw_out = os.path.abspath('jianghu-bot/review/v19_raw/f4_determinism.json')
with open(raw_out, 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2)

print(f"\nWritten results to {raw_out}. All pass: {all_pass}")
sys.exit(0 if all_pass else 1)
