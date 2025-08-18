"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSyncData = loadSyncData;
exports.startSyncScheduler = startSyncScheduler;
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const ds_agent_client_1 = require("../ds-agent-client");
const SYNC_FILE = path_1.default.join(__dirname, "index.json");
async function loadSyncData() {
    try {
        const fileContent = await fs_1.promises.readFile(SYNC_FILE, "utf-8");
        return JSON.parse(fileContent);
    }
    catch {
        return {};
    }
}
async function startSyncScheduler(agentId) {
    console.log("[🕒] Starting DS Agent Sync Scheduler...");
    const client = new ds_agent_client_1.DSAgentClient();
    const activeIntervals = {};
    const syncData = await loadSyncData();
    const agentIds = agentId ? [agentId] : Object.keys(syncData);
    for (const agentKey of agentIds) {
        const agent = syncData[agentKey];
        const agentId = agent?.resultData?.agentId;
        const syncFrequency = agent?.resultData?.syncFrequency ?? 0.2; // in minutes
        if (!agentId)
            continue;
        const intervalMs = syncFrequency * 60 * 1000;
        if (activeIntervals[agentId]) {
            clearInterval(activeIntervals[agentId]);
            console.log(`Cleared previous interval for ${agentId}`);
        }
        console.log(`📅 Scheduling sync for agent ${agentId} every ${syncFrequency} minutes`);
        activeIntervals[agentId] = setInterval(async () => {
            try {
                console.log(`[🔄] Syncing config for agent: ${agentId}`);
                await client.getSyncConfig(agentId);
            }
            catch (err) {
                console.error(`[❌] Sync failed for ${agentId}:`, err.message);
            }
        }, intervalMs);
    }
}
