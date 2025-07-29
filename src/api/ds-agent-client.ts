import axios from "axios";
import { AgentConfig } from "../type";
import crypto from "crypto";
import os from "os";

interface AuthPayload {
  agentId: string;
  agentName?: string;
  agentType?: string;
  deviceId?: string;
  deviceIp?: string;
  timeStamp?: string;
}

export class DSAgentClient {
  constructor(private readonly baseUrl: string) {}

  async getAgentConfig(agentId: string): Promise<AgentConfig> {
    console.log({ agentId });
    const agentName = "Middleware Service Agent";
    const agentType = "service_agent";
    const deviceId = this.generateDeviceId();
    const deviceIp = this.getDeviceIp();
    const timeStamp = new Date().toISOString();
    const date = new Date("2025-07-24T04:25:25.988Z");

    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    const hh = String(date.getUTCHours()).padStart(2, "0");
    const min = String(date.getUTCMinutes()).padStart(2, "0");
    const ss = String(date.getUTCSeconds()).padStart(2, "0");
    const ms = String(date.getUTCMilliseconds()).padStart(3, "0");

    const raw = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}.${ms}`;
    const encoded = encodeURIComponent(raw);
    const url = `${this.baseUrl}/AxiomProtect/v1/dsagent/authenticate?&requestTime=${encoded}`;
    console.log({ url });
    const requestBody: AuthPayload = {
      agentId: agentId,
      agentName,
      agentType,
      deviceId,
      deviceIp,
      timeStamp,
    };

    const response = await axios.post(url, requestBody);

    return response.data.resultData?.configurations;
  }

  private generateDeviceId(): string {
    const raw = `${os.hostname()}-${Date.now()}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  private getDeviceIp(): string {
    const interfaces = os.networkInterfaces();

    for (const iface of Object.values(interfaces)) {
      if (!iface) continue;
      for (const net of iface) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }

    return "127.0.0.1";
  }
}
