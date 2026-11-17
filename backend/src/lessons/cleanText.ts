// Text helpers shared by all readers: clean-up, word count, XML entities and tag counting.

// One space between words, trimmed lines, at most one empty line between paragraphs.
export function cleanText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t  -​　]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Counts real words only, so table separators like "|" are not counted.
export function countWords(text: string): number {
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

export function decodeXmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// Counts opening tags like <w:tbl> or <w:tbl attr="..."> (but not <w:tblPr>).
export function countTags(xml: string, tag: string): number {
  return xml.match(new RegExp(`<${tag}[\\s>/]`, "g"))?.length ?? 0;
}
