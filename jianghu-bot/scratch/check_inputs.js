const fs = require('fs');
const readline = require('readline');
const transcriptPath = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\5f45876c-f5a0-489a-9c9a-51feae0b2915\\.system_generated\\logs\\transcript_full.jsonl';
const rl = readline.createInterface({ input: fs.createReadStream(transcriptPath) });
rl.on('line', line => {
  if (line.includes('"type":"USER_INPUT"')) {
    const obj = JSON.parse(line);
    if (obj.step_index >= 9700 && obj.step_index <= 9870) {
      console.log('Step:', obj.step_index, 'Time:', obj.created_at);
      console.log('Content:', obj.content);
    }
  }
});
