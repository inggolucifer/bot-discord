#!/usr/bin/env python3
"""
scripts/v15/generateAliasV15.py
Generates ground-alias-v15.json ensuring every family has >= 3 clean variants.
"""

import os
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JIANGHU_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))

ALIAS_WORLD = os.path.join(JIANGHU_DIR, 'world-data/ground-alias-v15.json')
ALIAS_PUBLIC = os.path.join(JIANGHU_DIR, 'web-dashboard/public/assets/ground/ground-alias-v15.json')

alias_data = {
    'version': 'v15',
    'description': 'Ground aliasing for families with < 3 clean variants to ensure variety and eliminate rejected macro textures',
    'aliases': {
        'forest_floor': [
            'v11/meadow_m1',
            'v11/meadow_m4'
        ],
        'glacier': [
            'v11/snow_m2',
            'v11/snow_m3'
        ],
        'oasis': [
            'v11/meadow_m2',
            'v11/meadow_m4'
        ],
        'swamp': [
            'v11/demonic_swamp_m2',
            'v11/poison_pool_m2'
        ],
        'plains': [
            'v11/meadow_m1',
            'v11/meadow_m2',
            'v11/meadow_m4',
            'v11/forest_floor_m1',
            'v11/forest_floor_m2'
        ]
    }
}

with open(ALIAS_WORLD, 'w', encoding='utf-8') as f:
    json.dump(alias_data, f, indent=2)

with open(ALIAS_PUBLIC, 'w', encoding='utf-8') as f:
    json.dump(alias_data, f, indent=2)

print(f"[generateAliasV15] Saved ground-alias-v15.json to world-data and public/assets/ground/")
