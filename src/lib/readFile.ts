// Browser-only: turns a dropped file into plain text, on this device.
export const ACCEPT = ".pdf,.txt,.eml,.mbox,.csv,.tsv,.json,.md,.log,.html,.htm,.xml,.rtf,text/*";
const TEXT_EXT = /\.(txt|eml|mbox|csv|tsv|json|md|log|html?|xml|rtf)$/i;

async function readPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
  }
  return pages.join("\n");
}

export async function readFile(file: File): Promise<string> {
  if (/\.pdf$/i.test(file.name)) return readPdf(file);
  if (!TEXT_EXT.test(file.name) && !file.type.startsWith("text/")) throw new Error("Unsupported type");
  const text = await file.text();
  if (/\.html?$/i.test(file.name)) return new DOMParser().parseFromString(text, "text/html").body.textContent ?? "";
  return text;
}
