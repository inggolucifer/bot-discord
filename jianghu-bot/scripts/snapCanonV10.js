// Usage (ROOT): node scripts/snapCanonV10.js   -> writes world-data/grid-canon-v10.json
// Needs world-data/sprite-bbox.json (python3 scripts/computeBBox.py) and world-data/scale-canon.json
const fs=require('fs');const canon=JSON.parse(fs.readFileSync('world-data/scale-canon.json'));const bbox=JSON.parse(fs.readFileSync('world-data/sprite-bbox.json'));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const isHouse=id=>/^hut_|village_house|cottage|shack|hermitage/.test(id);
function classify(id,e,bb){
  const cat=e.category||'misc';const cw=bb.contentW,aspect=bb.contentH/bb.contentW,ov=e.visualW||1;
  let cls,fw,fh,vw,mode=(typeof e.collision==='string'?e.collision:(e.collision&&e.collision.w===0&&e.collision.h===0?'none':'solid'));
  if(isHouse(id)){cls='house';vw=1;fw=1;fh=1;mode='solid'}
  else if(cat==='tree'){cls=cw<200?'tree_s':'tree_l';vw=cw<200?1:2;fw=vw;fh=1;mode='soft'}
  else if(cat==='bamboo'){cls=cw<190?'bamboo_s':'bamboo_l';vw=cw<190?1:2;fw=vw;fh=1;mode='soft'}
  else if(cat==='rock'){vw=ov<=1.6?1:(ov<=3.6?2:3);cls='rock_'+vw;fw=vw;fh=1;mode='solid'}
  else if(cat==='nature'){vw=ov<=2.5?1:(ov<=4.5?2:3);cls='nature_'+vw;fw=vw;fh=1;mode=mode==='solid'?'solid':'soft'}
  else if(cat==='resource'||cat==='relic'){cls='node';vw=1;fw=1;fh=1;mode='solid'}
  else if(cat==='marker'){cls='marker';vw=1;fw=1;fh=1;mode='none'}
  else if(cat==='mountain'){vw=clamp(Math.round(ov*0.6),2,6);fw=vw;fh=Math.max(1,Math.ceil(vw/2));cls='mountain_'+vw;mode='solid'}
  else if(cat==='landmark'){vw=clamp(Math.round(ov*0.8),6,9);fw=vw;fh=Math.ceil(vw/2);cls='landmark';mode='solid'}
  else if(cat==='water_scene'){vw=clamp(Math.round(ov*0.8),3,6);fw=vw;fh=Math.ceil(vw/2);cls='water_scene';mode='solid'}
  else if(cat==='building'){vw=ov<=2.5?1:(ov<=4.5?2:(ov<=6.5?3:4));if(/manor|library|hall|auction|foundry|city|gate|sect|pagoda|castle|palace|warehouse|silo|tavern|inn|tower/.test(id))vw=Math.max(vw,3);fw=vw;fh=Math.max(1,Math.round(vw*0.6));cls='building_'+vw;mode='solid'}
  else{cls='misc';vw=clamp(Math.round(ov),1,3);fw=vw;fh=1}
  const vh=+(vw*aspect).toFixed(3);
  return{class:cls,fw,fh,vw,vh,rowsAbove:Math.max(0,Math.ceil(vh-fh-0.05)),mode,
    bbox:{x0:bb.x0,y0:bb.y0,x1:bb.x1,y1:bb.y1},srcW:bb.srcW,srcH:bb.srcH,category:cat}}
const out={version:10,rule:'left=x+(fw-vw)/2 ; contentBottom=y+fh ; contentWidth=vw cells ; contentHeight=vh cells',frames:{}};let miss=0;
for(const[id,e]of Object.entries(canon)){if(e.category==='autotile')continue;const bb=bbox[id];if(!bb){miss++;continue}out.frames[id]=classify(id,e,bb)}
// frames in atlas but not in canon (e.g. new highres): classify from bbox only
for(const[id,bb]of Object.entries(bbox)){if(out.frames[id]||canon[id])continue;const cat=/^tree_/.test(id)?'tree':/^mt_|^nature_karst/.test(id)?'mountain':/^bamboo/.test(id)?'bamboo':/^rock_/.test(id)?'rock':null;if(!cat)continue;out.frames[id]=classify(id,{category:cat,visualW:bb.contentW/128},bb)}
fs.writeFileSync('world-data/grid-canon-v10.json',JSON.stringify(out,null,1));
const h={};for(const f of Object.values(out.frames))h[f.class]=(h[f.class]||0)+1;console.log('frames',Object.keys(out.frames).length,'noBBox',miss);console.log(JSON.stringify(h));
