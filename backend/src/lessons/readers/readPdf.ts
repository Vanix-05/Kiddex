// Reads the text of a PDF page by page with unpdf (a Node-ready build of Mozilla's pdf.js).
// Pictures are ignored; a scanned page simply gives an empty string.
import { getDocumentProxy } from "unpdf";
import { lessonErrors } from "../lessonErrors";
import type { ReaderResult } from "./types";

export async function readPdf(buffer: Buffer): Promise<ReaderResult> {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    // pdf.js may take over the array it is given, so pass a copy.
    pdf = await getDocumentProxy(new Uint8Array(buffer));
  } catch (err) {
    if ((err as { name?: string })?.name === "PasswordException") throw lessonErrors.pdfLocked();
    throw err;
  }

  try {
    const units: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        text += item.str + (item.hasEOL ? "\n" : "");
      }
      units.push(text);
      page.cleanup();
    }
    // A PDF cannot tell us reliably what is a table or a picture.
    return { units, tablesRead: null, picturesSkipped: null };
  } finally {
    // Frees the document and its worker memory.
    await pdf.loadingTask.destroy();
  }
}
