"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCsvMasking = handleCsvMasking;
const sync_1 = require("csv-parse/sync");
const sync_2 = require("csv-stringify/sync");
async function handleCsvMasking(engine, buffer, mode) {
    const csvText = buffer.toString("utf-8");
    const records = (0, sync_1.parse)(csvText);
    for (let row = 0; row < records.length; row++) {
        for (let col = 0; col < records[row].length; col++) {
            const cell = records[row][col];
            if (typeof cell === "string") {
                records[row][col] = await engine.mask(cell, mode);
            }
        }
    }
    const maskedCsv = (0, sync_2.stringify)(records);
    return Buffer.from(maskedCsv, "utf-8");
}
