import os
from PIL import Image, ImageDraw, ImageFont

base_dir = 'jianghu-bot/review/v18_baseline'
v18_dir = 'jianghu-bot/review/shots_v18'
out_dir = 'jianghu-bot/review/shots_v18/compare'
os.makedirs(out_dir, exist_ok=True)

targets = [
    ('P04_farm', 'P04 Farmland: Dark Teal Pond -> Lush Emerald Rice Paddies'),
    ('P07_azure_west', 'P07 Azure Karst: High Moire & Seam Jump -> Organic Non-Periodic Strata'),
    ('P01_xingcun', 'P01 Xingcun Road: Bulbous Lobes & Holes -> Smooth Continuous Corridor'),
    ('P11_xueshan', 'P11 Xueshan Snow Road: Dark Pitch Path -> Natural Trodden Snow Contrast')
]

for pid, title in targets:
    p_before = os.path.join(base_dir, f'{pid}.png')
    p_after = os.path.join(v18_dir, f'{pid}.png')
    if not (os.path.exists(p_before) and os.path.exists(p_after)):
        print(f'Skipping {pid}, file missing')
        continue

    img_b = Image.open(p_before).convert('RGB')
    img_a = Image.open(p_after).convert('RGB')
    W, H = img_b.size # 1280, 720

    header_h = 50
    comp = Image.new('RGB', (W * 2, H + header_h), color=(18, 20, 24))
    comp.paste(img_b, (0, header_h))
    comp.paste(img_a, (W, header_h))

    draw = ImageDraw.Draw(comp)
    # Header labels
    draw.text((20, 15), f"BEFORE (V17 Baseline) — {title}", fill=(220, 160, 160))
    draw.text((W + 20, 15), f"AFTER (V18 Verified) — {title}", fill=(160, 220, 160))
    draw.line([(W, 0), (W, H + header_h)], fill=(60, 65, 75), width=2)

    out_path = os.path.join(out_dir, f'compare_{pid}.png')
    comp.save(out_path)
    print(f'Generated comparison: {out_path}')

print('All 4 comparisons generated successfully.')
