const fs = require('fs');
const readline = require('readline');
const transcriptPath = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\5f45876c-f5a0-489a-9c9a-51feae0b2915\\.system_generated\\logs\\transcript_full.jsonl';
const rl = readline.createInterface({ input: fs.createReadStream(transcriptPath) });
rl.on('line', line => {
  if (line.includes('"step_index":9828')) {
    const obj = JSON.parse(line);
    console.log(JSON.stringify(obj.tool_calls || obj.content, null, 2));
    process.exit(0);
  }
});
