/**
 * Jianghu Bot & Immortal-X V30 Master Gate Runner
 * Executes strict sequence of 8 validation gates and records raw outputs to review/v30_raw/gate.json.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const RAW_DIR = path.resolve(__dirname, '../../review/v30_raw');
const GATE_OUTPUT = path.join(RAW_DIR, 'gate.json');
const ROOT_DIR = path.resolve(__dirname, '../..');

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
    args: ['scripts/v28/layoutProbe.js', process.argv[2] || 'http://localhost:3100'],
    timeout: 120000,
    checkPort: true
  },
  {
    step: '5. npm --prefix web-dashboard run build',
    cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['--prefix', 'web-dashboard', 'run', 'build'],
    timeout: 300000
  },
  {
    step: '6. Cek Aset Terlarang',
    customCheck: checkForbiddenAssets
  },
  {
    step: '7. Cek Git Bersih',
    customCheck: checkGitStatusClean
  },
  {
    step: '8. Cek Anti-Slop',
    cmd: 'node',
    args: ['scripts/v30/antislopScan.js'],
    timeout: 30000
  }
];

function checkPort(port) {
  return new Promise((resolve) => {
    const tryUrl = (host, fallback) => {
      const req = http.get(`http://${host}:${port}`, () => resolve(true));
      req.on('error', () => {
        if (fallback) fallback();
        else resolve(false);
      });
      req.setTimeout(8000, () => {
        req.destroy();
        if (fallback) fallback();
        else resolve(false);
      });
    };
    tryUrl('127.0.0.1', () => tryUrl('localhost', null));
  });
}

function scanDirRecursive(dir, matchRegex, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
        scanDirRecursive(fullPath, matchRegex, results);
      }
    } else if (entry.isFile()) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (matchRegex.test(content) || matchRegex.test(entry.name)) {
          results.push(fullPath);
        }
      } catch (e) {}
    }
  }
  return results;
}

function checkForbiddenAssets() {
  const dirs = [
    path.join(ROOT_DIR, 'web-dashboard/src'),
    path.join(ROOT_DIR, 'web-dashboard/public'),
    path.join(ROOT_DIR, 'web-api'),
    path.join(ROOT_DIR, 'services')
  ];
  const regex = /toi_scenery|xihua_standing/i;
  const matchedFiles = [];
  for (const d of dirs) {
    scanDirRecursive(d, regex, matchedFiles);
  }

  if (matchedFiles.length > 0) {
    return {
      pass: false,
      exitCode: 1,
      stdout: `Forbidden assets found in ${matchedFiles.length} files:\n` + matchedFiles.join('\n'),
      stderr: 'Forbidden asset detected.'
    };
  }
  return {
    pass: true,
    exitCode: 0,
    stdout: 'Clean. No forbidden assets found.',
    stderr: ''
  };
}

function checkGitStatusClean() {
  try {
    const stdout = execSync('git status --porcelain', { cwd: ROOT_DIR, encoding: 'utf8' });
    const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
    const violations = [];

    for (const line of lines) {
      if (/package-lock\.json/.test(line)) violations.push(`Forbidden: package-lock.json modified (${line})`);
      if (/\.next\//.test(line)) violations.push(`Forbidden: .next/ tracked (${line})`);
      if (/node_modules\//.test(line)) violations.push(`Forbidden: node_modules/ tracked (${line})`);
      if (/^\?\?.*AGENTS\.md/.test(line)) violations.push(`Forbidden: untracked AGENTS.md (${line})`);
    }

    if (violations.length > 0) {
      return {
        pass: false,
        exitCode: 1,
        stdout: stdout.trim(),
        stderr: violations.join('\n')
      };
    }
    return {
      pass: true,
      exitCode: 0,
      stdout: stdout.trim() || 'Working tree clean.',
      stderr: ''
    };
  } catch (err) {
    return {
      pass: false,
      exitCode: 1,
      stdout: '',
      stderr: err.message
    };
  }
}

function runCommand(item) {
  return new Promise(async (resolve) => {
    console.log(`\n======================================================`);
    console.log(`[GATE] Executing: ${item.step}`);
    console.log(`======================================================`);

    const start = Date.now();

    if (item.customCheck) {
      const res = item.customCheck();
      const duration = Date.now() - start;
      console.log(res.stdout);
      if (res.stderr) console.error(res.stderr);
      return resolve({
        step: item.step,
        command: item.step,
        exitCode: res.exitCode,
        durationMs: duration,
        pass: res.pass,
        timedOut: false,
        stdout: res.stdout.slice(0, 4000),
        stderr: res.stderr.slice(0, 4000)
      });
    }

    if (item.checkPort) {
      const isUp = await checkPort(3100);
      if (!isUp) {
        console.error(`[GATE ERROR] Dev server port 3100 is not running. Layout probe cannot succeed.`);
        return resolve({
          step: item.step,
          command: `${item.cmd} ${item.args.join(' ')}`,
          exitCode: 1,
          durationMs: 0,
          pass: false,
          timedOut: false,
          stdout: '',
          stderr: 'Dev server at port 3100 is down. Start with `npm --prefix web-dashboard run dev -- -p 3100` first.'
        });
      }
    }

    let stdout = '';
    let stderr = '';

    const proc = spawn(item.cmd, item.args, {
      cwd: ROOT_DIR,
      env: { ...process.env, RAW_DIR },
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
      const pass = code === 0 && !timedOut;

      resolve({
        step: item.step,
        command: `${item.cmd} ${item.args.join(' ')}`,
        exitCode: timedOut ? -1 : (code ?? 1),
        durationMs: duration,
        pass,
        timedOut,
        stdout: stdout.trim().slice(0, 4000),
        stderr: stderr.trim().slice(0, 4000)
      });
    });
  });
}

async function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  console.log(`[GATE RUNNER V30] Starting Master 8-Gate Pipeline...`);

  const results = [];
  let overallPass = true;

  for (const item of COMMANDS) {
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
  console.log(`[GATE SUMMARY TABLE V30]`);
  console.log(`======================================================`);
  console.log(`| Step | Status | Duration | Exit Code |`);
  console.log(`|---|---|---|---|`);
  for (const r of results) {
    console.log(`| ${r.step} | ${r.pass ? 'PASS' : 'FAIL'} | ${(r.durationMs / 1000).toFixed(1)}s | ${r.exitCode} |`);
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
