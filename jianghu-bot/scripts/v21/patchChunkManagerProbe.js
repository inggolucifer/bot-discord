const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../../web-dashboard/src/lib/chunkManager.ts');
let code = fs.readFileSync(file, 'utf8');

if (!code.includes("import { perfProbe } from '@/lib/perfProbe';")) {
  code = code.replace(
    "import { renderChunkGroundBitmap, renderChunkGridBitmap } from '@/lib/groundRenderer';",
    "import { renderChunkGroundBitmap, renderChunkGridBitmap } from '@/lib/groundRenderer';\nimport { perfProbe } from '@/lib/perfProbe';"
  );
  code = code.replace(
    "this.chunkBitmaps.delete(key);\n        this.unpackedChunks.delete(key);",
    "perfProbe.count('chunks:disposed');\n        this.chunkBitmaps.delete(key);\n        this.unpackedChunks.delete(key);"
  );
  code = code.replace(
    "public ingestStaticChunk(chunk: StaticChunkData) {",
    "public ingestStaticChunk(chunk: StaticChunkData) {\n    perfProbe.count('chunks:loaded');"
  );
  fs.writeFileSync(file, code, 'utf8');
  console.log('[PATCH] Berhasil menyisipkan perfProbe ke chunkManager.ts!');
} else {
  console.log('[PATCH] chunkManager.ts sudah memiliki perfProbe.');
}
