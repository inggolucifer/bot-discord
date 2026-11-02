import subprocess, json

points = [
    {"id": "P11_xueshan", "type": "snow", "with": "P11_xueshan.png", "noroad": "P11_xueshan_noroad.png", "zoom": 1.4},
    {"id": "snow_rand_1", "type": "snow", "with": "snow_rand_1.png", "noroad": "snow_rand_1_noroad.png", "zoom": 1.4},
    {"id": "snow_rand_2", "type": "snow", "with": "snow_rand_2.png", "noroad": "snow_rand_2_noroad.png", "zoom": 1.4},
    {"id": "snow_rand_3", "type": "snow", "with": "snow_rand_3.png", "noroad": "snow_rand_3_noroad.png", "zoom": 1.4},
    {"id": "P01_xingcun", "type": "stone", "with": "P01_xingcun.png", "noroad": "P01_xingcun_noroad.png", "zoom": 1.4},
    {"id": "P02_xingcun_cross", "type": "stone", "with": "P02_xingcun_cross.png", "noroad": "P02_xingcun_cross_noroad.png", "zoom": 1.4},
    {"id": "P13_road_h", "type": "stone", "with": "P13_road_h.png", "noroad": "P13_road_h_noroad.png", "zoom": 1.4},
    {"id": "P14_road_v", "type": "stone", "with": "P14_road_v.png", "noroad": "P14_road_v_noroad.png", "zoom": 1.4},
]

results = {}
all_pass = True

for p in points:
    cmd = [
        "python",
        "jianghu-bot/scripts/v18/verify_v18.py",
        "road",
        f"jianghu-bot/review/shots_v19/{p['with']}",
        f"jianghu-bot/review/shots_v19/{p['noroad']}",
        str(p['zoom'])
    ]
    res_str = subprocess.check_output(cmd, text=True).strip()
    data = json.loads(res_str)
    
    # Gate validation
    # holes == 0
    # lobeRatio <= 1.35
    # widthCV <= 0.18
    # If snow: dL in [-20, -10], sat <= 0.12, BminusR in [0, 18]
    holes_ok = (data.get('holes') == 0)
    cv_ok = (data.get('widthCV', 99) <= 0.18)
    lobe_ok = (data.get('lobeRatio', 99) <= 1.35)
    
    if p['type'] == 'snow':
        dl_ok = (-20.0 <= data.get('dL', 0) <= -10.0)
        sat_ok = (data.get('sat', 99) <= 0.12)
        bmr_ok = (0.0 <= data.get('BminusR', -99) <= 18.0)
        point_pass = (holes_ok and cv_ok and lobe_ok and dl_ok and sat_ok and bmr_ok)
    else:
        point_pass = (holes_ok and cv_ok and lobe_ok)
        
    data['gate_pass'] = point_pass
    data['type'] = p['type']
    results[p['id']] = data
    if not point_pass:
        all_pass = False
        print(f"FAIL: {p['id']} -> {data}")
    else:
        print(f"PASS: {p['id']} -> {data}")

print(f"\nOVERALL RESULT: {'ALL PASS (100%)' if all_pass else 'SOME FAILED'}")

with open('jianghu-bot/review/v19_raw/f2_snow_road.json', 'w') as f:
    json.dump({
        "all_pass": all_pass,
        "results": results
    }, f, indent=2)

print("Saved to jianghu-bot/review/v19_raw/f2_snow_road.json")
