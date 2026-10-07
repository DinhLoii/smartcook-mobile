// Export the reviewed SRS to editable Word, print PDF, HTML and diagram assets.
// Uses the existing docx dependency and installed Chrome; no app dependencies added.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import {
  Document, Packer, Paragraph, TextRun, ImageRun, ExternalHyperlink,
  HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, Footer, Header, PageNumber, PageOrientation, TableOfContents,
} from 'docx';

const docs = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(docs, 'SmartCook_SRS.md');
const output = path.join(docs, 'output');
const assets = path.join(docs, 'assets');
const diagramDir = path.join(docs, 'diagrams');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const esc = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

class CDP {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.pending = new Map();
    this.counter = 0;
    this.socket.addEventListener('message', event => {
      const msg = JSON.parse(event.data);
      const waiter = this.pending.get(msg.id);
      if (!waiter) return;
      this.pending.delete(msg.id);
      clearTimeout(waiter.timer);
      if (msg.error) waiter.reject(new Error(JSON.stringify(msg.error)));
      else waiter.resolve(msg.result);
    });
  }
  async ready() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
  }
  send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++this.counter;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('CDP timeout: ' + method));
      }, 30000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  close() { this.socket.close(); }
}

async function browser() {
  const executable = process.env.SRS_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  await fs.access(executable);
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'smartcook-srs-chrome-'));
  const proc = spawn(executable, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--allow-file-access-from-files',
    '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
  ], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  const url = await new Promise((resolve, reject) => {
    let stderr = '';
    const timer = setTimeout(() => reject(new Error('Chrome startup timed out: ' + stderr.slice(-800))), 15000);
    proc.once('error', error => { clearTimeout(timer); reject(error); });
    proc.once('exit', code => { clearTimeout(timer); reject(new Error('Chrome exited: ' + code + ' ' + stderr.slice(-800))); });
    proc.stderr.on('data', chunk => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
  });
  const cdp = new CDP(url);
  await cdp.ready();
  const target = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const send = (method, params) => cdp.send(method, params, sessionId);
  await send('Page.enable');
  await send('Runtime.enable');
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  return { send, evaluate, async close() {
    await cdp.send('Browser.close').catch(() => {});
    cdp.close();
    proc.kill();
    // Leave the unique temporary Chrome profile for OS cleanup; no recursive deletion.
  } };
}

function parse(md) {
  const lines = md.split(/\r?\n/);
  const blocks = [];
  let diagramIndex = 0;
  for (let i = 0; i < lines.length;) {
    const line = lines[i].trim();
    if (!line || /^---+$/.test(line)) { i++; continue; }
    if (line.startsWith('```')) {
      const language = line.slice(3);
      const body = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith('```'); i++) body.push(lines[i]);
      if (i >= lines.length) throw new Error('Unclosed fence');
      i++;
      if (language === 'mermaid') {
        const preceding = blocks.at(-1);
        const caption = preceding?.type === 'paragraph' && preceding.text.startsWith('**Hình ') ? blocks.pop().text.replaceAll('**', '') : 'Sơ đồ';
        blocks.push({ type: 'diagram', index: ++diagramIndex, source: body.join('\n'), caption });
      } else blocks.push({ type: 'code', text: body.join('\n') });
      continue;
    }
    if (line.startsWith('|')) {
      const rows = [];
      for (; i < lines.length && lines[i].trim().startsWith('|'); i++) {
        if (/^\|[\s:|\-]+\|$/.test(lines[i].trim())) continue;
        rows.push(lines[i].trim().slice(1, -1).split('|').map(cell => cell.trim()));
      }
      if (rows.some(row => row.length !== rows[0].length)) throw new Error('Table column mismatch: ' + rows[0]);
      blocks.push({ type: 'table', rows });
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)/);
    if (heading) blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
    else if (/^[-*]\s/.test(line)) blocks.push({ type: 'bullet', text: line.slice(2) });
    else if (/^\d+\.\s/.test(line)) blocks.push({ type: 'number', text: line });
    else blocks.push({ type: 'paragraph', text: line });
    i++;
  }
  return blocks;
}

