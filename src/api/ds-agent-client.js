"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DSAgentClient = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const os_1 = __importDefault(require("os"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const startSyncScheduler_1 = require("../api/sync/startSyncScheduler");
const logger_1 = require("./logger");
class DSAgentClient {
    constructor() { }
    async getAgentConfig(agentId) {
        const syncPath = path_1.default.join(__dirname, "sync", "index.json");
        await fs_1.promises.mkdir(path_1.default.dirname(syncPath), { recursive: true });
        let existingSync = {};
        try {
            const fileContent = await fs_1.promises.readFile(syncPath, "utf-8");
            existingSync = JSON.parse(fileContent);
        }
        catch (_) {
            existingSync = {};
        }
        if (existingSync[agentId]?.resultData?.configurations) {
            console.log(" Returning config from sync file");
            return existingSync[agentId].resultData.configurations;
        }
        const { url, requestBody } = await this.payload(agentId);
        const response = await axios_1.default.post(url, requestBody);
        const responseData = response.data;
        existingSync[agentId] = {
            ...responseData,
            resultData: {
                ...responseData.resultData,
                deviceId: requestBody.deviceId,
            },
        };
        await fs_1.promises.writeFile(syncPath, JSON.stringify(existingSync, null, 2), "utf-8");
        await (0, startSyncScheduler_1.startSyncScheduler)(agentId);
        await (0, logger_1.syncLogger)();
        return responseData.resultData?.configurations;
    }
    async getSyncConfig(agentId) {
        const syncPath = path_1.default.join(__dirname, "sync", "index.json");
        await fs_1.promises.mkdir(path_1.default.dirname(syncPath), { recursive: true });
        let existingSync = {};
        const { url, requestBody } = await this.payload(agentId);
        const response = await axios_1.default.post(url, requestBody);
        const responseData = response.data;
        existingSync[agentId] = responseData;
        await fs_1.promises.writeFile(syncPath, JSON.stringify(existingSync, null, 2), "utf-8");
        return responseData.resultData?.configurations;
    }
    async getRequestTime() {
        const pad = (n) => n.toString().padStart(2, "0");
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
    async payload(agentId) {
        const agentName = "Middleware Service Agent";
        const agentType = "middleware_agent";
        const deviceId = this.generateDeviceId();
        const deviceIp = this.getDeviceIp();
        const timeStamp = new Date().toISOString();
        const requestTime = await this.getRequestTime();
        // https://access.axiomprotect.com:6653
        const url = `https://access.axiomprotect.com:6653/AxiomProtect/v1/dsagent/authenticate?&requestTime=${requestTime}`;
        const requestBody = {
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
    generateDeviceId() {
        const raw = os_1.default.hostname();
        return crypto_1.default.createHash("sha256").update(raw).digest("hex");
    }
    getDeviceIp() {
        const interfaces = os_1.default.networkInterfaces();
        for (const iface of Object.values(interfaces)) {
            if (!iface)
                continue;
            for (const net of iface) {
                if (net.family === "IPv4" && !net.internal) {
                    return net.address;
                }
            }
        }
        return "127.0.0.1";
    }
}
exports.DSAgentClient = DSAgentClient;
