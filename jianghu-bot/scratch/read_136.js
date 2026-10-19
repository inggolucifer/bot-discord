const fs = require('fs');
const readline = require('readline');
const transcriptPath = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\5f45876c-f5a0-489a-9c9a-51feae0b2915\\.system_generated\\logs\\transcript_full.jsonl';
const rl = readline.createInterface({ input: fs.createReadStream(transcriptPath) });
let passed136 = false;
rl.on('line', line => {
  if (line.includes('apakah pada plan master apakah sudah ada intruksi bagaimana mengelolah gambar p0 dan p1 ini')) {
    passed136 = true;
    return;
  }
  if (passed136 && line.includes('"type":"PLANNER_RESPONSE"')) {
    const obj = JSON.parse(line);
    if (obj.content) {
      console.log('=== RESPONSE TO 136 ===');
      console.log(obj.content);
      process.exit(0);
    }
  }
});
