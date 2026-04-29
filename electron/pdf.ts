function toPdfLiteralString(text: string) {
  let out = "(";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const code = text.charCodeAt(i);
    if (ch === "\\") out += "\\\\";
    else if (ch === "(") out += "\\(";
    else if (ch === ")") out += "\\)";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "";
    else if (code >= 0x20 && code <= 0x7e) out += ch;
    else out += "?";
  }
  out += ")";
  return out;
}

function buildPdfContentStream(text: string) {
  const lines = text.split(/\r\n|\n|\r/);
  const parts: string[] = [];
  parts.push("BT");
  parts.push("/F1 12 Tf");
  parts.push("14 TL");
  parts.push("72 800 Td");
  for (let i = 0; i < lines.length; i += 1) {
    parts.push(`${toPdfLiteralString(lines[i])} Tj`);
    if (i < lines.length - 1) parts.push("T*");
  }
  parts.push("ET");
  return parts.join("\n");
}

function assemblePdf(text: string, paddingLength?: number) {
  const contentStream = buildPdfContentStream(text);
  const contentStreamPayload = `${contentStream}\n`;
  const contentLength = Buffer.byteLength(contentStreamPayload, "utf8");
  const objects: Array<{ id: number; content: string }> = [
    {
      id: 1,
      content: "<< /Type /Catalog /Pages 2 0 R >>",
    },
    {
      id: 2,
      content: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    },
    {
      id: 3,
      content:
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    },
    {
      id: 4,
      content: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    },
    {
      id: 5,
      content: `<< /Length ${contentLength} >>\nstream\n${contentStreamPayload}endstream`,
    },
  ];
  if (paddingLength !== undefined) {
    const paddingStream = "0".repeat(Math.max(0, paddingLength));
    const paddingStreamPayload = `${paddingStream}\n`;
    const paddingBytes = Buffer.byteLength(paddingStreamPayload, "utf8");
    objects.push({
      id: 6,
      content: `<< /Length ${paddingBytes} >>\nstream\n${paddingStreamPayload}endstream`,
    });
  }
  const header = "%PDF-1.4\n%mockany\n";
  const parts: string[] = [header];
  const offsets: number[] = [];
  let offset = Buffer.byteLength(header, "utf8");
  for (const obj of objects) {
    offsets[obj.id] = offset;
    const chunk = `${obj.id} 0 obj\n${obj.content}\nendobj\n`;
    parts.push(chunk);
    offset += Buffer.byteLength(chunk, "utf8");
  }
  const xrefOffset = offset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  const pdf = parts.join("") + xref + trailer;
  return new Uint8Array(Buffer.from(pdf, "utf8"));
}

export function buildPdfBytes(text: string, targetBytes?: number) {
  const contentText = text || "Mockany PDF";
  const minPdf = assemblePdf(contentText);
  const minSize = minPdf.byteLength;
  if (typeof targetBytes !== "number" || !Number.isFinite(targetBytes)) {
    return minPdf;
  }
  const target = Math.max(0, Math.floor(targetBytes));
  if (target <= minSize) return minPdf;
  const baseWithPadding = assemblePdf(contentText, 0);
  const baseSize = baseWithPadding.byteLength;
  if (baseSize > target) return minPdf;
  let paddingBytes = Math.max(0, target - baseSize);
  let best = baseWithPadding;
  let bestDelta = Math.abs(baseSize - target);
  for (let i = 0; i < 12; i += 1) {
    const pdf = assemblePdf(contentText, paddingBytes);
    const size = pdf.byteLength;
    const delta = target - size;
    if (Math.abs(delta) < bestDelta) {
      best = pdf;
      bestDelta = Math.abs(delta);
    }
    if (delta === 0) return pdf;
    paddingBytes = Math.max(0, paddingBytes + delta);
  }
  return best;
}
