"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiddlewareAgent = exports.maskingStrategies = void 0;
const regex_masker_1 = require("../masking/regex-masker");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const doc_masker_1 = require("../masking/doc-masker");
exports.maskingStrategies = {
    pdf: (engine, buffer) => engine.handlePDF(buffer),
    json: (engine, buffer) => engine.mask(buffer.toString("utf-8")),
    xml: (engine, buffer) => engine.mask(buffer.toString("utf-8")),
    docx: (engine, buffer) => (0, doc_masker_1.handleDocxMasking)(engine, buffer),
    // upcoming: docx, xlsx, csv, txt
};
class MiddlewareAgent {
    constructor(agentId, apiClient) {
        this.agentId = agentId;
        this.apiClient = apiClient;
    }
    static async init(agentId, apiClient) {
        const agent = new MiddlewareAgent(agentId, apiClient);
        await agent.loadConfig(agentId);
        return agent;
    }
    async loadConfig(agentId) {
        this.config = await this.apiClient.getAgentConfig(agentId);
        this.maskingEngine = new regex_masker_1.MaskingEngine(this.config.regxRules);
    }
    async maskData(filePath) {
        console.log(filePath);
        if (!this.config.action.isMask) {
            console.log("Masking disabled in config.");
            return fs_1.default.readFileSync(filePath);
        }
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
            maskedBuffer = await handler(this.maskingEngine, fileBuffer);
        }
        return maskedBuffer;
    }
}
exports.MiddlewareAgent = MiddlewareAgent;
