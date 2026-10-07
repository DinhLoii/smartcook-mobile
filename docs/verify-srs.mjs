// Checks document structure, DOCX content, Mermaid syntax and rendered PDF pages.
// This is a documentation check, not an application acceptance test.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { browser } from './export-srs.mjs';

const docs = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(docs, 'output');
const review = path.join(output, 'review');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function assert(condition, message) { if (!condition) throw new Error(message); }

function unzip(buffer) {
  const files = new Map();
  for (let offset = 0; offset < buffer.length - 46; offset++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) continue;
    const method = buffer.readUInt16LE(offset + 10);
    const size = buffer.readUInt32LE(offset + 20);
    const nameSize = buffer.readUInt16LE(offset + 28);
    const extraSize = buffer.readUInt16LE(offset + 30);
    const commentSize = buffer.readUInt16LE(offset + 32);
    const start = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameSize).toString();
    const dataStart = start + 30 + buffer.readUInt16LE(start + 26) + buffer.readUInt16LE(start + 28);
    const compressed = buffer.subarray(dataStart, dataStart + size);
    files.set(name, method === 8 ? inflateRawSync(compressed) : compressed);
    offset += 45 + nameSize + extraSize + commentSize;
  }
  return files;
}

async function main() {
  await fs.mkdir(review, { recursive: true });
  const md = await fs.readFile(path.join(docs, 'SmartCook_SRS.md'), 'utf8');
  for (const [prefix, total, digits] of [['FR', 48, 3], ['NFR', 15, 3], ['BR', 15, 3], ['UC', 12, 2], ['AT', 13, 2]]) {
    for (let i = 1; i <= total; i++) assert(md.includes(`${prefix}-${String(i).padStart(digits, '0')}`), 'Missing ID ' + prefix + i);
  }
  const definitions = [...md.matchAll(/^\| (FR-\d{3}) \/ P[12] \|/gm)].map(m => m[1]);
  assert(definitions.length === 48 && new Set(definitions).size === 48, 'Functional definitions missing/duplicated');
  for (const match of md.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    if (/^https?:|^#/.test(match[1])) continue;
    await fs.access(path.resolve(docs, match[1]));
  }
  const zip = unzip(await fs.readFile(path.join(output, 'SmartCook_SRS.docx')));
  const xml = zip.get('word/document.xml').toString();
  assert(xml.includes('FR-048') && xml.includes('NFR-015') && xml.includes('Quy Nhơn'), 'DOCX lost required text/Unicode');
  const embedded = [...zip.keys()].filter(name => /^word\/media\/.*\.png$/.test(name));
  assert(embedded.length === 14, 'DOCX missing diagram images');
  assert(!xml.includes('VI TRI BO SUNG HINH ANH'), 'DOCX contains old placeholders');
  const chrome = await browser();
  const legacyDiagrams = [];
  try {
    await chrome.send('Page.navigate', { url: pathToFileURL(path.join(output, 'diagram-renderer.html')).href });
    for (let i = 0; i < 50; i++) { if (await chrome.evaluate('typeof mermaid !== "undefined"')) break; await delay(100); }
    for (const repo of ['smartcook-backend', 'smartcook-web', 'smartcook-mobile']) {
      const folder = path.resolve(docs, '../..', repo);
      const files = (await fs.readdir(folder)).filter(name => name.endsWith('.mermaid'));
      for (const name of files) {
        const source = await fs.readFile(path.join(folder, name), 'utf8');
        const result = await chrome.evaluate(`(async()=>{try {await mermaid.parse(${JSON.stringify(source)});return {valid:true}}catch(e){return {valid:false,error:e.message}}})()`);
        legacyDiagrams.push({ file: repo + '/' + name, ...result });
      }
    }
    const html = '<!doctype html><meta charset="utf-8"><style>body{margin:0;background:white}canvas{display:block}</style><script type="module">import * as pdfjs from "../assets/pdf.mjs";pdfjs.GlobalWorkerOptions.workerSrc="../assets/pdf.worker.mjs";window.pdfjs=pdfjs;</script>';
    await fs.writeFile(path.join(output, 'pdf-review.html'), html);
    await chrome.send('Page.navigate', { url: pathToFileURL(path.join(output, 'pdf-review.html')).href });
    let ready = false;
    for (let i = 0; i < 50; i++) { ready = await chrome.evaluate('typeof pdfjs !== "undefined"'); if (ready) break; await delay(100); }
    assert(ready, 'PDF.js failed to load');
    const pdfData = (await fs.readFile(path.join(output, 'SmartCook_SRS.pdf'))).toString('base64');
    let count = await chrome.evaluate(`(async()=>{window.pdf=await pdfjs.getDocument({data:Uint8Array.from(atob(${JSON.stringify(pdfData)}),c=>c.charCodeAt(0))}).promise;return pdf.numPages})()`);
    const readPages = () => chrome.evaluate(`(async()=>{const results=[];for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i);const text=(await p.getTextContent()).items.map(x=>x.str).join(' ');const v=p.getViewport({scale:1});results.push({page:i,text,width:v.width,height:v.height})}return results})()`);
    let pages = await readPages();
    // Add accurate PDF section page numbers after the first pagination pass.
    const headings = [...md.matchAll(/^## (\d+\. .+)$/gm)].map(m => m[1]);
    let documentHtml = await fs.readFile(path.join(output, 'SmartCook_SRS.html'), 'utf8');
    const toc = headings.map((heading, index) => ({ heading, index: index + 1, page: pages.find(p => p.text.startsWith(heading))?.page }));
    assert(toc.every(item => item.page), 'Cannot resolve PDF table of contents');
    for (const item of toc) documentHtml = documentHtml.replace(`<p class="">${item.heading}</p>`, `<p class="toc-entry"><a href="#section-${item.index}">${item.heading}</a><span>${item.page}</span></p>`);
    documentHtml = documentHtml.replace('</style>', '.toc-entry{display:flex;justify-content:space-between;gap:12px}.toc-entry a{flex:1;border-bottom:1px dotted #b7c8d8}.toc-entry span{color:#17395b;font-weight:bold}</style>');
    await fs.writeFile(path.join(output, 'SmartCook_SRS.html'), documentHtml);
    await chrome.send('Page.navigate', { url: pathToFileURL(path.join(output, 'SmartCook_SRS.html')).href });
    await delay(400);
    await chrome.evaluate('document.fonts.ready.then(()=>true)');
    await chrome.evaluate('Promise.all(Array.from(document.images).map(i=>i.decode())).then(()=>true)');
    const paginated = await chrome.send('Page.printToPDF', {
      printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
      headerTemplate: '<div style="font-family:Arial;font-size:8px;color:#6b7c8f;width:100%;padding:0 20mm;">SMARTCOOK • SC-SRS-001 • v3.0</div>',
      footerTemplate: '<div style="font-family:Arial;font-size:8px;color:#6b7c8f;width:100%;text-align:right;padding:0 17mm;">06/10/2026 • <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
    await fs.writeFile(path.join(output, 'SmartCook_SRS.pdf'), Buffer.from(paginated.data, 'base64'));
    await chrome.send('Page.navigate', { url: pathToFileURL(path.join(output, 'pdf-review.html')).href });
    for (let i = 0; i < 50; i++) { if (await chrome.evaluate('typeof pdfjs !== "undefined"')) break; await delay(100); }
    count = await chrome.evaluate(`(async()=>{window.pdf=await pdfjs.getDocument({data:Uint8Array.from(atob(${JSON.stringify(paginated.data)}),c=>c.charCodeAt(0))}).promise;return pdf.numPages})()`);
    pages = await readPages();
    assert(toc.every(item => pages.find(p => p.text.startsWith(item.heading))?.page === item.page), 'TOC pagination changed');
    const allText = pages.map(p => p.text).join('\n');
    assert(allText.includes('FR-048') && allText.includes('NFR-015'), 'PDF missing final requirements');
    assert(pages.filter(p => p.text.includes('Hình ')).length >= 14, 'PDF missing figure captions');
    const blankPages = pages.filter(p => p.text.length < 160).map(p => p.page);
    const selected = new Set([1, 2, pages.find(p => /FR-001\s*\/\s*P1/.test(p.text))?.page, pages.find(p => p.text.includes('Hình 7.'))?.page, pages.find(p => p.text.includes('Hình 12.'))?.page, pages.find(p => /NFR-\s*005/.test(p.text))?.page, count]);
    for (const number of selected) {
      if (!number) continue;
      const dim = await chrome.evaluate(`(async()=>{const p=await pdf.getPage(${number});const v=p.getViewport({scale:1.5});document.body.innerHTML='<canvas></canvas>';const c=document.querySelector('canvas');c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);await p.render({canvasContext:c.getContext('2d'),viewport:v}).promise;return {width:c.width,height:c.height}})()`);
      await chrome.send('Emulation.setDeviceMetricsOverride', { width: dim.width, height: dim.height, deviceScaleFactor: 1, mobile: false });
      const shot = await chrome.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, ...dim, scale: 1 } });
      await fs.writeFile(path.join(review, `page-${String(number).padStart(2, '0')}.png`), Buffer.from(shot.data, 'base64'));
    }
    const report = { documentOnly: true, functionalRequirements: 48, docxImages: embedded.length, pdfPages: count, toc, possibleBlankPages: blankPages, landscapePages: pages.filter(p => p.width > p.height).map(p => p.page), legacyDiagrams, pages: pages.map(({ page, text, width, height }) => ({ page, width, height, characters: text.length, excerpt: text.slice(0, 170) })) };
    await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify(report, null, 2));
    await fs.writeFile(path.join(review, 'pdf-extracted-text.txt'), pages.map(p => `PAGE ${p.page}\n${p.text}`).join('\n\n'));
    console.log(JSON.stringify({ docxImages: embedded.length, pdfPages: count, possibleBlankPages: blankPages, originalDiagrams: legacyDiagrams.length, originalDiagramErrors: legacyDiagrams.filter(d => !d.valid).map(d => d.file), screenshotPages: [...selected].filter(Boolean) }, null, 2));
  } finally { await chrome.close(); }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
