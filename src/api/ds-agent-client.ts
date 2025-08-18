import axios from "axios";
import { AgentConfig } from "../type";
import crypto from "crypto";
import os from "os";
import { promises as fs } from "fs";
import path from "path";
import { startSyncScheduler } from "../api/sync/startSyncScheduler";
import { syncLogger } from "./logger";
interface AuthPayload {
  agentId: string;
  agentName?: string;
  agentType?: string;
  deviceId?: string;
  deviceIp?: string;
  timeStamp?: string;
}

export class DSAgentClient {
  constructor() {}

  async getAgentConfig(agentId: string): Promise<AgentConfig> {
    const syncPath = path.join(__dirname, "sync", "index.json");
    await fs.mkdir(path.dirname(syncPath), { recursive: true });

    let existingSync: Record<string, any> = {};

    try {
      const fileContent = await fs.readFile(syncPath, "utf-8");
      existingSync = JSON.parse(fileContent);
    } catch (_) {
      existingSync = {};
    }
    if (existingSync[agentId]?.resultData?.configurations) {
      console.log(" Returning config from sync file");
      return existingSync[agentId].resultData.configurations;
    }
    const { url, requestBody } = await this.payload(agentId);

    const response = await axios.post(url, requestBody);
    const responseData = response.data;
    existingSync[agentId] = {
      ...responseData,
      resultData: {
        ...responseData.resultData,
        deviceId: requestBody.deviceId,
      },
    };

    await fs.writeFile(
      syncPath,
      JSON.stringify(existingSync, null, 2),
      "utf-8"
    );

    await startSyncScheduler(agentId);
    await syncLogger();
    return responseData.resultData?.configurations;
  }

  async getSyncConfig(agentId: string) {
    const syncPath = path.join(__dirname, "sync", "index.json");
    await fs.mkdir(path.dirname(syncPath), { recursive: true });

    let existingSync: Record<string, any> = {};

    const { url, requestBody } = await this.payload(agentId);

    const response = await axios.post(url, requestBody);
    const responseData = response.data;
    existingSync[agentId] = responseData;
    await fs.writeFile(
      syncPath,
      JSON.stringify(existingSync, null, 2),
      "utf-8"
    );

    return responseData.resultData?.configurations;
  }
  async getRequestTime() {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    const ms = now.getMilliseconds().toString().padStart(3, "0");

    // Format: '2025-07-24 04%3A25%3A25.988'
    const raw = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}.${ms}`;
    const requestTime = raw.replace(/:/g, "%3A");
    return requestTime;
  }

  async payload(agentId: string) {
    const agentName = "Middleware Service Agent";
    const agentType = "middleware_agent";
    const deviceId = this.generateDeviceId();
    const deviceIp = this.getDeviceIp();
    const timeStamp = new Date().toISOString();

    const requestTime = await this.getRequestTime();

    // https://access.axiomprotect.com:6653
    const url = `https://access.axiomprotect.com:6653/AxiomProtect/v1/dsagent/authenticate?&requestTime=${requestTime}`;

    const requestBody: AuthPayload = {
      agentId: agentId,
      agentName,
      agentType,
      deviceId,
      deviceIp,
      timeStamp,
    };
    return {
      url,
      requestBody,
    };
  }

  private generateDeviceId(): string {
    const raw = os.hostname();
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
