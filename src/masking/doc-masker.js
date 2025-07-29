"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDocxMasking = handleDocxMasking;
const JSZip = __importStar(require("jszip"));
const xml2js_1 = require("xml2js");
const stream = __importStar(require("stream"));
const util_1 = require("util");
const streamPipeline = (0, util_1.promisify)(stream.pipeline);
async function handleDocxMasking(engine, buffer, mode) {
    const zip = await JSZip.loadAsync(buffer);
    const docXmlPath = "word/document.xml";
    const xmlData = await zip.file(docXmlPath)?.async("string");
    if (!xmlData)
        throw new Error("document.xml not found");
    const parsed = await (0, xml2js_1.parseStringPromise)(xmlData);
    const maskTextNodes = async (node) => {
        if (typeof node !== "object" || node === null)
            return;
        for (const key of Object.keys(node)) {
            if (key === "w:t" && Array.isArray(node[key])) {
                for (let i = 0; i < node[key].length; i++) {
                    const item = node[key][i];
                    // Case: plain text
                    if (typeof item === "string") {
                        node[key][i] = await engine.mask(item, mode);
                    }
                    // Case: object with "_" (actual text content)
                    else if (typeof item === "object" && item._) {
                        item._ = await engine.mask(item._, mode);
                    }
                }
            }
            else {
                const children = Array.isArray(node[key]) ? node[key] : [node[key]];
                for (const child of children) {
                    await maskTextNodes(child);
                }
            }
        }
    };
    await maskTextNodes(parsed);
    const builder = new xml2js_1.Builder();
    const modifiedXml = builder.buildObject(parsed);
    zip.file(docXmlPath, modifiedXml);
    const newBuffer = await zip.generateAsync({ type: "nodebuffer" });
    return newBuffer;
}
