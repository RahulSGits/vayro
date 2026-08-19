/** VAYRO verification harness: typecheck -> lint -> production build.
 *  Prints a compact report; exits non-zero on the first hard failure. */
import { execSync } from 'node:child_process';

const steps = [
  { name: 'typecheck', cmd: 'npx tsc --noEmit -p tsconfig.json', hard: true },
  { name: 'lint',      cmd: 'npx eslint src --max-warnings 200', hard: false },
  { name: 'build',     cmd: 'npx next build', hard: true },
];

let failed = 0;
for (const s of steps) {
  process.stdout.write(`\n▸ ${s.name}\n`);
  try {
    execSync(s.cmd, { stdio: 'inherit', cwd: process.cwd() });
    console.log(`  ✓ ${s.name} passed`);
  } catch {
    console.log(`  ✗ ${s.name} FAILED${s.hard ? '' : ' (non-blocking)'}`);
    if (s.hard) { failed++; break; }
  }
}
process.exit(failed ? 1 : 0);
