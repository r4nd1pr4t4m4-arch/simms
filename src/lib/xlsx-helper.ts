import zlib from "zlib";

/**
 * Helper CRC32 untuk format ZIP OpenXML (.xlsx)
 */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Buat arsip ZIP di memori dari daftar file { name, data }
 */
function createZipBuffer(files: Array<{ name: string; data: Buffer }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, "utf-8");
    const uncompressed = file.data;
    const compressed = zlib.deflateRawSync(uncompressed);
    const crc = crc32(uncompressed);

    // Local file header (30 bytes + name)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(8, 8); // compression method: deflate (8)
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0, 12); // mod date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(uncompressed.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra len

    localParts.push(localHeader, nameBuf, compressed);

    // Central directory header (46 bytes + name)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // flags
    centralHeader.writeUInt16LE(8, 10); // method: deflate
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(uncompressed.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += 30 + nameBuf.length + compressed.length;
  }

  const centralBuffer = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralBuffer, eocd]);
}

/**
 * Ekstrak file-file XML dari buffer ZIP (.xlsx)
 */
function extractZipEntries(zipBuf: Buffer): Record<string, string> {
  const entries: Record<string, string> = {};

  // Cari End of Central Directory (EOCD) dari belakang
  let eocdPos = -1;
  for (let i = zipBuf.length - 22; i >= Math.max(0, zipBuf.length - 65557); i--) {
    if (zipBuf.readUInt32LE(i) === 0x06054b50) {
      eocdPos = i;
      break;
    }
  }
  if (eocdPos === -1) {
    throw new Error("Format file bukan file Excel (.xlsx) yang valid");
  }

  const totalEntries = Math.min(zipBuf.readUInt16LE(eocdPos + 10), 64);
  let cdPos = zipBuf.readUInt32LE(eocdPos + 16);

  for (let i = 0; i < totalEntries; i++) {
    if (cdPos + 46 > zipBuf.length) break;
    if (zipBuf.readUInt32LE(cdPos) !== 0x02014b50) break;
    const method = zipBuf.readUInt16LE(cdPos + 10);
    const compSize = zipBuf.readUInt32LE(cdPos + 20);
    const nameLen = zipBuf.readUInt16LE(cdPos + 28);
    const extraLen = zipBuf.readUInt16LE(cdPos + 30);
    const commentLen = zipBuf.readUInt16LE(cdPos + 32);
    const localOffset = zipBuf.readUInt32LE(cdPos + 42);

    if (cdPos + 46 + nameLen > zipBuf.length || localOffset + 30 > zipBuf.length) {
      break;
    }

    const name = zipBuf.toString("utf-8", cdPos + 46, cdPos + 46 + nameLen);
    const localNameLen = zipBuf.readUInt16LE(localOffset + 26);
    const localExtraLen = zipBuf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    if (dataStart + compSize > zipBuf.length) break;
    const compData = zipBuf.subarray(dataStart, dataStart + compSize);

    if (name.endsWith(".xml") || name.endsWith(".rels")) {
      if (method === 0) {
        if (compData.length > 10 * 1024 * 1024) {
          throw new Error("Ukuran konten XML Excel melebihi batas aman");
        }
        entries[name] = compData.toString("utf-8");
      } else if (method === 8) {
        entries[name] = zlib
          .inflateRawSync(compData, { maxOutputLength: 10 * 1024 * 1024 })
          .toString("utf-8");
      }
    }

    cdPos += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

function escapeXml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function unescapeXml(str: string): string {
  return String(str ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function colIndexToLetter(index: number): string {
  let letter = "";
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function colLetterToIndex(letters: string): number {
  let idx = 0;
  for (let i = 0; i < letters.length; i++) {
    idx = idx * 26 + (letters.charCodeAt(i) - 64);
  }
  return idx - 1;
}

/**
 * Buat file Excel (.xlsx) asli dari array 2D (baris pertama = header)
 */
export function buildXlsxBuffer(
  sheetName: string,
  rows: string[][]
): Buffer {
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF059669"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1"/>
  </cellXfs>
</styleSheet>`;

  const colCount = rows[0]?.length || 1;
  const colsXml = Array.from({ length: colCount })
    .map((_, i) => `<col min="${i + 1}" max="${i + 1}" width="22" customWidth="1"/>`)
    .join("");

  const sheetRowsXml = rows
    .map((row, rIdx) => {
      const rowNum = rIdx + 1;
      const styleIdx = rIdx === 0 ? 1 : 0;
      const cellsXml = row
        .map((cellVal, cIdx) => {
          const ref = `${colIndexToLetter(cIdx)}${rowNum}`;
          return `<c r="${ref}" s="${styleIdx}" t="inlineStr"><is><t>${escapeXml(
            cellVal
          )}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowNum}">${cellsXml}</row>`;
    })
    .join("");

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>${colsXml}</cols>
  <sheetData>${sheetRowsXml}</sheetData>
</worksheet>`;

  return createZipBuffer([
    { name: "[Content_Types].xml", data: Buffer.from(contentTypesXml, "utf-8") },
    { name: "_rels/.rels", data: Buffer.from(relsXml, "utf-8") },
    { name: "xl/workbook.xml", data: Buffer.from(workbookXml, "utf-8") },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(workbookRelsXml, "utf-8") },
    { name: "xl/styles.xml", data: Buffer.from(stylesXml, "utf-8") },
    { name: "xl/worksheets/sheet1.xml", data: Buffer.from(sheetXml, "utf-8") },
  ]);
}

/**
 * Baca file Excel (.xlsx) dan kembalikan array objek sesuai baris header pertama
 */
export function parseXlsxBuffer(
  zipBuf: Buffer
): Array<Record<string, string>> {
  const entries = extractZipEntries(zipBuf);

  // 1. Baca sharedStrings.xml jika ada
  const sharedStrings: string[] = [];
  const ssXml = entries["xl/sharedStrings.xml"];
  if (ssXml) {
    const siMatches = ssXml.match(/<si[\s\S]*?<\/si>/g) || [];
    for (const si of siMatches) {
      const tMatches = si.match(/<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/g) || [];
      const combined = tMatches
        .map((t) => unescapeXml(t.replace(/<\/?t(?:\s+[^>]*)?>/g, "")))
        .join("");
      sharedStrings.push(combined);
    }
  }

  // 2. Temukan worksheet pertama
  const sheetKey =
    Object.keys(entries).find((k) =>
      /^xl\/worksheets\/sheet\d+\.xml$/i.test(k)
    ) || Object.keys(entries).find((k) => k.startsWith("xl/worksheets/"));

  if (!sheetKey || !entries[sheetKey]) {
    throw new Error("Worksheet tidak ditemukan di dalam file .xlsx");
  }

  const sheetXml = entries[sheetKey];
  const rowMatches = sheetXml.match(/<row[\s\S]*?<\/row>/g) || [];
  const matrix: string[][] = [];

  for (const rowXml of rowMatches) {
    const cellMatches =
      rowXml.match(/<c\b[^/>]*(?:\/>|>[\s\S]*?<\/c>)/g) || [];
    const rowArr: string[] = [];

    for (let cIdx = 0; cIdx < cellMatches.length; cIdx++) {
      const cellXml = cellMatches[cIdx];
      const refMatch = cellXml.match(/\br="([A-Z]+)\d+"/);
      const colIdx = refMatch ? colLetterToIndex(refMatch[1]) : cIdx;
      const typeMatch = cellXml.match(/\bt="([^"]+)"/);
      const cellType = typeMatch ? typeMatch[1] : "";

      let val = "";
      if (cellType === "inlineStr") {
        const tMatch = cellXml.match(/<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/);
        val = tMatch ? unescapeXml(tMatch[1]) : "";
      } else {
        const vMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);
        const rawV = vMatch ? unescapeXml(vMatch[1]) : "";
        if (cellType === "s") {
          const ssIdx = parseInt(rawV, 10);
          val = sharedStrings[ssIdx] ?? rawV;
        } else {
          val = rawV;
        }
      }

      rowArr[colIdx] = val.trim();
    }

    if (rowArr.some((v) => v && v.length > 0)) {
      matrix.push(rowArr);
    }
  }

  if (matrix.length < 2) return [];

  const headers = matrix[0].map((h) => (h || "").trim());
  const results: Array<Record<string, string>> = [];

  for (let i = 1; i < matrix.length; i++) {
    const r = matrix[i];
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) {
        obj[h] = r[idx] ?? "";
      }
    });
    if (Object.values(obj).some((v) => v.length > 0)) {
      results.push(obj);
    }
  }

  return results;
}
