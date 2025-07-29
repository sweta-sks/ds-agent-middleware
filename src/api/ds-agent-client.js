"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DSAgentClient = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const os_1 = __importDefault(require("os"));
class DSAgentClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async getAgentConfig(agentId) {
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
        const requestBody = {
            agentId: agentId,
            agentName,
            agentType,
            deviceId,
            deviceIp,
            timeStamp,
        };
        const response = await axios_1.default.post(url, requestBody);
        return response.data.resultData?.configurations;
    }
    generateDeviceId() {
        const raw = `${os_1.default.hostname()}-${Date.now()}`;
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
