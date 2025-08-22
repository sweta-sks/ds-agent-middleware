import { userConfig } from "../agents/middleware-agent";
interface AuthPayload {
    agentId: string;
    agentName?: string;
    agentType?: string;
    deviceId?: string;
    deviceIp?: string;
    timeStamp?: string;
}
export declare class DSAgentClient {
    constructor();
    getAgentConfig(body: userConfig): Promise<any>;
    getAuthenticateToken(body: {
        email: string;
        accountId: string;
        password: string;
    }): Promise<any>;
    registerUserWithAgent(authToken: "string", body: {
        agentId: string;
        deviceId: string;
    }): Promise<any>;
    getAuthenticatePayload(): Promise<any>;
    getSyncConfig(agentId: string): Promise<any>;
    getRequestTime(): Promise<string>;
    payload(agentId: string): Promise<{
        url: string;
        requestBody: AuthPayload;
    }>;
    private generateDeviceId;
    private getDeviceIp;
}
export {};
//# sourceMappingURL=ds-agent-client.d.ts.map