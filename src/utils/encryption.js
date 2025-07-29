"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = __importDefault(require("crypto"));
const IV_LENGTH = 16;
function encrypt(text, secretKey) {
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const ENCRYPTION_KEY = crypto_1.default.createHash("sha256").update(secretKey).digest();
    const cipher = crypto_1.default.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([
        cipher.update(text, "utf8"),
        cipher.final(),
    ]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
}
function decrypt(encryptedText) {
    const [ivHex, encryptedHex] = encryptedText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const ENCRYPTION_KEY = crypto_1.default
        .createHash("sha256")
        .update("your-secret-key")
        .digest();
    const decipher = crypto_1.default.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]);
    return decrypted.toString("utf8");
}
