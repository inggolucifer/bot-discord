/**
 * scripts/v13/gateRunner.js
 * Authoritative Gate Runner for Jianghu Bot V13
 * 
 * STRICT RULE:
 * This script runs every gate in scripts/v13/gates.json, measures actual values,
 * writes review/v13_gates.json (or review/v13_baseline_gates.json),
 * and generates review/report_v13.md strictly from the JSON output.
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
  console.log(`[gateRunner] Loaded ${gatesConfig.length} gates. Mode: ${isBaseline ? 'BASELINE' : 'V13'}`);

  const executedCommands = new Set();
  const gateResults = [];

  for (const gate of gatesConfig) {
    let cmd = gate.command;
    if (isBaseline && !cmd.includes('--baseline')) {
      cmd += ' --baseline';
    }

    // Execute command if not executed yet in this session
    if (!skipCommands && !executedCommands.has(cmd)) {
      runCommand(cmd);
      executedCommands.add(cmd);
    }

    // Determine actual source file (append baseline if needed)
    let sourceRel = gate.sourceFile;
    if (isBaseline) {
      sourceRel = sourceRel.replace('v13_', 'v13_baseline_');
      if (sourceRel.endsWith('v10_audit_summary.json')) {
        sourceRel = 'review/v10_audit_summary.json';
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

  // Summary counts
  const total = gateResults.length;
  const passCount = gateResults.filter(g => g.status === 'PASS').length;
  const failCount = gateResults.filter(g => g.status === 'GAGAL').length;

  const resultPayload = {
    timestamp: new Date().toISOString(),
    mode: isBaseline ? 'BASELINE' : 'V13',
    totalGates: total,
    passCount,
    failCount,
    allPass: failCount === 0,
    gates: gateResults
  };

  const jsonOutRel = isBaseline ? 'review/v13_baseline_gates.json' : 'review/v13_gates.json';
  const mdOutRel = isBaseline ? 'review/report_v13_baseline.md' : 'review/report_v13.md';

  const jsonOutPath = path.resolve(PROJECT_ROOT, jsonOutRel);
  const mdOutPath = path.resolve(PROJECT_ROOT, mdOutRel);

  fs.mkdirSync(path.dirname(jsonOutPath), { recursive: true });
  fs.writeFileSync(jsonOutPath, JSON.stringify(resultPayload, null, 2), 'utf8');
  console.log(`\n[gateRunner] Gate JSON written to: ${jsonOutRel}`);

  // Generate Markdown report strictly from JSON
  const reportLines = [
    `# Laporan Evaluasi Gerbang V13 (${isBaseline ? 'BASELINE HEAD a34b58e' : 'HASIL PERBAIKAN V13'})`,
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

  reportLines.push(``, `---`, `*Laporan ini dihasilkan 100% secara otomatis oleh scripts/v13/gateRunner.js tanpa intervensi manual.*`);

  fs.writeFileSync(mdOutPath, reportLines.join('\n'), 'utf8');
  console.log(`[gateRunner] Markdown Report written to: ${mdOutRel}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
