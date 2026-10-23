const fs = require('fs');
const lines = fs.readFileSync('review/placeholder_report.csv', 'utf8').split('\n');
console.log('Suspects matching target categories:');
for (const line of lines.slice(1)) {
  if (!line.includes('SUSPECT')) continue;
  const parts = line.split(',');
  const id = parts[0];
  const page = parts[1];
  console.log(`  ${id} (${page}) -> ${parts[parts.length - 1]}`);
}
