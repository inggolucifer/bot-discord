const fs = require('fs');
const path = require('path');

const FILE_PATH = path.resolve(__dirname, '../../web-dashboard/src/lib/groundRenderer.ts');
let code = fs.readFileSync(FILE_PATH, 'utf8');

// 1. Add import
if (!code.includes("import { perfProbe } from './perfProbe';")) {
  code = code.replace(
    "import { groundTextures } from './groundTextures';",
    "import { groundTextures } from './groundTextures';\r\nimport { perfProbe } from './perfProbe';"
  );
}

// 2. Road blur and getImageData/putImageData
code = code.replace(
  `  gB.clearRect(0, 0, W, W);\r
  gB.filter = 'blur(1.4px)';\r
  gB.drawImage(scratchR.canvas, 0, 0);\r
  gB.filter = 'none';\r
\r
  // 2) World domain-warp sampling\r
  const srcImgData = gB.getImageData(0, 0, W, W);`,
  `  gB.clearRect(0, 0, W, W);\r
  perfProbe.measure('ground:roadBlur', () => {\r
    gB.filter = 'blur(1.4px)';\r
    gB.drawImage(scratchR.canvas, 0, 0);\r
    gB.filter = 'none';\r
  });\r
\r
  // 2) World domain-warp sampling\r
  perfProbe.count('ground:getImageData');\r
  const srcImgData = perfProbe.measure('ground:getImageDataMs', () => gB.getImageData(0, 0, W, W));`
);

code = code.replace(
  `  scratchRW.ctx.putImageData(dstImgData, 0, 0);`,
  `  perfProbe.count('ground:putImageData');\r
  perfProbe.measure('ground:putImageDataMs', () => scratchRW.ctx.putImageData(dstImgData, 0, 0));`
);

// 3. Rim blur
code = code.replace(
  `  sCtx.filter = 'blur(1.5px)';\r
  sCtx.drawImage(\r
    scratchMB2.canvas,\r
    BORDER * tileSize,\r
    BORDER * tileSize,\r
    canvasWidth,\r
    canvasHeight,\r
    0,\r
    0,\r
    canvasWidth,\r
    canvasHeight\r
  );\r
  sCtx.filter = 'none';`,
  `  perfProbe.measure('ground:rimBlur', () => {\r
    sCtx.filter = 'blur(1.5px)';\r
    sCtx.drawImage(\r
      scratchMB2.canvas,\r
      BORDER * tileSize,\r
      BORDER * tileSize,\r
      canvasWidth,\r
      canvasHeight,\r
      0,\r
      0,\r
      canvasWidth,\r
      canvasHeight\r
    );\r
    sCtx.filter = 'none';\r
  });`
);

// 4. Transition blur & putImageData
code = code.replace(
  `    ctxM.putImageData(imgData, 0, 0);`,
  `    perfProbe.count('ground:putImageData');\r
    perfProbe.measure('ground:putImageDataMs', () => ctxM.putImageData(imgData, 0, 0));`
);

code = code.replace(
  `      ctxMB2.filter = \`blur(\${blurPx.toFixed(1)}px)\`;\r
      ctxMB2.drawImage(scratchMB.canvas, 0, 0);\r
      ctxMB2.filter = 'none';`,
  `      perfProbe.measure('ground:transitionBlur', () => {\r
        ctxMB2.filter = \`blur(\${blurPx.toFixed(1)}px)\`;\r
        ctxMB2.drawImage(scratchMB.canvas, 0, 0);\r
        ctxMB2.filter = 'none';\r
      });`
);

// 5. Variant blur & putImageData
code = code.replace(
  `          ctxVM.putImageData(vmImgData, 0, 0);`,
  `          perfProbe.count('ground:putImageData');\r
          perfProbe.measure('ground:putImageDataMs', () => ctxVM.putImageData(vmImgData, 0, 0));`
);

code = code.replace(
  `          ctxVMB.filter = \`blur(\${(tileSize * 0.9).toFixed(1)}px)\`; // ~50px organic soft blend\r
          ctxVMB.drawImage(\r
            scratchVM.canvas,\r
            0,\r
            0,\r
            V_GRID_DIM,\r
            V_GRID_DIM,\r
            -padPx,\r
            -padPx,\r
            canvasWidth + 2 * padPx,\r
            canvasHeight + 2 * padPx\r
          );\r
          ctxVMB.filter = 'none';`,
  `          perfProbe.measure('ground:variantBlur', () => {\r
            ctxVMB.filter = \`blur(\${(tileSize * 0.9).toFixed(1)}px)\`; // ~50px organic soft blend\r
            ctxVMB.drawImage(\r
              scratchVM.canvas,\r
              0,\r
              0,\r
              V_GRID_DIM,\r
              V_GRID_DIM,\r
              -padPx,\r
              -padPx,\r
              canvasWidth + 2 * padPx,\r
              canvasHeight + 2 * padPx\r
            );\r
            ctxVMB.filter = 'none';\r
          });`
);

// 6. Ancient strata putImageData
code = code.replace(
  `  scratch.ctx.putImageData(imgData, 0, 0);`,
  `  perfProbe.count('ground:putImageData');\r
  perfProbe.measure('ground:putImageDataMs', () => scratch.ctx.putImageData(imgData, 0, 0));`
);

// 7. Total elapsed measurement
code = code.replace(
  `  const elapsed = performance.now() - t0;\r
  perfRing.push(elapsed);`,
  `  const elapsed = performance.now() - t0;\r
  perfProbe.mark('ground:buildChunkBitmap', elapsed);\r
  perfRing.push(elapsed);`
);

fs.writeFileSync(FILE_PATH, code, 'utf8');
console.log('[PATCH] Berhasil menyisipkan perfProbe ke groundRenderer.ts!');
