"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskingStrategies = void 0;
const regex_masker_1 = require("../masking/regex-masker");
const ds_agent_client_1 = require("../api/ds-agent-client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const doc_masker_1 = require("../masking/doc-masker");
const encryption_1 = require("../utils/encryption");
const xlsx_masker_1 = require("../masking/xlsx-masker");
const csv_masker_1 = require("../masking/csv-masker");
exports.maskingStrategies = {
    pdf: (engine, buffer, mode) => engine.handlePDF(buffer, mode),
    json: (engine, buffer, mode) => engine.mask(buffer.toString("utf-8"), mode),
    xml: (engine, buffer, mode) => engine.mask(buffer.toString("utf-8"), mode),
    xlsx: (engine, buffer, mode) => (0, xlsx_masker_1.handleXlsxMasking)(engine, buffer, mode),
    csv: (engine, buffer, mode) => (0, csv_masker_1.handleCsvMasking)(engine, buffer, mode),
    docx: (engine, buffer, mode) => (0, doc_masker_1.handleDocxMasking)(engine, buffer, mode),
};
class MiddlewareAgent {
    constructor() { }
    static async init(body) {
        const agent = new MiddlewareAgent();
        await agent.loadConfig(body);
        return agent;
    }
    async loadConfig(body) {
        this.apiClient = new ds_agent_client_1.DSAgentClient();
        this.config = await this.apiClient.getAgentConfig(body);
        this.maskingEngine = new regex_masker_1.MaskingEngine(this.config?.regxRules, this.config?.esc);
    }
    async encryptData(input) {
        const content = typeof input === "string" ? input : input.toString("utf-8");
        const secretKey = this.config.esc;
        const encrypted = (0, encryption_1.encrypt)(content, secretKey);
        return encrypted;
    }
    async maskData(filePath) {
        if (!this?.config?.action &&
            !this?.config?.action?.isMask &&
            !this?.config?.action?.isEncrypt) {
            console.log("Masking disabled in config.");
            return fs_1.default.readFileSync(filePath);
        }
        const mode = this.config.action.isMask
            ? "mask"
            : this.config.action.isEncrypt
                ? "encrypt"
                : "";
        const ext = path_1.default.extname(filePath).slice(1).toLowerCase();
        const isDocExtAllowed = this.config.documentFilesExtentions.includes(ext);
        if (!isDocExtAllowed) {
            console.warn("Masking skipped: Unsupported file extension", { ext });
            return fs_1.default.readFileSync(filePath);
        }
        const fileBuffer = fs_1.default.readFileSync(filePath);
        let maskedBuffer = fileBuffer;
        // switch (ext) {
        //   case "pdf":
        //     const pdfResult = await this.maskingEngine.handlePDF(fileBuffer);
        //     if (!pdfResult) {
        //       throw new Error("PDF masking failed: result is undefined.");
        //     }
        //     maskedBuffer = Buffer.isBuffer(pdfResult)
        //       ? pdfResult
        //       : Buffer.from(pdfResult);
        //     console.log({ maskedBuffer });
        //     break;
        //   case "json":
        //     const jsonText = fileBuffer.toString("utf-8");
        //     const maskedJson = await this.maskingEngine.mask(jsonText);
        //     console.log(maskedJson);
        //     maskedBuffer = maskedJson;
        //     break;
        //   case "xml":
        //     const xmlText = fileBuffer.toString("utf-8");
        //     const maskedXml = await this.maskingEngine.mask(xmlText);
        //     maskedBuffer = Buffer.from(maskedXml, "utf-8");
        //     break;
        //   default:
        //     console.warn("No masking handler for extension:", ext);
        //     maskedBuffer = fileBuffer;
        // }
        const handler = exports.maskingStrategies[ext];
        if (handler) {
            maskedBuffer = await handler(this.maskingEngine, fileBuffer, mode);
        }
        return maskedBuffer;
    }
}
exports.default = MiddlewareAgent;
// txt: (engine: MaskingEngine, buffer: Buffer, mode?: string) =>
//   handleTxtMasking(engine, buffer, mode),
