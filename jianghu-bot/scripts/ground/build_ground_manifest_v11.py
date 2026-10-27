"""
scripts/ground/build_ground_manifest_v11.py
Builds public/assets/ground/ground-manifest.json v2 mapping all 48 canonical world terrains
to their respective families without fallbacks, with B11 family splits (lake, river, cliff, glacier).
"""

import os
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "../.."))
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "web-dashboard", "public", "assets", "ground", "ground-manifest.json")

from ingest_ai_ground import FAMILY_SPECS

# 48 canonical terrains and their authoritative V11 families
TERRAIN_MAPPINGS = {
    # Plains & Flora
    "plains":           "plains",
    "meadow":           "meadow",
    "farmland":         "farmland",
    "herb_field":       "herb_field",
    "forest":           "forest_floor",
    "spirit_wood":      "forest_floor",
    "bamboo_forest":    "bamboo_floor",
    "bamboo_grove":     "bamboo_floor",
    "dead_wood":        "dead_wood",
    
    # Mountain & Rock
    "hill":             "hill",
    "mountain_rock":    "rock_ground",
    "mountain":         "rock_ground",
    "cliff":            "cliff",            # B11 split from rock_ground
    "azure_mountain":   "rock_ground",
    "mountain_peak":    "rock_ground",
    "mountain_pass":    "mountain_pass",
    "sword_gorge_pass": "mountain_pass",
    "canyon_floor":     "canyon_floor",
    
    # Arid & Desert
    "desert_sand":      "desert_sand",
    "dune":             "dune",
    "oasis":            "oasis",
    
    # Cold & Ice
    "snow":             "snow",
    "ice_crack":        "ice_crack",
    "glacier":          "glacier",          # B11 split from ice_crack
    
    # Wetland & Corrupted
    "swamp":            "swamp",
    "pond_lotus":       "swamp",
    "river_shallow":    "river",            # B11 split from swamp
    "demonic_swamp":    "demonic_swamp",
    "poison_pool":      "poison_pool",
    "miasma_waste":     "miasma_waste",
    
    # Cataclysm & Mystic
    "battlefield_ash":  "battlefield_ash",
    "volcanic":         "volcanic",
    "basalt":           "volcanic",
    "lava_flow":        "lava_flow",
    "crater":           "crater",
    "lightning_scar":   "lightning_scar",
    "formation_tile":   "formation_tile",
    "ruin_floor":       "ruin_floor",
    "island_reef":      "island_reef",
    "sea_reef":         "island_reef",
    "abyss_edge":       "abyss_edge",
    
    # Civil & Road
    "settlement":       "settlement_floor",
    "road_stone":       "road_stone",
    
    # Water (B11 separated families)
    "ocean":            "ocean",
    "sea":              "ocean",
    "lake":             "lake",             # B11 split from ocean
    "lake_deep":        "lake",             # B11 split from ocean
    "river":            "river"             # B11 split from ocean
}

def build_manifest():
    assert len(TERRAIN_MAPPINGS) == 48, f"Expected 48 terrains, got {len(TERRAIN_MAPPINGS)}"
    
    terrains_dict = {}
    for terrain_key, fam in sorted(TERRAIN_MAPPINGS.items()):
        terrains_dict[terrain_key] = {
            "family": fam,
            "variants": [
                f"v11/{fam}_m1",
                f"v11/{fam}_m2",
                f"v11/{fam}_m3",
                f"v11/{fam}_m4"
            ]
        }
        
    families_dict = {}
    for fam, spec in sorted(FAMILY_SPECS.items()):
        families_dict[fam] = {
            "macros": [
                f"v11/{fam}_m1.webp",
                f"v11/{fam}_m2.webp",
                f"v11/{fam}_m3.webp",
                f"v11/{fam}_m4.webp"
            ],
            "macros_lq": [
                f"v11/{fam}_m1_lq.webp",
                f"v11/{fam}_m2_lq.webp",
                f"v11/{fam}_m3_lq.webp",
                f"v11/{fam}_m4_lq.webp"
            ],
            "detail": f"v11/{fam}_detail.png",
            "palette": {
                "base": spec["base"],
                "accent": spec["accent"]
            },
            "targetLuminance": spec["lum"],
            "maxRmsContrast": spec["max_rms"]
        }

    manifest = {
        "version": 2,
        "tileSizePx": 128,
        "macroSizePx": 1024,
        "macroCells": 8,
        "detailOpacity": 0.20,
        "terrains": terrains_dict,
        "families": families_dict
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"Generated ground-manifest.json v2 with {len(terrains_dict)} terrains and {len(families_dict)} families.")
    print(f"Saved to: {OUTPUT_PATH}")

if __name__ == "__main__":
    build_manifest()
