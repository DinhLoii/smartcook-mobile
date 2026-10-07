// Compatibility entry point: export the full SRS, including rendered diagrams.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const child = spawn(process.execPath, [fileURLToPath(new URL('./export-srs.mjs', import.meta.url))], {
  stdio: 'inherit', windowsHide: true,
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
