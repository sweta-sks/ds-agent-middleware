"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DSAgentClient = void 0;
const axios_1 = __importDefault(require("axios"));
class DSAgentClient {
    constructor(baseUrl, accountId) {
        this.baseUrl = baseUrl;
        this.accountId = accountId;
    }
    async getAgentConfig(agentId) {
        const url = `${this.baseUrl}/v1/dsagent/getDSAgentById?accountId=${this.accountId}&agentId=${agentId}`;
        const response = await axios_1.default.get(url);
        return response.data.data.configurations;
    }
}
exports.DSAgentClient = DSAgentClient;
