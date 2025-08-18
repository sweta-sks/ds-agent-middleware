import { MaskingEngine } from "./regex-masker";
import * as XLSX from "xlsx";

export async function handleXlsxMasking(
  engine: MaskingEngine,
  buffer: Buffer,
  mode?: string
): Promise<Buffer> {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet["!ref"] || "");

    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddress];
        if (cell && cell.v && typeof cell.v === "string") {
          cell.v = await engine.mask(cell.v, mode);
        }
      }
    }
  }

  const maskedBuffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });
  return Buffer.from(maskedBuffer);
}
