import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
const logo = await readFile(new URL("public/logoSCX.svg", root), "utf8");
const paths = logo.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
// Center the original 48×34 artwork on a square without changing its aspect ratio.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" fill="white"/><g transform="translate(0 7)" fill="none">${paths}</g></svg>`;
await writeFile(new URL("public/icons/favicon-v2.svg", root), svg);

async function png(size) {
  return sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toBuffer();
}

for (const size of [32, 192, 512]) {
  await writeFile(new URL(`public/icons/app-icon-v2-${size}.png`, root), await png(size));
}
await writeFile(new URL("app/apple-icon.png", root), await png(180));

// ICO directory entries point to complete PNG frames, supported by modern browsers.
const sizes = [16, 32, 48];
const frames = await Promise.all(sizes.map(png));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index];
  header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile(new URL("app/favicon.ico", root), Buffer.concat([header, ...frames]));
console.log("Generated square favicon, Apple touch icon, and app icons from logoSCX.svg.");
