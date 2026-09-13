import { jsPDF } from "jspdf";

export type ProblemPdfDetails = { title: string; code?: number | string | null; difficulty: string; locale: string; url: string; addedBy?: string | null; chapter?: string | null };

async function imageData(url: string, width?: number) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = url;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width || image.naturalWidth;
  canvas.height = Math.round(canvas.width * image.naturalHeight / image.naturalWidth);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image could not be rendered");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { data: canvas.toDataURL("image/png"), ratio: canvas.height / canvas.width };
}

export async function createProblemPdf(content: HTMLElement, details: ProblemPdfDetails) {
  const [fonts, logo] = await Promise.all([
    Promise.all(["LiberationSans-Regular", "LiberationSans-Bold", "LiberationMono-Regular"].map(async name => {
      const response = await fetch(`/fonts/${name}.ttf`);
      if (!response.ok) throw new Error("PDF font unavailable");
      let binary = "";
      for (const byte of new Uint8Array(await response.arrayBuffer())) binary += String.fromCharCode(byte);
      return { name, data: btoa(binary) };
    })), imageData("/logo-text.svg", 1800),
  ]);
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  for (const font of fonts) {
    pdf.addFileToVFS(`${font.name}.ttf`, font.data);
    pdf.addFont(`${font.name}.ttf`, font.name.includes("Mono") ? "Mono" : "Sans", font.name.includes("Bold") ? "bold" : "normal");
  }
  pdf.setFont("Sans");
  pdf.setProperties({ title: details.title, creator: "ScripticX", subject: details.locale === "ro" ? "Enunț problemă" : "Problem statement" });
  const left = 14, right = 196, bottom = 275, width = right - left;
  let y = 18;
  const decorate = () => {
    pdf.saveGraphicsState();
    pdf.setGState(pdf.GState({ opacity: 0.13 }));
    const logoWidth = 150, logoHeight = logoWidth * logo.ratio;
    const angle = 28 * Math.PI / 180;
    const logoX = 105 - logoWidth * Math.cos(angle) / 2 + logoHeight * Math.sin(angle) / 2;
    for (const centerY of [85, 205]) {
      const logoY = centerY - logoHeight + logoWidth * Math.sin(angle) / 2 + logoHeight * Math.cos(angle) / 2;
      pdf.addImage(logo.data, "PNG", logoX, logoY, logoWidth, logoHeight, "wordmark", "FAST", 28);
    }
    pdf.restoreGraphicsState();
    pdf.setTextColor(24, 24, 27);
  };
  decorate();
  const nextPage = () => { pdf.addPage(); decorate(); y = 18; };
  const ensure = (height: number) => { if (y + height > bottom) nextPage(); };
  const text = (value: string, size = 12, indent = 0, pre = false, bold = false) => {
    pdf.setFont(pre ? "Mono" : "Sans", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines: string[] = pdf.splitTextToSize(value, width - indent);
    const leading = size * 0.48;
    for (const line of lines) {
      ensure(leading);
      pdf.text(line, left + indent, y);
      y += leading;
    }
    y += 1.5;
  };
  text(`ScripticX / ${details.locale === "ro" ? "Problema" : "Problem"} / ${details.title}${details.code != null ? ` · ID #${details.code}` : ""}`, 10.5);
  y += 2;
  const titlePrefix = `${details.locale === "ro" ? "Problema" : "Problem"} `;
  pdf.setFont("Sans", "normal"); pdf.setFontSize(22);
  const prefixWidth = pdf.getTextWidth(titlePrefix);
  pdf.text(titlePrefix, left, y);
  pdf.setFont("Sans", "bold");
  const titleLines = pdf.splitTextToSize(details.title, width - prefixWidth) as string[];
  for (const [index, line] of titleLines.entries()) {
    ensure(9);
    pdf.text(line, left + (index === 0 ? prefixWidth : 0), y);
    y += 9;
  }
  pdf.setFont("Sans", "normal");
  pdf.setFontSize(10);
  pdf.setDrawColor(220, 220, 225);
  let badgeX = left;
  for (const label of [details.difficulty, "MiniScript+", "Format PDF"]) {
    const badgeWidth = pdf.getTextWidth(label) + 8;
    pdf.roundedRect(badgeX, y - 3, badgeWidth, 8, 4, 4);
    pdf.text(label, badgeX + 4, y + 2);
    badgeX += badgeWidth + 2;
  }
  y += 11;

  async function renderChildren(parent: HTMLElement, indent: number) {
    const nodes = Array.from(parent.childNodes).filter(node => node.nodeType !== Node.TEXT_NODE || node.textContent?.trim());
    for (let index = 0; index < nodes.length; index++) {
      const group = nodes.slice(index, index + 4);
      if (group.length === 4 && group.every(node => node instanceof HTMLElement) &&
          /^(H3|H4|P)$/.test((group[0] as HTMLElement).tagName) && (group[1] as HTMLElement).tagName === "PRE" &&
          /^(H3|H4|P)$/.test((group[2] as HTMLElement).tagName) && (group[3] as HTMLElement).tagName === "PRE" &&
          /^(input|intrare|date de intrare|se citește)\s*:?$/i.test(group[0].textContent?.trim() || "") &&
          /^(output|ieșire|date de ieșire|se afișează)\s*:?$/i.test(group[2].textContent?.trim() || "")) {
        pdf.setFont("Mono", "normal"); pdf.setFontSize(11);
        const columns = [group[1], group[3]].map(node => pdf.splitTextToSize(node.textContent?.trimEnd() || "", width / 2 - 8) as string[]);
        ensure(Math.min(12 + Math.max(...columns.map(lines => lines.length)) * 5.3, 60));
        pdf.setFont("Sans", "normal"); pdf.setFontSize(12);
        pdf.text(group[0].textContent || "", left, y);
        pdf.text(group[2].textContent || "", left + width / 2, y);
        y += 8;
        pdf.setFont("Mono", "normal"); pdf.setFontSize(11);
        for (let line = 0; line < Math.max(...columns.map(lines => lines.length)); line++) {
          ensure(5.3);
          columns.forEach((lines, column) => { if (lines[line]) pdf.text(lines[line], left + 2 + column * width / 2, y); });
          y += 5.3;
        }
        y += 4; index += 3;
      } else await render(nodes[index], indent);
    }
  }

  async function render(node: Node, indent = 0): Promise<void> {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent?.trim()) text(node.textContent.trim(), 12, indent);
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName;
    if (tag === "IMG") {
      const image = await imageData((node as HTMLImageElement).src);
      const imageWidth = Math.min(width - indent, 150, 210 / image.ratio);
      const height = imageWidth * image.ratio;
      ensure(height + 6);
      pdf.addImage(image.data, "PNG", left + indent, y, imageWidth, height);
      y += height + 6;
    } else if (/^H[1-6]$/.test(tag)) {
      ensure(20);
      y += 2;
      text(node.textContent || "", tag === "H1" ? 19 : tag === "H2" ? 17 : 12, indent, false, tag !== "H3");
    } else if (tag === "PRE") {
      text(node.textContent?.replace(/\n$/, "") || "", 11, indent + 2, true);
    } else if (tag === "TABLE") {
      for (const row of Array.from(node.querySelectorAll("tr"))) {
        const cells = Array.from(row.children);
        const cellWidth = (width - indent) / Math.max(1, cells.length);
        pdf.setFont("Sans", row.querySelector("th") ? "bold" : "normal"); pdf.setFontSize(11);
        const columns = cells.map(cell => pdf.splitTextToSize(cell.textContent || "", cellWidth - 6) as string[]);
        const count = Math.max(...columns.map(lines => lines.length));
        ensure(Math.min(count * 5 + 6, 35));
        for (let line = 0; line < count; line++) {
          ensure(5);
          columns.forEach((lines, column) => { if (lines[line]) pdf.text(lines[line], left + indent + column * cellWidth + 3, y); });
          y += 5;
        }
        pdf.setDrawColor(220, 220, 225);
        pdf.line(left + indent, y, right, y);
        y += 6;
      }
    } else if (tag === "UL" || tag === "OL") {
      for (const [index, item] of Array.from(node.children).entries()) {
        ensure(6);
        pdf.setFont("Sans", "normal"); pdf.setFontSize(12);
        pdf.text(tag === "OL" ? `${index + 1}.` : "•", left + indent, y);
        const inline = Array.from(item.childNodes).filter(child => !(child instanceof HTMLElement && /^(UL|OL)$/.test(child.tagName)));
        const onlyCode = inline.length === 1 && inline[0] instanceof HTMLElement && inline[0].tagName === "CODE";
        text(inline.map(child => child.textContent || "").join(""), 12, indent + 5, onlyCode);
        for (const child of Array.from(item.children)) if (/^(UL|OL)$/.test(child.tagName)) await render(child, indent + 5);
      }
    } else if ((tag === "P" && !node.querySelector("img")) || tag === "BLOCKQUOTE") {
      text(node.textContent || "", 12, indent);
    } else if (tag === "HR") {
      ensure(8); pdf.setDrawColor(220, 220, 225); pdf.line(left, y, right, y); y += 8;
    } else {
      await renderChildren(node, indent);
    }
  }
  await renderChildren(content, 0);
  const ro = details.locale === "ro";
  const unspecified = ro ? "Nespecificat" : "Not specified";
  const metadataRows = [
    { cells: ["ID", details.code != null ? `#${details.code}` : "-", ro ? "Autor" : "Author", details.addedBy || unspecified], widths: [24, 48, 44, 66] },
    { cells: [ro ? "Set" : "Collection", "ScripticX", ro ? "Adăugată de" : "Added by", details.addedBy || unspecified], widths: [24, 48, 44, 66] },
    { cells: [ro ? "Capitol" : "Chapter", details.chapter || (ro ? "Probleme neclasificate" : "Unclassified problems")], widths: [24, 158] },
    { cells: [ro ? "Licență" : "License", `MIT License\nCopyright (c) ScripticX SRL\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`], widths: [24, 158], small: true },
  ];
  y += 8;
  const measuredRows = metadataRows.map(row => {
    const columns = row.cells.map((value, index) => {
      pdf.setFont("Sans", index % 2 === 0 ? "bold" : "normal");
      pdf.setFontSize(row.small && index === 1 ? 9 : 11);
      return pdf.splitTextToSize(value, row.widths[index] - 5) as string[];
    });
    const leading = row.small ? 3.8 : 5;
    const height = Math.max(...columns.map(lines => lines.length)) * leading + 6;
    return { row, columns, leading, height };
  });
  for (let start = 0; start < measuredRows.length;) {
    ensure(measuredRows[start].height + 4);
    let end = start, containerHeight = 4;
    while (end < measuredRows.length && y + containerHeight + measuredRows[end].height <= bottom) {
      containerHeight += measuredRows[end].height;
      end++;
    }
    if (end === start) throw new Error("PDF metadata exceeds the page height");
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(220, 220, 225);
    pdf.setLineWidth(0.25);
    pdf.roundedRect(left - 4, y, width + 8, containerHeight, 3, 3, "FD");
    y += 2;
    measuredRows.slice(start, end).forEach(({ row, columns, leading, height }, rowIndex) => {
      if (rowIndex > 0) pdf.line(left - 4, y, right + 4, y);
      let x = left;
      columns.forEach((lines, index) => {
        pdf.setFont("Sans", index % 2 === 0 ? "bold" : "normal");
        pdf.setFontSize(row.small && index === 1 ? 9 : 11);
        lines.forEach((line, lineIndex) => pdf.text(line, x, y + 6 + lineIndex * leading));
        x += row.widths[index];
      });
      y += height;
    });
    y += 2;
    start = end;
    if (start < measuredRows.length) nextPage();
  }
  for (let page = 1; page <= pdf.getNumberOfPages(); page++) {
    pdf.setPage(page);
    pdf.setDrawColor(220, 220, 225);
    pdf.line(left, 281, right, 281);
    pdf.setTextColor(90, 90, 95);
    pdf.setFont("Sans", "normal");
    pdf.setFontSize(8);
    pdf.textWithLink("ScripticX / " + (details.code != null ? `#${details.code}` : (details.locale === "ro" ? "Problemă" : "Problem")), left, 287, { url: details.url });
    pdf.text(`${page} / ${pdf.getNumberOfPages()}`, right, 287, { align: "right" });
  }
  return pdf;
}
