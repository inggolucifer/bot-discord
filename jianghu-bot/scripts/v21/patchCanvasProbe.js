const fs = require('fs');
const path = require('path');

const FILE_PATH = path.resolve(__dirname, '../../web-dashboard/src/components/map/WorldCanvas.tsx');
let code = fs.readFileSync(FILE_PATH, 'utf8');

// 1. Add import
if (!code.includes("import { perfProbe } from '@/lib/perfProbe';")) {
  code = code.replace(
    "import { chunkManager, MAX_CHUNK_X, MAX_CHUNK_Y, CHUNK_SIZE } from '@/lib/chunkManager';",
    "import { chunkManager, MAX_CHUNK_X, MAX_CHUNK_Y, CHUNK_SIZE } from '@/lib/chunkManager';\nimport { perfProbe } from '@/lib/perfProbe';"
  );
}

// 2. Ground rendering probe
code = code.replace(
  `      // ----------------------------------------------------------------------\n      // L1: CHUNK GROUND BITMAPS (G0-G3 & Static G4 Autotiles)\n      // ----------------------------------------------------------------------`,
  `      // ----------------------------------------------------------------------\n      // L1: CHUNK GROUND BITMAPS (G0-G3 & Static G4 Autotiles)\n      // ----------------------------------------------------------------------\n      const tGround0 = performance.now();`
);

code = code.replace(
  `      // ----------------------------------------------------------------------\n      // L3 & L4: Y-SORTED OBJECTS & ENTITIES (Frustum Culling & 1,500 Sprite Budget - Fase G)\n      // ----------------------------------------------------------------------`,
  `      perfProbe.mark('render:ground', performance.now() - tGround0);\n\n      // ----------------------------------------------------------------------\n      // L3 & L4: Y-SORTED OBJECTS & ENTITIES (Frustum Culling & 1,500 Sprite Budget - Fase G)\n      // ----------------------------------------------------------------------\n      const tObj0 = performance.now();`
);

// 3. Object rendering end & overlay start
code = code.replace(
  `      // ----------------------------------------------------------------------\n      // L5: KABUT ATMOSFER (Cinematic Edge Vignette - Crystal Clear Center)\n      // ----------------------------------------------------------------------`,
  `      perfProbe.mark('render:objects', performance.now() - tObj0);\n      const tOverlay0 = performance.now();\n\n      // ----------------------------------------------------------------------\n      // L5: KABUT ATMOSFER (Cinematic Edge Vignette - Crystal Clear Center)\n      // ----------------------------------------------------------------------`
);

// 4. Marker & player probe
code = code.replace(
  `      // ----------------------------------------------------------------------\n      // L7: MARKER UI (NPC Badges, Monster Rings, Path Glow, Player Frame)\n      // ----------------------------------------------------------------------`,
  `      // ----------------------------------------------------------------------\n      // L7: MARKER UI (NPC Badges, Monster Rings, Path Glow, Player Frame)\n      // ----------------------------------------------------------------------\n      const tPlayer0 = performance.now();`
);

code = code.replace(
  `      // ----------------------------------------------------------------------\n      // L8: WEATHER OVERLAY (Rain, Snow, Miasma)\n      // ----------------------------------------------------------------------`,
  `      perfProbe.mark('render:players', performance.now() - tPlayer0);\n\n      // ----------------------------------------------------------------------\n      // L8: WEATHER OVERLAY (Rain, Snow, Miasma)\n      // ----------------------------------------------------------------------`
);

// 5. End of frame measurement before requestAnimationFrame
code = code.replace(
  `      animationFrameId = requestAnimationFrame(render);\n    };\n\n    render();`,
  `      perfProbe.mark('render:overlay', performance.now() - tOverlay0);\n      const frameTotal = performance.now() - frameStartTime;\n      perfProbe.mark('raf:frameTotal', frameTotal);\n      perfProbe.recordFrame();\n\n      animationFrameId = requestAnimationFrame(render);\n    };\n\n    render();`
);

fs.writeFileSync(FILE_PATH, code, 'utf8');
console.log('[PATCH] Berhasil menyisipkan perfProbe ke WorldCanvas.tsx!');
