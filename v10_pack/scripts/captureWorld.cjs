const http=require('http');const R='/home/claude/bot-discord/jianghu-bot/';const cse=require(R+'utils/chunkStreamingEngine');const {chromium}=require('playwright');
const shots=JSON.parse(process.argv[2]);const outDir=process.argv[3];require('fs').mkdirSync(outDir,{recursive:true});
const server=http.createServer((req,res)=>{const o=req.headers.origin||'http://localhost:3000';res.setHeader('Access-Control-Allow-Origin',o);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization,X-Requested-With');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
 if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}
 if(req.url==='/api/auth/me'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({authenticated:false,user:null}))}
 if(req.method==='POST'&&req.url==='/api/world/chunks'){let b='';req.on('data',c=>b+=c);req.on('end',()=>{try{const d=JSON.parse(b||'{}');res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(cse.getStaticChunksBatch(d.chunks||[])))}catch(e){res.writeHead(500);res.end(JSON.stringify({error:e.message}))}});return}
 if(req.method==='GET'&&req.url.startsWith('/api/world/chunk/')){const p=req.url.split('/');const cx=+p[p.length-2],cy=+p[p.length-1];res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify(cse.getStaticChunk(cx,cy)))}
 res.writeHead(200,{'Content-Type':'application/json'});res.end('{"ok":true}')});
server.listen(3001,'127.0.0.1',async()=>{const br=await chromium.launch();const page=await br.newPage({viewport:{width:1280,height:720}});
 page.on('console',m=>{const t=m.text();if(/GROUND|error|Error/.test(t))console.log('[page]',t.slice(0,160))});
 for(const s of shots){await page.goto(`http://localhost:3000/world?debugCam=${s.x},${s.y},${s.zoom||1}`,{waitUntil:'domcontentloaded',timeout:90000});
  try{await page.waitForFunction(()=>window.__chunksReady===true,{timeout:25000})}catch(e){console.log('chunksReady timeout',s.name)}
  await page.evaluate(async()=>{if(window.atlasLoader)await window.atlasLoader.preloadCoreAtlases();if(window.groundTextures&&!window.groundTextures.ready)await window.groundTextures.load()}).catch(()=>{});
  await page.waitForTimeout(3500);await page.screenshot({path:`${outDir}/${s.name}.png`});console.log('shot',s.name,await page.evaluate(()=>window.groundTextures?window.groundTextures.ready:'no-gt'))}
 await br.close();server.close();process.exit(0)});
