import { AgentConfig, MaskConfig } from "../type";
import { MaskingEngine } from "../masking/regex-masker";
import { DSAgentClient } from "../api/ds-agent-client";
import fs from "fs";
import path from "path";
import { handleDocxMasking } from "../masking/doc-masker";

export const maskingStrategies: any = {
  pdf: (engine: MaskingEngine, buffer: Buffer) => engine.handlePDF(buffer),
  json: (engine: MaskingEngine, buffer: Buffer) =>
    engine.mask(buffer.toString("utf-8")),
  xml: (engine: MaskingEngine, buffer: Buffer) =>
    engine.mask(buffer.toString("utf-8")),
  docx: (engine: MaskingEngine, buffer: Buffer) =>
    handleDocxMasking(engine, buffer),
  // upcoming: docx, xlsx, csv, txt
};

export class MiddlewareAgent {
  private config!: AgentConfig;
  private maskingEngine!: MaskingEngine;

  private constructor(
    private readonly agentId: string,
    private readonly apiClient: DSAgentClient
  ) {}

  static async init(agentId: string, apiClient: DSAgentClient) {
    const agent = new MiddlewareAgent(agentId, apiClient);

    await agent.loadConfig(agentId);
    return agent;
  }

  private async loadConfig(agentId: string) {
    this.config = await this.apiClient.getAgentConfig(agentId);
    this.maskingEngine = new MaskingEngine(this.config.regxRules);
  }

  async maskData(filePath: string): Promise<Buffer | string> {
    console.log(filePath);
    if (!this.config.action.isMask) {
      console.log("Masking disabled in config.");
      return fs.readFileSync(filePath);
    }

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
      maskedBuffer = await handler(this.maskingEngine, fileBuffer);
    }

    return maskedBuffer;
  }
}
