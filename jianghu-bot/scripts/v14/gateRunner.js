/**
 * scripts/v14/gateRunner.js
 * Authoritative Gate Runner for Jianghu Bot V14
 * 
 * STRICT RULE:
 * This script runs every gate in scripts/v14/gates.json, measures actual values,
 * writes review/v14_gates.json (or review/v14_baseline_gates.json),
 * and generates review/report_v14.md strictly from the JSON output.
 * Handwritten PASS statuses are prohibited.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const GATES_CONFIG_PATH = path.resolve(__dirname, 'gates.json');

const isBaseline = process.argv.includes('--baseline');
const skipCommands = process.argv.includes('--skip-commands');

function getNestedValue(obj, dotPath) {
  if (!obj || !dotPath) return undefined;
  const parts = dotPath.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr === undefined || curr === null) return undefined;
    curr = curr[part];
  }
  return curr;
}

function evaluateGate(value, operator, target) {
  if (value === undefined || value === null) return false;
  if (operator === '>=') return Number(value) >= Number(target);
  if (operator === '<=') return Number(value) <= Number(target);
  if (operator === '==') return value === target || String(value) === String(target);
  if (operator === '!=') return value !== target;
  return false;
}

function runCommand(cmd) {
  console.log(`\n[gateRunner] Executing: ${cmd}`);
  try {
    const out = execSync(cmd, { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: 'pipe' });
    return { success: true, output: out };
  } catch (err) {
    console.error(`[gateRunner] Command failed: ${cmd}\n`, err.stdout || err.message);
    return { success: false, output: err.stdout || err.message };
  }
}

function main() {
  const gatesConfig = JSON.parse(fs.readFileSync(GATES_CONFIG_PATH, 'utf8'));
  console.log(`[gateRunner] Loaded ${gatesConfig.length} gates. Mode: ${isBaseline ? 'BASELINE' : 'V14'}`);

  const executedCommands = new Set();
  const gateResults = [];

  for (const gate of gatesConfig) {
    let cmd = gate.command;
    if (isBaseline && !cmd.includes('--baseline')) {
      cmd += ' --baseline';
    }

    if (!skipCommands && !executedCommands.has(cmd)) {
      runCommand(cmd);
      executedCommands.add(cmd);
    }

    let sourceRel = gate.sourceFile;
    if (isBaseline) {
      if (sourceRel.includes('selftest_results.json')) {
        sourceRel = 'review/v14_selftest_results.json';
      } else if (sourceRel.includes('v10_audit_summary.json')) {
        sourceRel = 'review/v10_audit_summary.json';
      } else if (sourceRel.includes('grid_contract_summary.json')) {
        sourceRel = 'review/grid_contract_summary.json';
      } else if (sourceRel.includes('ground-sources-v13.json')) {
        sourceRel = 'world-data/ground-sources-v13.json';
      } else {
        sourceRel = sourceRel.replace('v14_', 'v14_baseline_');
      }
    }
    const sourcePath = path.resolve(PROJECT_ROOT, sourceRel);

    let actualValue = undefined;
    let evidence = '';

    if (fs.existsSync(sourcePath)) {
      try {
        const fileContent = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
        actualValue = getNestedValue(fileContent, gate.jsonPath);
        evidence = `${sourceRel} -> ${gate.jsonPath} = ${JSON.stringify(actualValue)}`;
      } catch (e) {
        evidence = `Error parsing ${sourceRel}: ${e.message}`;
      }
    } else {
      evidence = `Source file not found: ${sourceRel}`;
    }

    const passed = evaluateGate(actualValue, gate.operator, gate.target);
    const status = passed ? 'PASS' : 'GAGAL';

    gateResults.push({
      id: gate.id,
      name: gate.name,
      command: cmd,
      target: `${gate.operator} ${gate.target} ${gate.unit || ''}`.trim(),
      value: actualValue !== undefined ? actualValue : 'N/A',
      unit: gate.unit || '',
      status,
      evidence
    });

    console.log(`  -> [${status}] ${gate.id}: value=${actualValue} (target: ${gate.operator} ${gate.target})`);
  }

  const total = gateResults.length;
  const passCount = gateResults.filter(g => g.status === 'PASS').length;
  const failCount = gateResults.filter(g => g.status === 'GAGAL').length;

  const resultPayload = {
    timestamp: new Date().toISOString(),
    mode: isBaseline ? 'BASELINE' : 'V14',
    totalGates: total,
    passCount,
    failCount,
    allPass: failCount === 0,
    gates: gateResults
  };

  const jsonOutRel = isBaseline ? 'review/v14_baseline_gates.json' : 'review/v14_gates.json';
  const mdOutRel = isBaseline ? 'review/report_v14_baseline.md' : 'review/report_v14.md';

  const jsonOutPath = path.resolve(PROJECT_ROOT, jsonOutRel);
  const mdOutPath = path.resolve(PROJECT_ROOT, mdOutRel);

  fs.mkdirSync(path.dirname(jsonOutPath), { recursive: true });
  fs.writeFileSync(jsonOutPath, JSON.stringify(resultPayload, null, 2), 'utf8');
  console.log(`\n[gateRunner] Gate JSON written to: ${jsonOutRel}`);

  // Generate Markdown report strictly from JSON
  const reportLines = [
    `# Laporan Evaluasi Gerbang V14 (${isBaseline ? 'BASELINE HEAD 1cffde7' : 'HASIL PERBAIKAN V14'})`,
    ``,
    `> **Waktu Eksekusi**: ${resultPayload.timestamp}  `,
    `> **Mode**: ${resultPayload.mode}  `,
    `> **Total Gerbang**: ${total} | **PASS**: ${passCount} | **GAGAL**: ${failCount}  `,
    `> **Status Keseluruhan**: ${resultPayload.allPass ? '✅ SEMUA GERBANG LOLOS (PASS)' : '❌ TERDAPAT GERBANG GAGAL'}`,
    ``,
    `---`,
    ``,
    `## Tabel Status Gerbang`,
    ``,
    `| ID | Nama Gerbang | Target | Nilai Terukur | Status | Bukti (Source Path) |`,
    `|---|---|---|---|:---:|---|`
  ];

  for (const g of gateResults) {
    const statusIcon = g.status === 'PASS' ? '🟢 PASS' : '🔴 GAGAL';
    reportLines.push(
      `| **${g.id}** | ${g.name} | \`${g.target}\` | \`${g.value} ${g.unit}\` | ${statusIcon} | \`${g.evidence}\` |`
    );
  }

  reportLines.push(``, `---`, `*Laporan ini dihasilkan 100% secara otomatis oleh scripts/v14/gateRunner.js tanpa intervensi manual.*`);

  fs.writeFileSync(mdOutPath, reportLines.join('\n'), 'utf8');
  console.log(`[gateRunner] Markdown Report written to: ${mdOutRel}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