function linkTarget(href, html = false) {
  if (/^https?:/.test(href) || href.startsWith('#')) return href;
  const absolute = path.resolve(docs, href);
  return html ? pathToFileURL(absolute).href : path.relative(output, absolute).replaceAll('\\', '/');
}

function inlineHtml(text) {
  return esc(text)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => `<a href="${esc(linkTarget(href, true))}">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function runs(text, options = {}) {
  const parts = [];
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push(new TextRun({ text: text.slice(last, match.index), ...options }));
    if (match[1]) parts.push(new TextRun({ text: match[1], ...options, bold: true }));
    else if (match[2]) parts.push(new TextRun({ text: match[2], ...options, font: 'Consolas' }));
    else parts.push(new ExternalHyperlink({ link: linkTarget(match[4]), children: [new TextRun({ text: match[3], ...options, style: 'Hyperlink' })] }));
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(new TextRun({ text: text.slice(last), ...options }));
  return parts;
}

function htmlDocument(blocks) {
  const content = [];
  let section = 0;
  let cover = true;
  content.push('<section class="cover">');
  for (const b of blocks) {
    if (b.type === 'heading') {
      if (cover && b.text === 'Kiểm soát tài liệu') { content.push('</section>'); cover = false; }
      const major = b.level === 2 && /^\d+\./.test(b.text);
      const id = major ? `section-${++section}` : undefined;
      content.push(`<h${b.level} ${id ? `id="${id}"` : ''} class="${major ? 'major' : ''}">${inlineHtml(b.text)}</h${b.level}>`);
    } else if (b.type === 'table') {
      const rows = b.rows.map((row, index) => `<tr>${row.map(cell => `<${index ? 'td' : 'th'}>${inlineHtml(cell)}</${index ? 'td' : 'th'}>`).join('')}</tr>`);
      const widths = tableWidths(b.rows).map(w => `<col style="width:${w / 100}%">`).join('');
      content.push(`<table><colgroup>${widths}</colgroup><thead>${rows[0]}</thead><tbody>${rows.slice(1).join('')}</tbody></table>`);
    } else if (b.type === 'diagram') {
      const wide = b.width / b.height > 1.4 && b.width > 950;
      const headings = [];
      while (content.at(-1)?.startsWith('<h')) headings.unshift(content.pop().replace('class="major"', 'class=""'));
      const headingHtml = headings.length ? `<div class="figure-header">${headings.join('')}</div>` : '';
      content.push(`<figure class="${wide ? 'wide' : ''} ${headings.length ? 'with-heading' : ''}">${headingHtml}<figcaption>${esc(b.caption)}</figcaption><img src="../assets/figure-${String(b.index).padStart(2, '0')}.svg" alt="${esc(b.caption)}"></figure>`);
    } else if (b.type === 'code') content.push(`<pre>${esc(b.text)}</pre>`);
    else content.push(`<p class="${b.type === 'bullet' ? 'bullet' : ''}">${b.type === 'bullet' ? '• ' : ''}${inlineHtml(b.text)}</p>`);
  }
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>SmartCook SRS 3.0</title><style>
@page {size:A4; margin:18mm 17mm 18mm 20mm;} @page landscape {size:A4 landscape; margin:14mm 15mm;}
* {box-sizing:border-box} body {font:10.5pt/1.42 Arial,sans-serif;color:#233044;margin:0;background:white}
h1 {font-size:27pt;color:#17395b;text-align:center;margin:20mm 0 8mm} h2 {font-size:18pt;color:#17395b;margin:9mm 0 4mm}
h3 {font-size:12.5pt;color:#236080;margin:7mm 0 3mm} h1,h2,h3 {break-after:avoid} .major {break-before:page}
p {margin:0 0 3mm;orphans:3;widows:3} a {color:#236080;text-decoration:none} code {font-size:9pt}
table {width:100%;border-collapse:collapse;table-layout:fixed;font-size:9pt;line-height:1.32;margin:3mm 0 6mm}
thead {display:table-header-group} tr {break-inside:avoid} th,td {border:1px solid #b7c8d8;padding:2.3mm;vertical-align:top;overflow-wrap:break-word}
th {background:#17395b;color:white;text-align:left;font-weight:bold} tbody tr:nth-child(even) {background:#f2f6fa}
td:first-child {font-weight:500} .cover {min-height:245mm;break-after:page;padding-top:12mm} .cover h2 {text-align:center;font-size:21pt}
.cover p {text-align:center} .cover table {font-size:11pt;margin-top:12mm}.cover td:first-child {width:34%;font-weight:bold}
figure {margin:0;break-before:page;break-after:page;break-inside:avoid;height:245mm;display:flex;flex-direction:column;align-items:center;justify-content:center}
figcaption {font-size:11pt;font-weight:bold;color:#17395b;margin-bottom:6mm;text-align:center}
figure img {max-width:100%;max-height:222mm;object-fit:contain} figure.wide {page:landscape;height:178mm} figure.wide img {max-height:160mm}
.figure-header {align-self:stretch;margin-bottom:5mm} .figure-header h2,.figure-header h3 {margin:0 0 4mm}
figure.with-heading img {max-height:190mm} figure.wide.with-heading img {max-height:135mm}
@media screen {body {max-width:1050px;padding:40px;margin:auto;background:#fff}.cover {min-height:auto;padding-bottom:50px} figure,figure.wide {height:auto;padding:30px 0} figure img {max-height:850px}.major {border-top:2px solid #17395b;padding-top:15px}}
</style></head><body>${content.join('\n')}</body></html>`;
}

