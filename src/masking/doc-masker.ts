import { MaskingEngine } from "../masking/regex-masker";
import * as unzipper from "unzipper";
import * as JSZip from "jszip";
import { parseStringPromise, Builder } from "xml2js";
import * as stream from "stream";
import { promisify } from "util";

const streamPipeline = promisify(stream.pipeline);

export async function handleDocxMasking(
  engine: MaskingEngine,
  buffer: Buffer
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);

  const docXmlPath = "word/document.xml";
  const xmlData = await zip.file(docXmlPath)?.async("string");

  if (!xmlData) throw new Error("document.xml not found");

  const parsed = await parseStringPromise(xmlData);

  const maskTextNodes = async (node: any): Promise<void> => {
    if (typeof node !== "object" || node === null) return;

    for (const key of Object.keys(node)) {
      if (key === "w:t" && Array.isArray(node[key])) {
        for (let i = 0; i < node[key].length; i++) {
          const item = node[key][i];
          // Case: plain text
          if (typeof item === "string") {
            node[key][i] = await engine.mask(item);
          }
          // Case: object with "_" (actual text content)
          else if (typeof item === "object" && item._) {
            item._ = await engine.mask(item._);
          }
        }
      } else {
        const children = Array.isArray(node[key]) ? node[key] : [node[key]];
        for (const child of children) {
          await maskTextNodes(child);
        }
      }
    }
  };

  await maskTextNodes(parsed);

  const builder = new Builder();
  const modifiedXml = builder.buildObject(parsed);

  zip.file(docXmlPath, modifiedXml);

  const newBuffer = await zip.generateAsync({ type: "nodebuffer" });
  return newBuffer;
}
