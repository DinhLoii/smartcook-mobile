import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptsDirectory, "..");
const phaseScripts = [
  "testE2EPhase1.mjs",
  "testE2EPhase2.mjs",
  "testE2EPhase3.mjs",
  "testE2EPhase4.mjs",
  "testE2EPhase5.mjs",
  "testE2EPhase6.mjs",
];

console.log("\nSMARTCOOK MOBILE - FULL E2E USER JOURNEY\n");

for (const phaseScript of phaseScripts) {
  console.log(`\n▶ Đang chạy ${phaseScript}\n`);
  const result = spawnSync(
    process.execPath,
    [path.join(scriptsDirectory, phaseScript)],
    {
      cwd: projectDirectory,
      env: process.env,
      stdio: "inherit",
    }
  );

  if (result.error) {
    console.error(`Không thể khởi chạy ${phaseScript}:`, result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\n❌ Full journey dừng tại ${phaseScript}.`);
    process.exit(result.status ?? 1);
  }
}

console.log("\n✅ Toàn bộ 6 phase E2E đã hoàn tất thành công.\n");
