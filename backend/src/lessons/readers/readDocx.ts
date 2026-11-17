// Reads the text of a Word (.docx) file with mammoth. The whole file is one unit.
// Table cells of one row come out on one line, separated by " | ". Pictures are dropped.
import type JSZip from "jszip";
import mammoth from "mammoth";
import { countTags, decodeXmlEntities } from "../cleanText";
import type { ReaderResult } from "./types";

export async function readDocx(buffer: Buffer, zip: JSZip): Promise<ReaderResult> {
  const documentXml = (await zip.file("word/document.xml")?.async("string")) ?? "";

  // convertToHtml keeps the table structure (extractRawText puts every cell on its own line).
  // Pictures are replaced by an empty tag, so they never reach the text.
  const { value: html } = await mammoth.convertToHtml(
    { buffer },
    { convertImage: mammoth.images.imgElement(async () => ({ src: "" })) },
  );

  return {
    units: [htmlToText(html)],
    tablesRead: countTags(documentXml, "w:tbl"),
    picturesSkipped: countTags(documentXml, "w:drawing"),
  };
}

// Mammoth's HTML is simple and predictable, so a few replacements are enough.
function htmlToText(html: string): string {
  const withTables = html.replace(/<tr>([\s\S]*?)<\/tr>/g, (_row, cells: string) => {
    const cellTexts = [...cells.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((cell) =>
      stripTags((cell[1] ?? "").replace(/<\/p>/g, " ")).replace(/\s+/g, " ").trim(),
    );
    return `${cellTexts.join(" | ")}<br>`; // one line per row; </table> closes the block
  });

  return decodeXmlEntities(
    stripTags(withTables.replace(/<br\s*\/?>/g, "\n").replace(/<\/(p|h[1-6]|li|table)>/g, "\n\n")),
  );
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}
