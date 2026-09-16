import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, ShadingType, Footer, PageNumber, convertInchesToTwip } from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MD_FILE = path.join(__dirname, '../SmartCook_SRS_Format_Chuyen_Nghiep (1).md');
const OUT_FILE = path.join(__dirname, 'output/SmartCook_SRS.docx');

function stripAnchors(t) { return t.replace(/\[([^\]]+)\]\(#[^)]*\)/g, ''); }
function stripCode(t) { return t.replace(/`([^`]+)`/g, '').replace(/([^]+)/g, ''); }

function parseInline(raw) {
  raw = stripAnchors(raw); raw = stripCode(raw);
  raw = raw.replace(/\*([^*]+)\*/g, '');
  const runs = []; const re = /\*\*([^*]+)\*\*/g;
  let last = 0, m;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) runs.push(new TextRun({ text: raw.slice(last, m.index), font: 'Arial', size: 22 }));
    runs.push(new TextRun({ text: m[1], bold: true, font: 'Arial', size: 22 }));
    last = m.index + m[0].length;
  }
  if (last < raw.length) runs.push(new TextRun({ text: raw.slice(last), font: 'Arial', size: 22 }));
  return runs.length ? runs : [new TextRun({ text: raw, font: 'Arial', size: 22 })];
}

function getHColor(l) { return l <= 2 ? '1A3A5F' : '2B4B8A'; }
function getHSize(l) { return l === 1 ? 46 : l === 2 ? 30 : 25; }

function makeH(text, l) {
  return new Paragraph({
    heading: l === 1 ? HeadingLevel.HEADING_1 : l === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    alignment: l === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { before: l === 1 ? 400 : 240, after: 120 },
    children: [new TextRun({ text, bold: true, font: 'Arial', size: getHSize(l), color: getHColor(l) })],
  });
}

function makePara(runs) { return new Paragraph({ children: runs, spacing: { after: 100, line: 276 } }); }

function makeBullet(text) {
  const c = text.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
  return new Paragraph({ bullet: { level: 0 }, children: parseInline(c), spacing: { after: 60, line: 276 } });
}

function makePlaceholder() {
  return new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 },
    children: [new TextRun({ text: '[ VI TRI BO SUNG HINH ANH ]', bold: true, italics: true, color: '999999', font: 'Arial', size: 22 })],
    border: { top: { color: 'CCCCCC', space: 1, style: BorderStyle.SINGLE, size: 6 }, bottom: { color: 'CCCCCC', space: 1, style: BorderStyle.SINGLE, size: 6 }, left: { color: 'CCCCCC', space: 1, style: BorderStyle.SINGLE, size: 6 }, right: { color: 'CCCCCC', space: 1, style: BorderStyle.SINGLE, size: 6 } },
  });
}

function makeCode(text) {
  return new Paragraph({ children: [new TextRun({ text, font: 'Courier New', size: 18, color: '333333' })], spacing: { after: 40, line: 240 }, indent: { left: convertInchesToTwip(0.4) } });
}

function parseTable(rows) {
  const data = rows.filter(r => !/^\s*\|[-\s|:]+\|\s*$/.test(r));
  if (data.length < 1) return null;
  const parseRow = l => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  const headers = parseRow(data[0]);
  const body = data.slice(1);
  const colW = Math.floor(9000 / headers.length);
  const makeCell = (text, isH) => new TableCell({
    width: { size: colW, type: WidthType.DXA },
    shading: isH ? { type: ShadingType.SOLID, color: 'DCE8F5', fill: 'DCE8F5' } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: parseInline(text), spacing: { after: 0, line: 240 } })],
  });
  const bStyle = { style: BorderStyle.SINGLE, size: 4, color: 'A8C4DE' };
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map(c => makeCell(c, true)) }),
      ...body.map(r => new TableRow({ children: parseRow(r).map(c => makeCell(c, false)) }))
    ],
    borders: { top: bStyle, bottom: bStyle, left: bStyle, right: bStyle, insideH: bStyle, insideV: bStyle },
  });
}

function parseMarkdown(md) {
  const stopMarker = '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501';
  const stop = md.indexOf(stopMarker);
  const content = stop !== -1 ? md.slice(0, stop) : md;
  const lines = content.split(/\r?\n/);
  const els = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^-{3,}$/.test(line.trim())) { i++; continue; }
    if (/^# /.test(line)) { els.push(makeH(line.replace(/^# /, '').trim(), 1)); i++; continue; }
    if (/^## /.test(line)) { els.push(makeH(line.replace(/^## /, '').trim(), 2)); i++; continue; }
    if (/^### /.test(line)) { els.push(makeH(line.replace(/^### /, '').trim(), 3)); i++; continue; }
    if (/^`/.test(line)) {
      i++;
      const code = [];
      while (i < lines.length && !/^`/.test(lines[i])) { code.push(lines[i]); i++; }
      i++;
      code.forEach(cl => els.push(makeCode(cl)));
      els.push(new Paragraph({ children: [], spacing: { after: 100 } }));
      continue;
    }
    if (/^\|/.test(line.trim())) {
      const tl = [];
      while (i < lines.length && /^\|/.test(lines[i].trim())) { tl.push(lines[i]); i++; }
      const t = parseTable(tl);
      if (t) { els.push(t); els.push(new Paragraph({ children: [], spacing: { after: 140 } })); }
      continue;
    }
    if (/b.?\s*sung\s*.nh/i.test(line)) { els.push(makePlaceholder()); i++; continue; }
    if (/^-\s+\[.+\]\(#.+\)/.test(line.trim())) {
      const text = line.replace(/^-\s+\[([^\]]+)\]\(#[^)]*\)/, '').trim();
      els.push(makeBullet(text)); i++; continue;
    }
    if (/^[-*]\s+/.test(line.trim()) || /^\d+\.\s+/.test(line.trim())) { els.push(makeBullet(line.trim())); i++; continue; }
    if (/^>/.test(line.trim())) {
      const text = line.replace(/^>\s*/, '').trim();
      els.push(new Paragraph({ children: parseInline(text), indent: { left: convertInchesToTwip(0.4) }, spacing: { after: 80, line: 276 }, border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'A8C4DE', space: 8 } } }));
      i++; continue;
    }
    if (line.trim() === '') { i++; continue; }
    const runs = parseInline(line.trim());
    if (runs.length) els.push(makePara(runs));
    i++;
  }
  return els;
}

async function main() {
  const md = fs.readFileSync(MD_FILE, 'utf-8');
  const children = parseMarkdown(md);
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 22 }, paragraph: { spacing: { line: 276 } } } } },
    sections: [{
      properties: { page: { margin: { top: convertInchesToTwip(1), right: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1.25) } } },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SmartCook SRS v2.4.0  |  Trang ', font: 'Arial', size: 18, color: '888888' }), new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: '888888' }), new TextRun({ text: ' / ', font: 'Arial', size: 18, color: '888888' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: 18, color: '888888' })] })] })
      },
      children,
    }],
  });
  const buf = await Packer.toBuffer(doc);
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, buf);
  console.log('OK:' + OUT_FILE);
}
main().catch(e => { console.error('ERR:' + e.message); process.exit(1); });
