const fs = require('fs');
const readline = require('readline');
const transcriptPath = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\5f45876c-f5a0-489a-9c9a-51feae0b2915\\.system_generated\\logs\\transcript_full.jsonl';
const rl = readline.createInterface({ input: fs.createReadStream(transcriptPath) });
let capturing = false;
let userCount = 0;
rl.on('line', line => {
  if (line.includes('"type":"USER_INPUT"')) {
    userCount++;
    console.log(`\n=== USER INPUT #${userCount} ===`);
    const obj = JSON.parse(line);
    console.log(obj.content);
  }
  if (line.includes('apakah pada plan master apakah sudah ada intruksi bagaimana mengelolah gambar p0 dan p1 ini')) {
    capturing = true;
  }
  if (capturing && line.includes('"type":"PLANNER_RESPONSE"')) {
    const obj = JSON.parse(line);
    console.log('\n=== AGENT RESPONSE ===');
    console.log(obj.content ? obj.content.substring(0, 1500) : 'Tool calls only');
    capturing = false;
  }
});