const border = { style: BorderStyle.SINGLE, size: 4, color: 'B7C8D8' };
function tableWidths(rows) {
  const count = rows[0].length;
  if (count === 2) return [2850, 7150];
  if (count === 3 && rows[0][0] === 'Phiên bản') return [1400, 1600, 7000];
  if (count === 3 && rows[0][0].startsWith('Mã /')) return [1850, 3650, 4500];
  if (count === 3 && rows[0][1].startsWith('Yêu cầu/')) return [1400, 4700, 3900];
  if (count === 3) return [2200, 3500, 4300];
  return [1700, 1900, 4100, 2300];
}
function wordTable(rows) {
  const widths = tableWidths(rows);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths,
    borders: { top: border, bottom: border, left: border, right: border, insideH: border, insideV: border },
    rows: rows.map((row, index) => new TableRow({
      tableHeader: index === 0, cantSplit: true,
      children: row.map((cell, column) => new TableCell({
        width: { size: widths[column], type: WidthType.DXA },
        shading: { fill: index === 0 ? '17395B' : index % 2 === 0 ? 'F2F6FA' : 'FFFFFF' },
        margins: { top: 90, bottom: 90, left: 105, right: 105 },
        children: [new Paragraph({ spacing: { after: 0, line: 245 }, children: runs(cell, { size: 19, ...(index === 0 ? { bold: true, color: 'FFFFFF' } : {}) }) })],
      })),
    })),
  });
}

function pageSettings(landscape = false) {
  return { page: { size: { width: 11906, height: 16838, orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }, margin: { top: 850, bottom: 850, left: 1000, right: 900 } } };
}

