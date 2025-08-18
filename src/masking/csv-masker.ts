import { MaskingEngine } from "../masking/regex-masker";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

export async function handleCsvMasking(
  engine: MaskingEngine,
  buffer: Buffer,
  mode?: string
): Promise<Buffer> {
  const csvText = buffer.toString("utf-8");
  const records = parse(csvText);

  for (let row = 0; row < records.length; row++) {
    for (let col = 0; col < records[row].length; col++) {
      const cell = records[row][col];
      if (typeof cell === "string") {
        records[row][col] = await engine.mask(cell, mode);
      }
    }
  }

  const maskedCsv = stringify(records);
  return Buffer.from(maskedCsv, "utf-8");
}
