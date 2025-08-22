import { AgentConfig, MaskConfig } from "../utils/type";
import { MaskingEngine } from "../masking/regex-masker";
import { DSAgentClient } from "../api/ds-agent-client";
import fs from "fs";
import path from "path";
import { handleDocxMasking } from "../masking/doc-masker";
import { encrypt } from "../utils/encryption";
import { handleXlsxMasking } from "../masking/xlsx-masker";
import { handleCsvMasking } from "../masking/csv-masker";
import { handleTxtMasking } from "../masking/txt";

export interface userConfig {
  email: string;
  accountId: string;
  password: string;
  agentId: string;
}
export const maskingStrategies: any = {
  pdf: (engine: MaskingEngine, buffer: Buffer, mode?: string) =>
    engine.handlePDF(buffer, mode),
  json: (engine: MaskingEngine, buffer: Buffer, mode?: string) =>
    engine.mask(buffer.toString("utf-8"), mode),
  xml: (engine: MaskingEngine, buffer: Buffer, mode?: string) =>
    engine.mask(buffer.toString("utf-8"), mode),
  xlsx: (engine: MaskingEngine, buffer: Buffer, mode?: string) =>
    handleXlsxMasking(engine, buffer, mode),
  csv: (engine: MaskingEngine, buffer: Buffer, mode?: string) =>
    handleCsvMasking(engine, buffer, mode),
  docx: (engine: MaskingEngine, buffer: Buffer, mode?: string) =>
    handleDocxMasking(engine, buffer, mode),
};

export default class MiddlewareAgent {
  private config!: AgentConfig;
  private maskingEngine!: MaskingEngine;
  private apiClient!: DSAgentClient;
  private constructor() {}

  static async init(body: userConfig) {
    const agent = new MiddlewareAgent();
    await agent.loadConfig(body);
    console.log(body);
    return agent;
  }

  private async loadConfig(body: userConfig) {
    this.apiClient = new DSAgentClient();
    this.config = await this.apiClient.getAgentConfig(body);
    this.maskingEngine = new MaskingEngine(
      this.config?.regxRules,
      this.config?.esc
    );
  }

  async encryptData(input: Buffer | string): Promise<string> {
    const content = typeof input === "string" ? input : input.toString("utf-8");
    const secretKey = this.config.esc;
    const encrypted = encrypt(content, secretKey);
    return encrypted;
  }
  async maskData(filePath: string): Promise<Buffer | string> {
    console.log(this.config?.action);
    if (
      !this?.config?.action &&
      !this?.config?.action?.isMask &&
      !this?.config?.action?.isEncrypt
    ) {
      console.log("Masking disabled in config.");
      return fs.readFileSync(filePath);
    }

    const mode = this.config.action.isMask
      ? "mask"
      : this.config.action.isEncrypt
      ? "encrypt"
      : "";
    console.log(mode);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const isDocExtAllowed = this.config.documentFilesExtentions.includes(ext);

    if (!isDocExtAllowed) {
      console.warn("Masking skipped: Unsupported file extension", { ext });
      return fs.readFileSync(filePath);
    }

    const fileBuffer = fs.readFileSync(filePath);
    let maskedBuffer: Buffer | string = fileBuffer;

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

    const handler = maskingStrategies[ext];
    if (handler) {
      maskedBuffer = await handler(this.maskingEngine, fileBuffer, mode);
    }

    return maskedBuffer;
  }
}

// txt: (engine: MaskingEngine, buffer: Buffer, mode?: string) =>
//   handleTxtMasking(engine, buffer, mode),
