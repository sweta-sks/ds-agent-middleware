export interface userConfig {
    email: string;
    accountId: string;
    password: string;
    agentId: string;
}
export declare const maskingStrategies: any;
export default class MiddlewareAgent {
    private config;
    private maskingEngine;
    private apiClient;
    private constructor();
    static init(body: userConfig): Promise<MiddlewareAgent>;
    private loadConfig;
    encryptData(input: Buffer | string): Promise<string>;
    maskData(filePath: string): Promise<Buffer | string>;
}
//# sourceMappingURL=middleware-agent.d.ts.map