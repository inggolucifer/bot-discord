/**
 * Jianghu Bot & Immortal-X V29 Master Gate Runner
 * Executes strict sequence of validation gates and records raw outputs to gate.json.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const RAW_DIR = path.resolve(__dirname, '../../review/v29_raw');
const GATE_OUTPUT = path.join(RAW_DIR, 'gate.json');

const COMMANDS = [
  {
    step: '1. npm test',
    cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['test'],
    timeout: 180000
  },
  {
    step: '2. npx vitest run',
    cmd: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['vitest', 'run'],
    timeout: 300000
  },
  {
    step: '3. node scripts/v28/auditNpcWorld.js',
    cmd: 'node',
    args: ['scripts/v28/auditNpcWorld.js'],
    timeout: 60000
  },
  {
    step: '4. node scripts/v28/layoutProbe.js http://localhost:3100',
    cmd: 'node',
    args: ['scripts/v28/layoutProbe.js', 'http://localhost:3100'],
    timeout: 120000
  },
  {
    step: '5. npm --prefix web-dashboard run build',
    cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['--prefix', 'web-dashboard', 'run', 'build'],
    timeout: 300000
  },
  {
    step: '6. git status -s',
    cmd: 'git',
    args: ['status', '-s'],
    timeout: 30000,
    checkGitClean: true
  }
];

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, () => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function runCommand(item) {
  return new Promise((resolve) => {
    console.log(`\n======================================================`);
    console.log(`[GATE] Executing: ${item.step}`);
    console.log(`======================================================`);

    const start = Date.now();
    let stdout = '';
    let stderr = '';

    const proc = spawn(item.cmd, item.args, {
      cwd: path.resolve(__dirname, '../..'),
      env: process.env,
      shell: true
    });

    proc.stdout.on('data', (d) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(s);
    });

    proc.stderr.on('data', (d) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(s);
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, item.timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);
      const duration = Date.now() - start;

      let pass = code === 0 && !timedOut;
      if (item.checkGitClean) {
        // Disallowed files: package-lock.json, .next, AGENTS.md, or secrets (.env)
        const forbiddenPatterns = [/package-lock\.json/, /\.next/, /AGENTS\.md/, /\.env/];
        const dirtyLines = stdout.split('\n').filter(l => l.trim().length > 0);
        for (const line of dirtyLines) {
          for (const pat of forbiddenPatterns) {
            if (pat.test(line)) {
              console.error(`[GATE ERROR] Forbidden file detected in git status: ${line}`);
              pass = false;
            }
          }
        }
      }

      resolve({
        step: item.step,
        command: `${item.cmd} ${item.args.join(' ')}`,
        exitCode: timedOut ? -1 : code,
        durationMs: duration,
        pass,
        timedOut,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
}

async function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  console.log(`[GATE RUNNER V29] Master Invariant & Pipeline Gate Starting...`);

  const results = [];
  let overallPass = true;

  for (const item of COMMANDS) {
    if (item.step.includes('layoutProbe')) {
      const isUp = await checkPort(3100);
      if (!isUp) {
        console.warn(`[GATE WARNING] Port 3100 does not appear reachable before layout probe.`);
      }
    }

    const res = await runCommand(item);
    results.push(res);
    if (!res.pass) {
      overallPass = false;
    }
  }

  const gateReport = {
    timestamp: new Date().toISOString(),
    overallPass,
    totalSteps: results.length,
    passedSteps: results.filter(r => r.pass).length,
    failedSteps: results.filter(r => !r.pass).length,
    results
  };

  fs.writeFileSync(GATE_OUTPUT, JSON.stringify(gateReport, null, 2));

  console.log(`\n======================================================`);
  console.log(`[GATE SUMMARY TABLE]`);
  console.log(`======================================================`);
  console.log(`| Step | Command | Status | Duration | Exit Code |`);
  console.log(`|---|---|---|---|---|`);
  for (const r of results) {
    console.log(`| ${r.step} | \`${r.command}\` | ${r.pass ? 'PASS' : 'FAIL'} | ${(r.durationMs / 1000).toFixed(1)}s | ${r.exitCode} |`);
  }
  console.log(`======================================================`);
  console.log(`Overall Result: ${overallPass ? 'ALL GATES PASSED (100%)' : 'SOME GATES FAILED'}`);
  console.log(`Full report saved to: ${GATE_OUTPUT}`);

  process.exit(overallPass ? 0 : 1);
}

main().catch(err => {
  console.error('[GATE FATAL ERROR]', err);
  process.exit(1);
});
