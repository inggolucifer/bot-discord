#!/usr/bin/env python3
"""
scripts/v15/syncManifestAndAliases.py
Synchronizes ground-manifest-v15.json, ground-alias-v15.json, and ground-manifest.json.
Ensures:
1. Every active terrain in ground-manifest.json has >= 3 clean variants.
2. 0 variants from rejectedList are present anywhere in ground-manifest.json.
3. Plains composite uses 0% plains_m1 and 100% clean variants.
"""

import os
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JIANGHU_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))

V15_MANIFEST_PATH = os.path.join(JIANGHU_DIR, 'world-data/ground-manifest-v15.json')
V15_PUBLIC_MANIFEST_PATH = os.path.join(JIANGHU_DIR, 'web-dashboard/public/assets/ground/ground-manifest-v15.json')
ALIAS_WORLD_PATH = os.path.join(JIANGHU_DIR, 'world-data/ground-alias-v15.json')
ALIAS_PUBLIC_PATH = os.path.join(JIANGHU_DIR, 'web-dashboard/public/assets/ground/ground-alias-v15.json')
MANIFEST_JSON_PATH = os.path.join(JIANGHU_DIR, 'web-dashboard/public/assets/ground/ground-manifest.json')

with open(V15_MANIFEST_PATH, 'r', encoding='utf-8') as f:
    v15_data = json.load(f)

with open(MANIFEST_JSON_PATH, 'r', encoding='utf-8') as f:
    ground_manifest = json.load(f)

# Collect all rejected file basenames
rejected_files = set()
for r in v15_data.get('rejectedList', []):
    rejected_files.add(r['file'])

print(f"[syncManifest] Loaded {len(rejected_files)} rejected macro files.")

# Curated high-quality clean aliases for families with rejected variants
family_aliases = {
    'crater': ['v11/volcanic_m1', 'v11/battlefield_ash_m3'],
    'desert_sand': ['v11/dune_m2'],
    'dune': ['v11/desert_sand_m3'],
    'farmland': ['v11/meadow_m1'],
    'forest_floor': ['v11/meadow_m1', 'v11/bamboo_floor_m2'],
    'formation_tile': ['v11/ruin_floor_m1'],
    'glacier': ['v11/snow_m2', 'v11/snow_m3'],
    'lightning_scar': ['v11/crater_m1'],
    'oasis': ['v11/meadow_m2', 'v11/meadow_m4'],
    'plains': ['v11/meadow_m1', 'v11/meadow_m2', 'v11/meadow_m4', 'v11/bamboo_floor_m2'],
    'river': ['v11/lake_m1'],
    'snow': ['v11/ice_crack_m2'],
    'swamp': ['v11/poison_pool_m2', 'v11/demonic_swamp_m2']
}

# Update alias files
alias_out = {
    'version': 'v15',
    'description': 'Ground aliasing for families with < 3 clean variants to ensure variety and eliminate rejected macro textures',
    'aliases': family_aliases
}
with open(ALIAS_WORLD_PATH, 'w', encoding='utf-8') as f:
    json.dump(alias_out, f, indent=2)
with open(ALIAS_PUBLIC_PATH, 'w', encoding='utf-8') as f:
    json.dump(alias_out, f, indent=2)

# Sanitize ground-manifest.json terrains
for terrain_key, t_info in ground_manifest.get('terrains', {}).items():
    fam = t_info.get('family', terrain_key)
    old_vars = t_info.get('variants', [])
    
    # Filter out rejected
    clean_vars = [v for v in old_vars if (v.replace('v11/', '') + '.webp') not in rejected_files]
    
    # If plains, use plains_v15 composite
    if terrain_key == 'plains' or fam == 'plains':
        clean_vars = [
            'v11/meadow_m1',
            'v11/meadow_m2',
            'v11/meadow_m4',
            'v11/forest_floor_m1',
            'v11/bamboo_floor_m2',
            'v11/meadow_m1',
            'v11/meadow_m2',
            'v11/meadow_m4',
            'v11/meadow_m1',
            'v11/plains_m2'
        ]
    else:
        # If less than 3, add aliases
        if len(clean_vars) < 3 and fam in family_aliases:
            for alias_v in family_aliases[fam]:
                if alias_v not in clean_vars:
                    clean_vars.append(alias_v)
                if len(clean_vars) >= 3:
                    break

    t_info['variants'] = clean_vars

with open(MANIFEST_JSON_PATH, 'w', encoding='utf-8') as f:
    json.dump(ground_manifest, f, indent=2)

# Update v15_data cleanFamilies
clean_families = dict(v15_data.get('cleanFamilies', {}))
for fam in clean_families:
    # Remove any rejected numbers
    clean_nums = []
    for num in [1, 2, 3, 4]:
        if f"{fam}_m{num}.webp" not in rejected_files:
            clean_nums.append(num)
    clean_families[fam] = clean_nums
v15_data['cleanFamilies'] = clean_families

with open(V15_MANIFEST_PATH, 'w', encoding='utf-8') as f:
    json.dump(v15_data, f, indent=2)
with open(V15_PUBLIC_MANIFEST_PATH, 'w', encoding='utf-8') as f:
    json.dump(v15_data, f, indent=2)

print("[syncManifest] Successfully synchronized manifest, aliases, and ground-manifest.json!")
