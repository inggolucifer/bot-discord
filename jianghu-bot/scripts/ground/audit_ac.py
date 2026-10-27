import os, glob
import numpy as np
from PIL import Image

ground_dir = 'web-dashboard/public/assets/ground'
files = glob.glob(os.path.join(ground_dir, '*.webp'))
stats = []
for p in files:
    img = Image.open(p).convert('L')
    arr = np.array(img, dtype=float)
    sd = arr.std()
    mu = arr.mean()
    norm = arr - mu
    var = (norm ** 2).mean()
    lag = 54
    lagH = np.roll(norm, shift=-lag, axis=1)
    lagV = np.roll(norm, shift=-lag, axis=0)
    acH = (norm * lagH).mean() / (var + 1e-8)
    acV = (norm * lagV).mean() / (var + 1e-8)
    acMax = max(abs(acH), abs(acV))
    stats.append((os.path.basename(p), sd, acMax))

avg_ac = sum(s[2] for s in stats) / len(stats)
avg_sd = sum(s[1] for s in stats) / len(stats)
print(f"{avg_ac:.4f},{avg_sd:.2f}")
