#!/usr/bin/env python3
"""
scripts/v15/generateManifestV15.py
Generates ground-manifest-v15.json and updates ground-manifest.json
according to V15 specifications for Plains Composite (J3, J4).
"""

import os
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JIANGHU_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))

V14_PATH = os.path.join(JIANGHU_DIR, 'world-data/ground-manifest-v14.json')
V15_OUT_WORLD = os.path.join(JIANGHU_DIR, 'world-data/ground-manifest-v15.json')
V15_OUT_PUBLIC = os.path.join(JIANGHU_DIR, 'web-dashboard/public/assets/ground/ground-manifest-v15.json')
MANIFEST_JSON = os.path.join(JIANGHU_DIR, 'web-dashboard/public/assets/ground/ground-manifest.json')

with open(V14_PATH, 'r', encoding='utf-8') as f:
    v14_data = json.load(f)

# Clone for v15
v15_data = dict(v14_data)
v15_data['version'] = 'v15'
v15_data['generatedAt'] = '2026-11-01'

# 1. Update cleanFamilies
clean_families = dict(v15_data.get('cleanFamilies', {}))
# plains only has variant 2 clean (m1 rejected for baked path, m3/m4 rejected previously)
clean_families['plains'] = [2]
clean_families['meadow'] = [1, 2, 4]
clean_families['forest_floor'] = [1, 2]
v15_data['cleanFamilies'] = clean_families

# 2. Update rejectedList to explicitly include plains_m1.webp
rejected_list = list(v15_data.get('rejectedList', []))
existing_rejected_files = {item['file'] for item in rejected_list}
if 'plains_m1.webp' not in existing_rejected_files:
    rejected_list.append({
        'file': 'plains_m1.webp',
        'reasons': ['baked_path: aspect >= 3.2, length >= 500px, deltaE >= 40']
    })
v15_data['rejectedList'] = rejected_list
v15_data['rejectedFiles'] = len(rejected_list)
v15_data['cleanFiles'] = 144 - len(rejected_list)

# 3. Add composite definitions to v15 manifest
v15_data['composites'] = {
    'plains_v15': {
        'weights': {
            'meadow': 0.70,
            'forest_floor': 0.20,
            'plains': 0.10
        },
        'variants': [
            'v11/meadow_m1',
            'v11/meadow_m2',
            'v11/meadow_m4',
            'v11/forest_floor_m1',
            'v11/forest_floor_m2',
            'v11/meadow_m1',
            'v11/meadow_m2',
            'v11/meadow_m4',
            'v11/meadow_m1',
            'v11/plains_m2'
        ]
    }
}

# Write v15 manifest
with open(V15_OUT_WORLD, 'w', encoding='utf-8') as f:
    json.dump(v15_data, f, indent=2)
with open(V15_OUT_PUBLIC, 'w', encoding='utf-8') as f:
    json.dump(v15_data, f, indent=2)

print(f"[generateManifestV15] Saved ground-manifest-v15.json to world-data and public/assets/ground/")

# 4. Update ground-manifest.json
with open(MANIFEST_JSON, 'r', encoding='utf-8') as f:
    manifest = json.load(f)

# Update terrains.plains to use plains_v15 composite
plains_composite_variants = v15_data['composites']['plains_v15']['variants']
manifest['terrains']['plains'] = {
    'family': 'plains',
    'variants': plains_composite_variants
}

# Update terrains.meadow to clean variants [1, 2, 4]
manifest['terrains']['meadow'] = {
    'family': 'meadow',
    'variants': ['v11/meadow_m1', 'v11/meadow_m2', 'v11/meadow_m4']
}

with open(MANIFEST_JSON, 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=2)

print(f"[generateManifestV15] Updated ground-manifest.json with plains composite (0% plains_m1, 70% meadow, 20% forest, 10% plains_m2)")
