declare module "ds-agent-middleware" {
  export interface UserConfig {
    email: string;
    accountId: string;
    password: string;
    agentId: string;
  }

  export default class MiddlewareAgent {
    private constructor();

    static init(config: UserConfig): Promise<MiddlewareAgent>;

    encryptData(input: Buffer | string): Promise<string>;
    maskData(filePath: string): Promise<Buffer | string>;
  }
}