async function wordDocument(blocks) {
  const sections = [];
  const header = new Header({ children: [new Paragraph({ children: [new TextRun({ text: 'SMARTCOOK  |  SOFTWARE REQUIREMENTS SPECIFICATION', size: 16, color: '6B7C8F' })], border: { bottom: { ...border, space: 5 } } })] });
  const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
    new TextRun({ text: 'SC-SRS-001 • v3.0 • 06/10/2026  |  ', size: 16, color: '6B7C8F' }),
    new TextRun({ children: [PageNumber.CURRENT], size: 16 }),
    new TextRun({ text: ' / ', size: 16 }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16 }),
  ] })] });
  let children = [];
  let trailingHeadings = [];
  let inToc = false;
  function headingParagraph(b, noBreak = false) {
    const major = b.level === 2 && /^\d+\./.test(b.text);
    const cover = b.level === 1 || b.text === 'SMARTCOOK-MOBILE';
    return new Paragraph({
      heading: cover || ['Kiểm soát tài liệu', 'Mục lục'].includes(b.text) ? undefined : b.level === 2 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
      alignment: cover ? AlignmentType.CENTER : AlignmentType.LEFT,
      pageBreakBefore: !noBreak && (major || b.text === 'Kiểm soát tài liệu'), keepNext: true,
      spacing: { before: cover ? 360 : 240, after: 140 },
      children: [new TextRun({ text: b.text, bold: true, color: '17395B', size: cover ? 44 : major ? 32 : b.level === 2 ? 30 : 25 })],
    });
  }
  const flush = (landscape = false) => {
    if (!children.length) return;
    sections.push({ properties: pageSettings(landscape), headers: { default: header }, footers: { default: footer }, children });
    children = [];
  };
  for (const b of blocks) {
    if (b.type === 'heading') inToc = b.text === 'Mục lục';
    if (inToc && b.type === 'number') continue;
    if (b.type === 'diagram') {
      if (trailingHeadings.length) children.splice(-trailingHeadings.length);
      flush();
      const wide = b.width / b.height > 1.4 && b.width > 950;
      const scale = Math.min((wide ? 950 : 650) / b.width, (wide ? trailingHeadings.length ? 450 : 560 : trailingHeadings.length ? 680 : 800) / b.height);
      children.push(...trailingHeadings.map(b => headingParagraph(b, true)));
      trailingHeadings = [];
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 180 }, children: [new TextRun({ text: b.caption, bold: true, size: 23, color: '17395B' })] }));
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: await fs.readFile(path.join(assets, `figure-${String(b.index).padStart(2, '0')}.png`)), transformation: { width: Math.round(b.width * scale), height: Math.round(b.height * scale) }, altText: { title: b.caption, description: b.caption, name: 'Figure ' + b.index } })] }));
      flush(wide);
    } else if (b.type === 'heading') {
      children.push(headingParagraph(b));
      trailingHeadings.push(b);
      if (b.text === 'Mục lục') children.push(new TableOfContents('Mục lục tự động — cập nhật trường trong Word', { hyperlink: true, headingStyleRange: '1-2' }));
    } else if (b.type === 'table') {
      trailingHeadings = [];
      children.push(wordTable(b.rows));
      children.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
    } else {
      trailingHeadings = [];
      children.push(new Paragraph({
        children: runs(b.text), spacing: { after: 105, line: 270 },
        ...(b.type === 'bullet' ? { bullet: { level: 0 } } : {}),
      }));
    }
  }
  flush();
  return new Document({
    creator: 'SmartCook Project Team', title: 'SmartCook Software Requirements Specification', subject: 'SC-SRS-001 v3.0',
    description: 'Reviewed requirements for the SmartCook mobile, web and backend ecosystem.',
    styles: { default: { document: { run: { font: 'Arial', size: 22, color: '233044' }, paragraph: { spacing: { line: 270 } } } } },
    features: { updateFields: true }, sections,
  });
}

