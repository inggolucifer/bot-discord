import json

with open("review/v13_ground_audit.json") as f:
    data = json.load(f)

lines = []
lines.append("# V13 Ground Texture Art Status & User Needs")
lines.append(f"Total Macros: {data['totalMacros']}, Clean: {data['cleanMacros']}, Dirty: {data['dirtyMacros']}\n")

lines.append("## Status per Family")
for fam, info in sorted(data["familySummary"].items()):
    status = "OK (>= 2 clean)" if info["clean"] >= 2 else "NEEDS USER ART (< 2 clean)"
    lines.append(f"- **{fam}**: {info['clean']}/{info['total']} clean (Variants: {info['variants']}) -> {status}")

dirty_macros = [m for m in data["macros"].values() if not m["clean"]]
if dirty_macros:
    lines.append("\n## Flagged Dirty Macros (Filtered from Runtime)")
    for m in dirty_macros:
        lines.append(f"- `{m['file']}`: {', '.join(m['reasons'])} (path={m['pathScore']}, obj={m['objectScore']}, lattice={m['latticeScore']})")
else:
    lines.append("\nNo dirty macros flagged.")

with open("review/v13_needs_user_art.md", "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")

print(f"Generated review/v13_needs_user_art.md ({len(dirty_macros)} dirty macros listed)")
