import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

// TEMP diagnostic wrapper (branch kimi/game-feel-batch1): run the Playwright
// smoke suite, tee stdout to smoke-output.txt (the existing artifact upload
// expects it), and on failure re-emit the failure tail as ::error annotations
// so the failing test is visible on the public run summary page.

const esc = (s) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');

const child = spawn('npx', ['playwright', 'test'], {
  stdio: ['inherit', 'pipe', 'inherit']
});

let out = '';
child.stdout.on('data', (d) => {
  const s = d.toString();
  out += s;
  process.stdout.write(s);
});

child.on('close', (code) => {
  writeFileSync('smoke-output.txt', out);
  if (code !== 0) {
    const lines = out.split('\n');
    const tail = esc(lines.slice(-80).join('\n'));
    console.log(`::error title=smoke-output-tail::${tail}`);
  }
  process.exit(code ?? 1);
});