async function main() {
  for (const folder of [output, assets, diagramDir]) await fs.mkdir(folder, { recursive: true });
  await fs.access(path.join(assets, 'mermaid.min.js'));
  const md = await fs.readFile(sourcePath, 'utf8');
  const blocks = parse(md);
  const figures = blocks.filter(b => b.type === 'diagram');
  const renderPage = path.join(output, 'diagram-renderer.html');
  await fs.writeFile(renderPage, '<!doctype html><meta charset="utf-8"><style>body{margin:0;background:white}</style><script src="../assets/mermaid.min.js"></script>');
  const chrome = await browser();
  try {
    await chrome.send('Page.navigate', { url: pathToFileURL(renderPage).href });
    let ready = false;
    for (let i = 0; i < 50; i++) {
      ready = await chrome.evaluate('typeof mermaid !== "undefined"');
      if (ready) break;
      await delay(200);
    }
    if (!ready) throw new Error('Mermaid library did not load');
    await chrome.evaluate(`mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'base',themeVariables:{fontFamily:'Arial',fontSize:'17px',primaryColor:'#eff6ff',primaryTextColor:'#17395b',primaryBorderColor:'#497da6',lineColor:'#497da6',secondaryColor:'#f0fdf4',tertiaryColor:'#fff7ed'},flowchart:{htmlLabels:true,useMaxWidth:false},sequence:{useMaxWidth:false},er:{useMaxWidth:false}}); true`);
    for (const b of figures) {
      const number = String(b.index).padStart(2, '0');
      await fs.writeFile(path.join(diagramDir, `${number}.mermaid`), `%% ${b.caption}\n${b.source}\n`);
      const result = await chrome.evaluate(`(async()=>{ const rendered=await mermaid.render('diagram${number}',${JSON.stringify(b.source)}); document.body.innerHTML=rendered.svg; const element=document.querySelector('svg'); element.style.maxWidth='none'; const box=element.viewBox.baseVal; element.setAttribute('width',box.width); element.setAttribute('height',box.height); return {svg:element.outerHTML,width:Math.ceil(box.width),height:Math.ceil(box.height)};})()`);
      Object.assign(b, { width: result.width, height: result.height });
      await fs.writeFile(path.join(assets, `figure-${number}.svg`), result.svg);
      await chrome.send('Emulation.setDeviceMetricsOverride', { width: b.width, height: b.height, deviceScaleFactor: 2, mobile: false });
      const shot = await chrome.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: b.width, height: b.height, scale: 1 } });
      await fs.writeFile(path.join(assets, `figure-${number}.png`), Buffer.from(shot.data, 'base64'));
      console.log(`Rendered ${number}: ${b.width} x ${b.height}`);
    }
    await fs.writeFile(path.join(output, 'SmartCook_SRS.html'), htmlDocument(blocks));
    const doc = await wordDocument(blocks);
    await fs.writeFile(path.join(output, 'SmartCook_SRS.docx'), await Packer.toBuffer(doc));
    await chrome.send('Page.navigate', { url: pathToFileURL(path.join(output, 'SmartCook_SRS.html')).href });
    await delay(800);
    await chrome.evaluate('document.fonts.ready.then(()=>true)');
    await chrome.evaluate('Promise.all(Array.from(document.images).map(i=>i.decode())).then(()=>true)');
    const pdf = await chrome.send('Page.printToPDF', {
      printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
      headerTemplate: '<div style="font-family:Arial;font-size:8px;color:#6b7c8f;width:100%;padding:0 20mm;">SMARTCOOK • SC-SRS-001 • v3.0</div>',
      footerTemplate: '<div style="font-family:Arial;font-size:8px;color:#6b7c8f;width:100%;text-align:right;padding:0 17mm;">06/10/2026 • <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
    await fs.writeFile(path.join(output, 'SmartCook_SRS.pdf'), Buffer.from(pdf.data, 'base64'));
    const mirrored = md.replaceAll('](reference/', '](docs/reference/').replaceAll('](../../smartcook-', '](../smartcook-').replaceAll('](../mobile_', '](mobile_');
    await fs.writeFile(path.join(docs, '../SmartCook_SRS_Format_Chuyen_Nghiep (1).md'), mirrored);
    await fs.writeFile(path.join(output, 'export-manifest.json'), JSON.stringify({ documentVersion: '3.0', reviewDate: '2026-10-06', source: 'docs/SmartCook_SRS.md', figures: figures.map(({ index, caption, width, height }) => ({ index, caption, width, height })), requirements: 48, nonfunctionalRequirements: 15, useCases: 12, acceptanceScenarios: 13 }, null, 2));
    console.log('Exported Word, PDF, HTML and ' + figures.length + ' Mermaid diagrams.');
  } finally { await chrome.close(); }
}

export { browser };
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.stack); process.exitCode = 1; });
}
