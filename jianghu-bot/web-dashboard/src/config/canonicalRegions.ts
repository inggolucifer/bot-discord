/**
 * SSOT CANONICAL REGIONS & LANDMARKS
 * Generated from world-data/regions.json & anchors.json
 */

import { RegionTopology, WorldLandmark } from '@/types/world';

export const CANONICAL_REGIONS: (RegionTopology & { bounds: { minX: number; maxX: number; minY: number; maxY: number }; palette: any })[] = [
  {
    "regionSlug": "central_plains",
    "displayName": "Central Plains",
    "chineseName": "中原神州",
    "centerX": 2500,
    "centerY": 2550,
    "dangerTier": 1,
    "qiDensityModifier": 1,
    "tempRangeC": {
      "min": 18,
      "max": 26
    },
    "bounds": {
      "minX": 1800,
      "maxX": 3200,
      "minY": 2000,
      "maxY": 3100
    },
    "lawAffinities": [
      "righteous_heavenly_merit",
      "righteous_pure_yang"
    ],
    "resourceTags": [
      "basic_wood",
      "plain_herb",
      "iron_ore",
      "merit_crystal"
    ],
    "palette": {
      "primary": "#3a5f38",
      "accent": "#d4b16a",
      "terrainColor": "#4d7348"
    },
    "description": ""
  },
  {
    "regionSlug": "nine_springs_delta",
    "displayName": "Nine Springs Delta",
    "chineseName": "九泉三角洲",
    "centerX": 2400,
    "centerY": 2450,
    "dangerTier": 1,
    "qiDensityModifier": 1.2,
    "tempRangeC": {
      "min": 19,
      "max": 25
    },
    "bounds": {
      "minX": 2200,
      "maxX": 2600,
      "minY": 2350,
      "maxY": 2550
    },
    "lawAffinities": [
      "element_qingdi_wood",
      "element_azure_water"
    ],
    "resourceTags": [
      "lotus_seed",
      "river_clay",
      "freshwater_pearl",
      "medicinal_sprout"
    ],
    "palette": {
      "primary": "#2d6a4f",
      "accent": "#74c69d",
      "terrainColor": "#40916c"
    },
    "description": ""
  },
  {
    "regionSlug": "azure_mountain_range",
    "displayName": "Azure Mountain Range",
    "chineseName": "苍峦山脉",
    "centerX": 2625,
    "centerY": 3350,
    "dangerTier": 3,
    "qiDensityModifier": 1.5,
    "tempRangeC": {
      "min": 2,
      "max": 14
    },
    "bounds": {
      "minX": 1450,
      "maxX": 3800,
      "minY": 3100,
      "maxY": 3600
    },
    "lawAffinities": [
      "righteous_sword_heart",
      "element_roc_wind"
    ],
    "resourceTags": [
      "spirit_bamboo",
      "azure_iron",
      "sword_shard",
      "frost_herb"
    ],
    "palette": {
      "primary": "#264653",
      "accent": "#2a9d8f",
      "terrainColor": "#3d5a80"
    },
    "description": ""
  },
  {
    "regionSlug": "northern_desolate",
    "displayName": "Northern Desolate",
    "chineseName": "极北荒原",
    "centerX": 2100,
    "centerY": 4300,
    "dangerTier": 4,
    "qiDensityModifier": 0.9,
    "tempRangeC": {
      "min": -25,
      "max": -5
    },
    "bounds": {
      "minX": 1000,
      "maxX": 3200,
      "minY": 3600,
      "maxY": 5000
    },
    "lawAffinities": [
      "element_azure_water",
      "body_tempering"
    ],
    "resourceTags": [
      "glacial_ice",
      "frost_lotus",
      "beast_fur",
      "pure_water_essence"
    ],
    "palette": {
      "primary": "#cad2c5",
      "accent": "#84a59d",
      "terrainColor": "#e0e1dd"
    },
    "description": ""
  },
  {
    "regionSlug": "thundersteppe",
    "displayName": "Thundersteppe",
    "chineseName": "雷暴草原",
    "centerX": 2300,
    "centerY": 4200,
    "dangerTier": 4,
    "qiDensityModifier": 1.4,
    "tempRangeC": {
      "min": -5,
      "max": 12
    },
    "bounds": {
      "minX": 1800,
      "maxX": 2800,
      "minY": 3800,
      "maxY": 4600
    },
    "lawAffinities": [
      "element_godthunder_light"
    ],
    "resourceTags": [
      "thunder_stone",
      "storm_grass",
      "lightning_core"
    ],
    "palette": {
      "primary": "#5c677d",
      "accent": "#ffd166",
      "terrainColor": "#4f5d75"
    },
    "description": ""
  },
  {
    "regionSlug": "godthunder_peaks",
    "displayName": "Godthunder Peaks",
    "chineseName": "神霄雷峰",
    "centerX": 3540,
    "centerY": 4500,
    "dangerTier": 5,
    "qiDensityModifier": 1.8,
    "tempRangeC": {
      "min": -15,
      "max": 5
    },
    "bounds": {
      "minX": 3200,
      "maxX": 3880,
      "minY": 4000,
      "maxY": 5000
    },
    "lawAffinities": [
      "element_godthunder_light"
    ],
    "resourceTags": [
      "divine_thunder_crystal",
      "celestial_essence"
    ],
    "palette": {
      "primary": "#3d348b",
      "accent": "#f72585",
      "terrainColor": "#4361ee"
    },
    "description": ""
  },
  {
    "regionSlug": "mirror_lake",
    "displayName": "Mirror Lake",
    "chineseName": "照月心湖",
    "centerX": 3400,
    "centerY": 3850,
    "dangerTier": 2,
    "qiDensityModifier": 1.6,
    "tempRangeC": {
      "min": 8,
      "max": 16
    },
    "bounds": {
      "minX": 3000,
      "maxX": 3800,
      "minY": 3600,
      "maxY": 4100
    },
    "lawAffinities": [
      "righteous_karmic_mirror",
      "element_azure_water"
    ],
    "resourceTags": [
      "mirror_water",
      "lotus_seed",
      "karma_sand"
    ],
    "palette": {
      "primary": "#1f7a8c",
      "accent": "#bfdbf7",
      "terrainColor": "#022b3a"
    },
    "description": ""
  },
  {
    "regionSlug": "beast_prairies",
    "displayName": "Beast Prairies",
    "chineseName": "万兽荒原",
    "centerX": 1400,
    "centerY": 3800,
    "dangerTier": 3,
    "qiDensityModifier": 1.1,
    "tempRangeC": {
      "min": 10,
      "max": 22
    },
    "bounds": {
      "minX": 1000,
      "maxX": 1800,
      "minY": 3400,
      "maxY": 4200
    },
    "lawAffinities": [
      "natal_beast"
    ],
    "resourceTags": [
      "beast_tendon",
      "spirit_horn",
      "savage_fang"
    ],
    "palette": {
      "primary": "#606c38",
      "accent": "#dda15e",
      "terrainColor": "#283618"
    },
    "description": ""
  },
  {
    "regionSlug": "western_sacred_desert",
    "displayName": "Western Sacred Desert",
    "chineseName": "西漠圣梵",
    "centerX": 750,
    "centerY": 2500,
    "dangerTier": 3,
    "qiDensityModifier": 1.1,
    "tempRangeC": {
      "min": 25,
      "max": 42
    },
    "bounds": {
      "minX": 0,
      "maxX": 1500,
      "minY": 1500,
      "maxY": 3500
    },
    "lawAffinities": [
      "righteous_heavenly_merit",
      "body_tempering"
    ],
    "resourceTags": [
      "golden_sand",
      "solar_essence",
      "cactus_resin",
      "relic_scrap"
    ],
    "palette": {
      "primary": "#bc6c25",
      "accent": "#dda15e",
      "terrainColor": "#d4a373"
    },
    "description": ""
  },
  {
    "regionSlug": "western_gorge_labyrinth",
    "displayName": "Western Gorge Labyrinth",
    "chineseName": "断魂绝峡",
    "centerX": 500,
    "centerY": 1500,
    "dangerTier": 4,
    "qiDensityModifier": 1.3,
    "tempRangeC": {
      "min": 22,
      "max": 38
    },
    "bounds": {
      "minX": 0,
      "maxX": 1000,
      "minY": 1000,
      "maxY": 2000
    },
    "lawAffinities": [
      "body_tempering"
    ],
    "resourceTags": [
      "iron_bone_stone",
      "echo_crystal",
      "amber_fossil"
    ],
    "palette": {
      "primary": "#7f4f24",
      "accent": "#936639",
      "terrainColor": "#a68a64"
    },
    "description": ""
  },
  {
    "regionSlug": "hermit_highlands",
    "displayName": "Hermit Highlands",
    "chineseName": "孤云隐岭",
    "centerX": 1200,
    "centerY": 4400,
    "dangerTier": 2,
    "qiDensityModifier": 1.5,
    "tempRangeC": {
      "min": 5,
      "max": 18
    },
    "bounds": {
      "minX": 800,
      "maxX": 1600,
      "minY": 4000,
      "maxY": 4800
    },
    "lawAffinities": [
      "righteous_karmic_mirror",
      "element_roc_wind"
    ],
    "resourceTags": [
      "cloud_mist_tea",
      "geothermal_water",
      "hermit_stone"
    ],
    "palette": {
      "primary": "#6d6875",
      "accent": "#b5838d",
      "terrainColor": "#588157"
    },
    "description": ""
  },
  {
    "regionSlug": "border_march",
    "displayName": "Border March",
    "chineseName": "千戍边关",
    "centerX": 2400,
    "centerY": 1925,
    "dangerTier": 2,
    "qiDensityModifier": 1.1,
    "tempRangeC": {
      "min": 16,
      "max": 24
    },
    "bounds": {
      "minX": 1500,
      "maxX": 3300,
      "minY": 1800,
      "maxY": 2050
    },
    "lawAffinities": [
      "righteous_sword_heart",
      "body_tempering"
    ],
    "resourceTags": [
      "banner_cloth",
      "rations",
      "arrowhead_iron",
      "war_horse_fur"
    ],
    "palette": {
      "primary": "#582f0e",
      "accent": "#7f4f24",
      "terrainColor": "#6f1d1b"
    },
    "description": ""
  },
  {
    "regionSlug": "lava_spine",
    "displayName": "Lava Spine",
    "chineseName": "赤焰脊地",
    "centerX": 1100,
    "centerY": 700,
    "dangerTier": 5,
    "qiDensityModifier": 1.7,
    "tempRangeC": {
      "min": 45,
      "max": 75
    },
    "bounds": {
      "minX": 600,
      "maxX": 1600,
      "minY": 200,
      "maxY": 1200
    },
    "lawAffinities": [
      "element_phoenix_fire"
    ],
    "resourceTags": [
      "magma_core",
      "obsidian_shard",
      "flame_lotus",
      "fire_jade"
    ],
    "palette": {
      "primary": "#9d0208",
      "accent": "#ffba08",
      "terrainColor": "#370617"
    },
    "description": ""
  },
  {
    "regionSlug": "venom_mire",
    "displayName": "Venom Mire",
    "chineseName": "绝命万毒沼",
    "centerX": 2600,
    "centerY": 900,
    "dangerTier": 4,
    "qiDensityModifier": 1.3,
    "tempRangeC": {
      "min": 24,
      "max": 34
    },
    "bounds": {
      "minX": 2200,
      "maxX": 3000,
      "minY": 400,
      "maxY": 1400
    },
    "lawAffinities": [
      "demonic_myriad_venom",
      "gu_master"
    ],
    "resourceTags": [
      "purple_toxin_moss",
      "viper_bile",
      "venom_fungus",
      "gu_sac"
    ],
    "palette": {
      "primary": "#5a189a",
      "accent": "#70e000",
      "terrainColor": "#240046"
    },
    "description": ""
  },
  {
    "regionSlug": "southern_demon_domain",
    "displayName": "Southern Demon Domain",
    "chineseName": "南疆九煞窟",
    "centerX": 2250,
    "centerY": 1200,
    "dangerTier": 4,
    "qiDensityModifier": 1.5,
    "tempRangeC": {
      "min": 26,
      "max": 36
    },
    "bounds": {
      "minX": 1500,
      "maxX": 3000,
      "minY": 600,
      "maxY": 1800
    },
    "lawAffinities": [
      "demonic_turbid_core",
      "demonic_blood_soul"
    ],
    "resourceTags": [
      "turbid_black_mud",
      "demon_bone",
      "miasma_pearl",
      "spirit_gu_egg"
    ],
    "palette": {
      "primary": "#3c096c",
      "accent": "#e0aaff",
      "terrainColor": "#10002b"
    },
    "description": ""
  },
  {
    "regionSlug": "crimson_battlefield",
    "displayName": "Crimson Battlefield",
    "chineseName": "血煞古战场",
    "centerX": 2900,
    "centerY": 600,
    "dangerTier": 5,
    "qiDensityModifier": 1.8,
    "tempRangeC": {
      "min": 18,
      "max": 30
    },
    "bounds": {
      "minX": 2400,
      "maxX": 3400,
      "minY": 200,
      "maxY": 1000
    },
    "lawAffinities": [
      "demonic_blood_soul"
    ],
    "resourceTags": [
      "blood_vial",
      "soul_dust",
      "rusted_weapon_shard"
    ],
    "palette": {
      "primary": "#6a040f",
      "accent": "#dc2f02",
      "terrainColor": "#370617"
    },
    "description": ""
  },
  {
    "regionSlug": "abyssal_scar",
    "displayName": "Abyssal Scar",
    "chineseName": "裂渊冥痕",
    "centerX": 1900,
    "centerY": 600,
    "dangerTier": 5,
    "qiDensityModifier": 2,
    "tempRangeC": {
      "min": 15,
      "max": 25
    },
    "bounds": {
      "minX": 1600,
      "maxX": 2200,
      "minY": 200,
      "maxY": 1000
    },
    "lawAffinities": [
      "demonic_abyssal_pact"
    ],
    "resourceTags": [
      "abyssal_scroll",
      "nether_shard",
      "fiend_blood"
    ],
    "palette": {
      "primary": "#03071e",
      "accent": "#9d0208",
      "terrainColor": "#000000"
    },
    "description": ""
  },
  {
    "regionSlug": "southern_plague_woods",
    "displayName": "Southern Plague Woods",
    "chineseName": "死疫腐林",
    "centerX": 3400,
    "centerY": 550,
    "dangerTier": 4,
    "qiDensityModifier": 1,
    "tempRangeC": {
      "min": 24,
      "max": 34
    },
    "bounds": {
      "minX": 3000,
      "maxX": 3800,
      "minY": 200,
      "maxY": 900
    },
    "lawAffinities": [
      "gu_master",
      "demonic_myriad_venom"
    ],
    "resourceTags": [
      "plague_spore",
      "festering_root",
      "black_fungus"
    ],
    "palette": {
      "primary": "#283618",
      "accent": "#dda15e",
      "terrainColor": "#132a13"
    },
    "description": ""
  },
  {
    "regionSlug": "bone_sea_coast",
    "displayName": "Bone Sea Coast",
    "chineseName": "白骨荒岸",
    "centerX": 1750,
    "centerY": 150,
    "dangerTier": 3,
    "qiDensityModifier": 1.2,
    "tempRangeC": {
      "min": 20,
      "max": 30
    },
    "bounds": {
      "minX": 0,
      "maxX": 3500,
      "minY": 0,
      "maxY": 300
    },
    "lawAffinities": [
      "demonic_blood_soul",
      "natal_beast"
    ],
    "resourceTags": [
      "whale_bone",
      "black_pearl",
      "drifting_wood",
      "ghost_crab"
    ],
    "palette": {
      "primary": "#343a40",
      "accent": "#adb5bd",
      "terrainColor": "#212529"
    },
    "description": ""
  },
  {
    "regionSlug": "spirit_wood_sea",
    "displayName": "Spirit Wood Sea",
    "chineseName": "青木灵海",
    "centerX": 3700,
    "centerY": 1300,
    "dangerTier": 3,
    "qiDensityModifier": 1.4,
    "tempRangeC": {
      "min": 20,
      "max": 28
    },
    "bounds": {
      "minX": 3200,
      "maxX": 4200,
      "minY": 800,
      "maxY": 1800
    },
    "lawAffinities": [
      "element_qingdi_wood",
      "natal_beast"
    ],
    "resourceTags": [
      "thousand_year_wood",
      "qingdi_sprout",
      "vitality_sap"
    ],
    "palette": {
      "primary": "#1b4332",
      "accent": "#52b788",
      "terrainColor": "#2d6a4f"
    },
    "description": ""
  },
  {
    "regionSlug": "mist_insect_valley",
    "displayName": "Mist Insect Valley",
    "chineseName": "瘴烟蛊谷",
    "centerX": 4400,
    "centerY": 1100,
    "dangerTier": 4,
    "qiDensityModifier": 1.2,
    "tempRangeC": {
      "min": 25,
      "max": 35
    },
    "bounds": {
      "minX": 4000,
      "maxX": 4800,
      "minY": 600,
      "maxY": 1600
    },
    "lawAffinities": [
      "gu_master",
      "demonic_myriad_venom"
    ],
    "resourceTags": [
      "gu_larva",
      "insect_shell",
      "gu_food_herb",
      "myriad_toxin"
    ],
    "palette": {
      "primary": "#403d39",
      "accent": "#eb5e28",
      "terrainColor": "#252422"
    },
    "description": ""
  },
  {
    "regionSlug": "formation_barrens",
    "displayName": "Formation Barrens",
    "chineseName": "八卦荒墟",
    "centerX": 3600,
    "centerY": 2200,
    "dangerTier": 3,
    "qiDensityModifier": 1.6,
    "tempRangeC": {
      "min": 15,
      "max": 25
    },
    "bounds": {
      "minX": 3200,
      "maxX": 4000,
      "minY": 1800,
      "maxY": 2600
    },
    "lawAffinities": [
      "righteous_formation_array"
    ],
    "resourceTags": [
      "runic_stone",
      "formation_plate",
      "array_flag_silk"
    ],
    "palette": {
      "primary": "#4a4e69",
      "accent": "#9a8c98",
      "terrainColor": "#22223b"
    },
    "description": ""
  },
  {
    "regionSlug": "sword_gorge",
    "displayName": "Sword Gorge",
    "chineseName": "万剑裂壑",
    "centerX": 3400,
    "centerY": 3250,
    "dangerTier": 4,
    "qiDensityModifier": 1.7,
    "tempRangeC": {
      "min": 10,
      "max": 20
    },
    "bounds": {
      "minX": 3200,
      "maxX": 3600,
      "minY": 3000,
      "maxY": 3500
    },
    "lawAffinities": [
      "righteous_sword_heart"
    ],
    "resourceTags": [
      "sword_intent_crystal",
      "ancient_broken_blade",
      "heavy_iron"
    ],
    "palette": {
      "primary": "#2b2d42",
      "accent": "#8d99ae",
      "terrainColor": "#14213d"
    },
    "description": ""
  },
  {
    "regionSlug": "ore_teeth_range",
    "displayName": "Ore Teeth Range",
    "chineseName": "玄铁齿脉",
    "centerX": 3625,
    "centerY": 2800,
    "dangerTier": 3,
    "qiDensityModifier": 1.2,
    "tempRangeC": {
      "min": 12,
      "max": 24
    },
    "bounds": {
      "minX": 3400,
      "maxX": 3850,
      "minY": 2400,
      "maxY": 3200
    },
    "lawAffinities": [
      "natal_artifact"
    ],
    "resourceTags": [
      "mithril_ore",
      "forge_fire_stone",
      "star_iron"
    ],
    "palette": {
      "primary": "#6c757d",
      "accent": "#ced4da",
      "terrainColor": "#495057"
    },
    "description": ""
  },
  {
    "regionSlug": "eastern_sea",
    "displayName": "Eastern Sea",
    "chineseName": "浩瀚东海",
    "centerX": 4400,
    "centerY": 2600,
    "dangerTier": 3,
    "qiDensityModifier": 1.3,
    "tempRangeC": {
      "min": 18,
      "max": 28
    },
    "bounds": {
      "minX": 3800,
      "maxX": 5000,
      "minY": 1200,
      "maxY": 4000
    },
    "lawAffinities": [
      "element_azure_water"
    ],
    "resourceTags": [
      "ocean_pearl",
      "deep_sea_coral",
      "azure_essence",
      "spirit_fish"
    ],
    "palette": {
      "primary": "#0077b6",
      "accent": "#90e0ef",
      "terrainColor": "#03045e"
    },
    "description": ""
  },
  {
    "regionSlug": "frostmoon_sea",
    "displayName": "Frostmoon Sea",
    "chineseName": "霜月幽海",
    "centerX": 4400,
    "centerY": 4500,
    "dangerTier": 4,
    "qiDensityModifier": 1.5,
    "tempRangeC": {
      "min": -10,
      "max": 5
    },
    "bounds": {
      "minX": 3800,
      "maxX": 5000,
      "minY": 4000,
      "maxY": 5000
    },
    "lawAffinities": [
      "element_azure_water",
      "righteous_karmic_mirror"
    ],
    "resourceTags": [
      "frost_whale_oil",
      "moon_ice_crystal",
      "polar_pearl"
    ],
    "palette": {
      "primary": "#003049",
      "accent": "#669bbc",
      "terrainColor": "#001219"
    },
    "description": ""
  },
  {
    "regionSlug": "floating_wind_isles",
    "displayName": "Floating Wind Isles",
    "chineseName": "驭风浮灵岛",
    "centerX": 4600,
    "centerY": 2700,
    "dangerTier": 5,
    "qiDensityModifier": 1.9,
    "tempRangeC": {
      "min": 10,
      "max": 20
    },
    "bounds": {
      "minX": 4200,
      "maxX": 5000,
      "minY": 2200,
      "maxY": 3200
    },
    "lawAffinities": [
      "element_roc_wind"
    ],
    "resourceTags": [
      "wind_feather",
      "sky_jade",
      "cyclone_core",
      "flying_stone"
    ],
    "palette": {
      "primary": "#48cae4",
      "accent": "#ade8f4",
      "terrainColor": "#0096c7"
    },
    "description": ""
  },
  {
    "regionSlug": "immortal_ruins_valley",
    "displayName": "Immortal Ruins Valley",
    "chineseName": "太虚陨仙谷",
    "centerX": 600,
    "centerY": 1000,
    "dangerTier": 4,
    "qiDensityModifier": 1.7,
    "tempRangeC": {
      "min": 15,
      "max": 25
    },
    "bounds": {
      "minX": 200,
      "maxX": 1000,
      "minY": 500,
      "maxY": 1500
    },
    "lawAffinities": [
      "righteous_formation_array",
      "natal_artifact"
    ],
    "resourceTags": [
      "ancient_talisman",
      "broken_immortal_mirror",
      "dao_stone"
    ],
    "palette": {
      "primary": "#582f0e",
      "accent": "#e9c46a",
      "terrainColor": "#264653"
    },
    "description": ""
  },
  {
    "regionSlug": "void_rift",
    "displayName": "Void Rift",
    "chineseName": "虚空裂隙",
    "centerX": 250,
    "centerY": 4750,
    "dangerTier": 6,
    "qiDensityModifier": 2.5,
    "tempRangeC": {
      "min": -50,
      "max": 100
    },
    "bounds": {
      "minX": 0,
      "maxX": 500,
      "minY": 4500,
      "maxY": 5000
    },
    "lawAffinities": [
      "demonic_abyssal_pact",
      "righteous_heavenly_merit"
    ],
    "resourceTags": [
      "cosmic_shard",
      "void_dust",
      "primordial_essence"
    ],
    "palette": {
      "primary": "#10002b",
      "accent": "#ff007f",
      "terrainColor": "#000000"
    },
    "description": ""
  }
] as any;

