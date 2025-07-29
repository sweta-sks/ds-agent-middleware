import crypto from "crypto";

const IV_LENGTH = 16;

export function encrypt(text: string, secretKey: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const ENCRYPTION_KEY = crypto.createHash("sha256").update(secretKey).digest();

  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(encryptedText: string): string {
  const [ivHex, encryptedHex] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const ENCRYPTION_KEY = crypto
    .createHash("sha256")
    .update("your-secret-key")
    .digest();

  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
