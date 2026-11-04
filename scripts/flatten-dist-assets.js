const fs = require("fs");
const path = require("path");

const distDir = path.resolve("dist");
const assetsDir = path.join(distDir, "assets");

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 1. Flatten dist/assets/node_modules if present
const nodeModulesSrc = path.join(assetsDir, "node_modules");
let flattenedCount = 0;
if (fs.existsSync(nodeModulesSrc)) {
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else files.push(f);
    }
  })(nodeModulesSrc);

  for (const f of files) {
    const target = path.join(assetsDir, path.basename(f));
    fs.copyFileSync(f, target);
    flattenedCount++;
  }
  fs.rmSync(nodeModulesSrc, { recursive: true, force: true });
  console.log(`[assets] Flattened ${flattenedCount} files from dist/assets/node_modules/ into dist/assets/`);
}

// 2. Ensure unhashed vector icons exist in dist/assets
const vectorFontsSrc = path.resolve(
  "node_modules",
  "@expo",
  "vector-icons",
  "build",
  "vendor",
  "react-native-vector-icons",
  "Fonts"
);
let copiedVectorFonts = 0;
if (fs.existsSync(vectorFontsSrc)) {
  for (const file of fs.readdirSync(vectorFontsSrc)) {
    if (file.endsWith(".ttf")) {
      const dest = path.join(assetsDir, file);
      fs.copyFileSync(path.join(vectorFontsSrc, file), dest);
      copiedVectorFonts++;
    }
  }
  console.log(`[fonts] Ensured ${copiedVectorFonts} clean TTF vector fonts in dist/assets/`);
}

// 3. Rewriting bundles: JS, CSS, and HTML files
const targets = [];
for (const dir of [
  path.join(distDir, "_expo", "static", "js", "web"),
  path.join(distDir, "_expo", "static", "css"),
]) {
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      targets.push(path.join(dir, f));
    }
  }
}

(function walkHtml(d) {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walkHtml(f);
    else if (e.name.endsWith(".html")) targets.push(f);
  }
})(distDir);

let rewritten = 0;
const nodeModulesPattern = /(?:\/)?assets\/node_modules\/[^\s"'`)\\]*\/([^\s"'`)\\/]+)/g;

for (const t of targets) {
  let content = fs.readFileSync(t, "utf8");
  if (!content.includes("assets/node_modules/")) continue;

  content = content.replace(nodeModulesPattern, (m, filename) => {
    return m.startsWith("/") ? `/assets/${filename}` : `assets/${filename}`;
  });

  fs.writeFileSync(t, content, "utf8");
  rewritten++;
}
console.log(`[bundles] Rewrote ${rewritten} bundle/html files to remove node_modules paths`);

// 4. Ensure Netlify configuration files exist in dist/
const redirectsFile = path.join(distDir, "_redirects");
fs.writeFileSync(redirectsFile, "/*    /index.html   200\n", "utf8");

const headersFile = path.join(distDir, "_headers");
const headersContent = `/*
  Access-Control-Allow-Origin: *

/*.ttf
  Access-Control-Allow-Origin: *
  Content-Type: font/ttf
  Cache-Control: public, max-age=31536000, immutable

/assets/*.ttf
  Access-Control-Allow-Origin: *
  Content-Type: font/ttf
  Cache-Control: public, max-age=31536000, immutable
`;
fs.writeFileSync(headersFile, headersContent, "utf8");

const netlifyTomlSrc = path.resolve("netlify.toml");
if (fs.existsSync(netlifyTomlSrc)) {
  fs.copyFileSync(netlifyTomlSrc, path.join(distDir, "netlify.toml"));
}

console.log("[netlify] Wrote _redirects, _headers, and netlify.toml into dist/");
