import axios from "axios";
import { AgentConfig } from "../utils/type";
import crypto from "crypto";
import os from "os";
import { promises as fs } from "fs";
import path from "path";
import { startSyncScheduler } from "../api/sync/startSyncScheduler";
import { syncLogger } from "./logger";
import { userConfig } from "../agents/middleware-agent";
interface AuthPayload {
  agentId: string;
  agentName?: string;
  agentType?: string;
  deviceId?: string;
  deviceIp?: string;
  timeStamp?: string;
}
const USER_CONFIG = path.join(__dirname, "userConfig", "index.json");
export class DSAgentClient {
  constructor() {}

  async getAgentConfig(body: userConfig) {
    const userConfig = path.join(__dirname, "userConfig", "index.json");
    await fs.mkdir(path.dirname(userConfig), { recursive: true });

    await fs.writeFile(userConfig, JSON.stringify(body, null, 2), "utf-8");

    const { agentId, ...rest } = body;
    const data = await this.getAuthenticateToken(rest);
    const authToken = data.jwt;
    const deviceId = this.generateDeviceId();

    const registerUser = await this.registerUserWithAgent(authToken, {
      agentId,
      deviceId,
    });

    const isUserRegistered =
      registerUser.resultData.isUserRegistered || registerUser.resultCode >= 0;

    const userRegisterConfig = path.join(
      __dirname,
      "userConfig",
      "user-register.json"
    );
    await fs.mkdir(path.dirname(userRegisterConfig), { recursive: true });

    await fs.writeFile(
      userRegisterConfig,
      JSON.stringify(registerUser, null, 2),
      "utf-8"
    );

    if (isUserRegistered) {
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
        await startSyncScheduler(agentId);
        await syncLogger();
        return existingSync[agentId].resultData.configurations;
      }
      const { url, requestBody } = await this.payload(agentId);

      const response = await axios.post(url, requestBody, {
        headers: {
          authToken: authToken,
          "Content-Type": "application/json",
        },
      });
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
    return;
  }

  async getAuthenticateToken(body: {
    email: string;
    accountId: string;
    password: string;
  }) {
    const requestTime = await this.getRequestTime();
    const url = `https://access.axiomprotect.com:6653/AxiomProtect/v1/dsagent/getAuthenticationToken?&requestTime=${requestTime}`;

    const { data } = await axios.post(url, body);

    return data.resultData;
  }

  async registerUserWithAgent(
    authToken: "string",
    body: { agentId: string; deviceId: string }
  ) {
    const requestTime = await this.getRequestTime();
    const url = `https://access.axiomprotect.com:6653/AxiomProtect/v1/dsagent/registerUserWithAgent?&requestTime=${requestTime}`;

    const { data } = await axios.post(url, body, {
      headers: {
        authToken: authToken,
        "Content-Type": "application/json",
      },
    });

    return data;
  }

  async getAuthenticatePayload() {
    const fileContent = await fs.readFile(USER_CONFIG, "utf-8");

    return JSON.parse(fileContent);
  }

  async getSyncConfig(agentId: string) {
    const syncPath = path.join(__dirname, "sync", "index.json");
    await fs.mkdir(path.dirname(syncPath), { recursive: true });

    let existingSync: Record<string, any> = {};

    const { url, requestBody } = await this.payload(agentId);
    const userConfig = await this.getAuthenticatePayload();
    const { jwt } = await this.getAuthenticateToken(userConfig);
    const response = await axios.post(url, requestBody, {
      headers: {
        authToken: jwt,
        "Content-Type": "application/json",
      },
    });

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
    const networkInterfaces = os.networkInterfaces();

    let macAddress = "";
    for (const iface of Object.values(networkInterfaces)) {
      if (!iface) continue;
      for (const net of iface) {
        if (net.mac && net.mac !== "00:00:00:00:00:00" && !net.internal) {
          macAddress = net.mac;
          break;
        }
      }
      if (macAddress) break;
    }

    const raw = macAddress || os.hostname();

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