export const CANONICAL_LANDMARKS: WorldLandmark[] = [
  {
    "x": 2050,
    "y": 2650,
    "name": "Desa Xingcun",
    "chineseName": "杏村",
    "type": "village",
    "dangerTier": 1
  },
  {
    "x": 2400,
    "y": 2450,
    "name": "Dusun Mata Air Jernih",
    "chineseName": "清泉庄",
    "type": "hamlet",
    "dangerTier": 1
  },
  {
    "x": 2300,
    "y": 1950,
    "name": "Pos Perbatasan Qinghe",
    "chineseName": "青河关",
    "type": "outpost",
    "dangerTier": 2
  },
  {
    "x": 820,
    "y": 2220,
    "name": "Oase Shadi",
    "chineseName": "沙地绿洲",
    "type": "village",
    "dangerTier": 2
  },
  {
    "x": 3920,
    "y": 2700,
    "name": "Dermaga Donghai",
    "chineseName": "东海码头",
    "type": "port",
    "dangerTier": 2
  },
  {
    "x": 1900,
    "y": 1400,
    "name": "Desa Heiyan",
    "chineseName": "黑岩村",
    "type": "village",
    "dangerTier": 2
  },
  {
    "x": 1200,
    "y": 4200,
    "name": "Kemah Dataran Tinggi Petapa",
    "chineseName": "隐者高地营",
    "type": "hamlet",
    "dangerTier": 2
  },
  {
    "x": 2200,
    "y": 3340,
    "name": "Kaki Gunung Azure",
    "chineseName": "青峦驿站",
    "type": "outpost",
    "dangerTier": 2
  },
  {
    "x": 2700,
    "y": 2800,
    "name": "Tianjing",
    "chineseName": "天京",
    "type": "capital_city",
    "dangerTier": 1
  },
  {
    "x": 2350,
    "y": 2900,
    "name": "XiTong City",
    "chineseName": "析桐城",
    "type": "major_city",
    "dangerTier": 1
  },
  {
    "x": 2950,
    "y": 2600,
    "name": "Kota Fengyang",
    "chineseName": "鳳陽城",
    "type": "major_city",
    "dangerTier": 1
  },
  {
    "x": 2600,
    "y": 2200,
    "name": "Kota Luoyang Kecil",
    "chineseName": "小洛阳",
    "type": "major_city",
    "dangerTier": 1
  },
  {
    "x": 3100,
    "y": 2850,
    "name": "Desa Tiedao",
    "chineseName": "铁道村",
    "type": "village",
    "dangerTier": 1
  },
  {
    "x": 2120,
    "y": 4180,
    "name": "Pos Tundra Salju",
    "chineseName": "雪域驿站",
    "type": "outpost",
    "dangerTier": 3
  },
  {
    "x": 4350,
    "y": 2750,
    "name": "Pulau Penyu Raksasa",
    "chineseName": "巨龟岛",
    "type": "island",
    "dangerTier": 3
  },
  {
    "x": 2500,
    "y": 800,
    "name": "Benteng Gerbang Iblis",
    "chineseName": "魔门关卡",
    "type": "danger_zone",
    "dangerTier": 4
  },
  {
    "x": 2350,
    "y": 2420,
    "name": "Lembah Kabut Merah",
    "chineseName": "赤雾谷",
    "type": "danger_zone",
    "dangerTier": 3
  },
  {
    "x": 2200,
    "y": 3350,
    "name": "Sekte Awan Pedang",
    "chineseName": "剑云宗",
    "type": "sect",
    "dangerTier": 2
  },
  {
    "x": 2150,
    "y": 2800,
    "name": "Sekte Pedang Langit",
    "chineseName": "天剑宗",
    "type": "sect",
    "dangerTier": 1
  },
  {
    "x": 1400,
    "y": 4400,
    "name": "Kuil Lonceng Emas",
    "chineseName": "金钟古刹",
    "type": "sect",
    "dangerTier": 2
  },
  {
    "x": 1800,
    "y": 1100,
    "name": "Lembah Racun Bayangan",
    "chineseName": "影毒谷",
    "type": "sect",
    "dangerTier": 3
  },
  {
    "x": 3900,
    "y": 2850,
    "name": "Istana Giok Laut Timur",
    "chineseName": "东海碧玉宫",
    "type": "sect",
    "dangerTier": 3
  },
  {
    "x": 2400,
    "y": 4000,
    "name": "Sekte Petir Ilahiah",
    "chineseName": "神霄雷宗",
    "type": "sect",
    "dangerTier": 4
  },
  {
    "x": 650,
    "y": 2400,
    "name": "Sekte Pasir Suci",
    "chineseName": "圣漠天沙门",
    "type": "sect",
    "dangerTier": 2
  },
  {
    "x": 1950,
    "y": 4700,
    "name": "Istana Es Abadi",
    "chineseName": "玄冥万载冰宫",
    "type": "sect",
    "dangerTier": 4
  },
  {
    "x": 2100,
    "y": 2600,
    "name": "Gua Purba Bunga Aprikot",
    "chineseName": "杏花古洞",
    "type": "secret_realm",
    "dangerTier": 1
  },
  {
    "x": 2200,
    "y": 3360,
    "name": "Makam Kaisar Pedang Purba",
    "chineseName": "太古剑帝陵",
    "type": "secret_realm",
    "dangerTier": 3
  },
  {
    "x": 2400,
    "y": 4100,
    "name": "Reruntuhan Abadi Tianyuan",
    "chineseName": "天元古仙遗迹",
    "type": "secret_realm",
    "dangerTier": 4
  },
  {
    "x": 3880,
    "y": 2750,
    "name": "Sarang Naga Karang Timur",
    "chineseName": "东溟盘龙窟",
    "type": "secret_realm",
    "dangerTier": 3
  }
];
