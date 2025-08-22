"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTxtMasking = handleTxtMasking;
async function handleTxtMasking(engine, buffer, mode) {
    const text = buffer.toString("utf-8");
    const maskedText = await engine.mask(text, mode);
    return Buffer.from(maskedText, "utf-8");
}
