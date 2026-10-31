const fs = require("fs");
const path = require("path");

const src = path.join("dist", "assets", "node_modules");
if (!fs.existsSync(src)) {
  console.log("dist/assets/node_modules not found — nothing to do");
  process.exit(0);
}

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else files.push(f);
  }
})(src);

for (const f of files) {
  const target = path.join("dist", "assets", path.basename(f));
  fs.copyFileSync(f, target);
}
fs.rmSync(src, { recursive: true });

const pattern = /assets\/node_modules\/[^\s"'`)\\]*/g;
const targets = [];
for (const dir of ["dist/_expo/static/js/web", "dist/_expo/static/css"]) {
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) targets.push(path.join(dir, f));
}
(function walkHtml(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walkHtml(f);
    else if (e.name.endsWith(".html")) targets.push(f);
  }
})("dist");

let rewritten = 0;
for (const t of targets) {
  const content = fs.readFileSync(t, "utf8");
  if (!content.includes("assets/node_modules/")) continue;
  fs.writeFileSync(t, content.replace(pattern, (m) => "assets/" + path.basename(m)));
  rewritten++;
}

console.log(`flattened ${files.length} files into dist/assets/, rewrote ${rewritten} bundle/html files`);
