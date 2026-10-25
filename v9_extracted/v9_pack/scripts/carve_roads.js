// Usage: node scripts/carve_roads.js <fromX,fromY> <toX,toY> [outJson]
// A* on a 4-tile grid; solid cells allowed at cost 25 (=> short bridge/causeway), walkable cost 1.
// Prints polyline + how many cells are solid (those need 'road_stone' override + bridge object).
const P=process.cwd()+'/';const pe=require(P+'utils/proceduralWorldEngine.js');
const S=4,N=1250;const [fx,fy]=process.argv[2].split(',').map(Number),[tx,ty]=process.argv[3].split(',').map(Number);
const cache=new Map();const solid=(i,j)=>{const k=j*N+i;let v=cache.get(k);if(v===undefined){v=pe.getTileAt(i*S+2,j*S+2).isSolid?1:0;cache.set(k,v)}return v};
const sI=Math.floor(fx/S),sJ=Math.floor(fy/S),gI=Math.floor(tx/S),gJ=Math.floor(ty/S);
const open=[[0,sI,sJ]],g=new Map([[sJ*N+sI,0]]),from=new Map();const h=(i,j)=>Math.abs(i-gI)+Math.abs(j-gJ);
while(open.length){open.sort((a,b)=>a[0]-b[0]);const[,i,j]=open.shift();if(i===gI&&j===gJ)break;
 for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const ni=i+dx,nj=j+dy;if(ni<0||nj<0||ni>=N||nj>=N)continue;const c=g.get(j*N+i)+(solid(ni,nj)?25:1);const k=nj*N+ni;if(!g.has(k)||c<g.get(k)){g.set(k,c);from.set(k,j*N+i);open.push([c+h(ni,nj),ni,nj])}}}
const path=[];let k=gJ*N+gI;while(k!==undefined){path.push([(k%N)*S+2,Math.floor(k/N)*S+2,solid(k%N,Math.floor(k/N))]);k=from.get(k)}path.reverse();
const sol=path.filter(p=>p[2]).length;console.log('cells',path.length,'solidCells',sol,'approxTilesSolid',sol*S);
if(process.argv[4])require('fs').writeFileSync(process.argv[4],JSON.stringify({from:[fx,fy],to:[tx,ty],polyline:path.filter((_,i)=>i%2===0).map(p=>[p[0],p[1]]),solidCells:sol}));
