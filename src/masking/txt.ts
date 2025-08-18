import { MaskingEngine } from "../masking/regex-masker";

export async function handleTxtMasking(
  engine: MaskingEngine,
  buffer: Buffer,
  mode?: string
): Promise<Buffer> {
  const text = buffer.toString("utf-8");
  const maskedText = await engine.mask(text, mode);
  return Buffer.from(maskedText, "utf-8");
}
