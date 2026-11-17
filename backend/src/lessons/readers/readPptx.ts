// Reads the text of a PowerPoint (.pptx) file slide by slide, in PowerPoint's own slide order.
// Text runs (<a:t>) are joined per paragraph; table rows become "cell | cell" lines.
// Speaker notes (ppt/notesSlides) are not read.
import path from "node:path";
import type JSZip from "jszip";
import { countTags, decodeXmlEntities } from "../cleanText";
import type { ReaderResult } from "./types";

export async function readPptx(zip: JSZip): Promise<ReaderResult> {
  const slidePaths = (await slidesInShowOrder(zip)) ?? slidesByFileNumber(zip);

  const units: string[] = [];
  let tablesRead = 0;
  let picturesSkipped = 0;

  for (const slidePath of slidePaths) {
    const xml = (await zip.file(slidePath)?.async("string")) ?? "";
    tablesRead += countTags(xml, "a:tbl");
    picturesSkipped += countTags(xml, "p:pic");
    units.push(slideText(xml));
  }

  return { units, tablesRead, picturesSkipped };
}

// PowerPoint's own order: the <p:sldId r:id="..."> list in presentation.xml, where each
// r:id points to a slide file through presentation.xml.rels. Returns null if that cannot be read.
async function slidesInShowOrder(zip: JSZip): Promise<string[] | null> {
  const presentation = await zip.file("ppt/presentation.xml")?.async("string");
  const rels = await zip.file("ppt/_rels/presentation.xml.rels")?.async("string");
  if (!presentation || !rels) return null;

  const targetById = new Map<string, string>();
  for (const tag of rels.match(/<Relationship\s[^>]*>/g) ?? []) {
    const id = attribute(tag, "Id");
    const target = attribute(tag, "Target");
    if (id && target) targetById.set(id, target);
  }

  const paths: string[] = [];
  for (const tag of presentation.match(/<p:sldId\s[^>]*>/g) ?? []) {
    const target = targetById.get(attribute(tag, "r:id") ?? "");
    if (!target) return null;
    // Targets are relative to ppt/ ("slides/slide1.xml"), or absolute ("/ppt/slides/slide1.xml").
    const slidePath = target.startsWith("/")
      ? target.slice(1)
      : path.posix.normalize(path.posix.join("ppt", target));
    if (!zip.file(slidePath)) return null;
    paths.push(slidePath);
  }
  return paths.length ? paths : null;
}

// Fallback: slide2 before slide10, sorted by the number in the file name.
function slidesByFileNumber(zip: JSZip): string[] {
  return Object.keys(zip.files)
    .map((filePath) => ({ filePath, number: Number(/^ppt\/slides\/slide(\d+)\.xml$/.exec(filePath)?.[1]) }))
    .filter((slide) => Number.isInteger(slide.number))
    .sort((a, b) => a.number - b.number)
    .map((slide) => slide.filePath);
}

function attribute(tag: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
}

function slideText(xml: string): string {
  // Turn each table row into one paragraph "cell | cell" before reading the paragraphs.
  const withTables = xml.replace(/<a:tr[\s>][\s\S]*?<\/a:tr>/g, (row) => {
    const cells = row.match(/<a:tc[\s>][\s\S]*?<\/a:tc>/g) ?? [];
    const line = cells.map((cell) => paragraphs(cell).join(" ").trim()).join(" | ");
    return `<a:p><a:r><a:t>${escapeXml(line)}</a:t></a:r></a:p>`;
  });
  return paragraphs(withTables).join("\n");
}

// Text of each <a:p> paragraph; <a:br/> inside a paragraph becomes a line break.
function paragraphs(xml: string): string[] {
  const found = xml.match(/<a:p>[\s\S]*?<\/a:p>|<a:p\s[^>]*[^/]>[\s\S]*?<\/a:p>/g) ?? [];
  return found.map((paragraph) => {
    const parts = paragraph.match(/<a:t>[^<]*<\/a:t>|<a:br[\s/>]/g) ?? [];
    return decodeXmlEntities(
      parts.map((part) => (part.startsWith("<a:br") ? "\n" : part.slice(5, -6))).join(""),
    );
  });
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
