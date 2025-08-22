"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAgentReport = updateAgentReport;
exports.syncLogger = syncLogger;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const startSyncScheduler_1 = require("../sync/startSyncScheduler");
const axios_1 = __importDefault(require("axios"));
const ds_agent_client_1 = require("../ds-agent-client");
const loggerPath = path_1.default.join(__dirname, "index.json");
async function updateAgentReport(apiResponse) {
    const agentData = apiResponse?.resultData || {};
    const deviceDetails = agentData.deviceDetails || {};
    let loggerData = {};
    try {
        await fs_1.promises.mkdir(path_1.default.dirname(loggerPath), { recursive: true });
        const fileContent = await fs_1.promises.readFile(loggerPath, "utf-8");
        loggerData = fileContent.trim() !== "" ? JSON.parse(fileContent) : {};
    }
    catch (err) {
        loggerData = {};
    }
    if (!loggerData ||
        Object.keys(loggerData).length === 0 ||
        !loggerData.agentId) {
        loggerData = {
            agentId: agentData.agentId || "",
            accountId: agentData.accountId || "",
            platform: agentData.platform || "",
            type: agentData.type || "",
            deviceId: agentData.deviceId || "",
            sync: [],
            rules: [],
            files: [],
            reportOn: new Date().toISOString(),
        };
    }
    // Push sync log entry
    loggerData.sync.push({
        on: new Date().toISOString(),
        isSuccess: apiResponse?.resultCode === 0,
        message: apiResponse?.resultCode === 0
            ? ""
            : apiResponse?.resultMessage || "Unknown error",
    });
    const newRules = agentData?.configurations?.regxRules || [];
    const action = agentData?.configurations?.action;
    console.log({ action });
    newRules.forEach((rule) => {
        console.log({ loggerData });
        const index = loggerData?.rules.findIndex((r) => r.name === rule.name);
        if (index !== -1) {
            const existing = loggerData.rules[index];
            if (rule?.pattern !== existing.pattern) {
                loggerData.rules[index] = {
                    ...rule,
                    matchCount: 1,
                    lastProcessed: new Date().toISOString(),
                    error: rule.error || existing.error || "",
                    isMask: action.isMask,
                    isEncrypt: action.isEncrypt,
                };
            }
            else {
                loggerData.rules[index] = {
                    ...existing,
                    ...rule,
                    isMask: action.isMask,
                    isEncrypt: action.isEncrypt,
                    matchCount: (existing.matchCount || 0) + 1,
                    lastProcessed: new Date().toISOString(),
                    error: rule.error || existing.error || "",
                };
            }
        }
        else {
            loggerData.rules.push({
                name: rule.name,
                pattern: rule.pattern,
                matchCount: 0,
                isMask: action.isMask,
                isEncrypt: action.isEncrypt,
                error: "",
                lastProcessed: new Date().toISOString(),
            });
        }
    });
    const fileExts = agentData?.configurations?.documentFilesExtentions || [];
    fileExts.forEach((ext) => {
        const existing = loggerData.files.find((f) => f.type === ext);
        if (existing) {
            existing.count++;
        }
        else {
            loggerData.files.push({ type: ext, count: 1 });
        }
    });
    loggerData.reportOn = new Date().toISOString();
    const client = new ds_agent_client_1.DSAgentClient();
    const userConfig = await client.getAuthenticatePayload();
    const { jwt } = await client.getAuthenticateToken(userConfig);
    const url = `https://access.axiomprotect.com:6653/AxiomProtect/v1/dsagent/addDSAgentReportData`;
    const res = await axios_1.default.post(url, loggerData, {
        headers: {
            authToken: jwt,
            "Content-Type": "application/json",
        },
    });
    await fs_1.promises.writeFile(loggerPath, JSON.stringify(loggerData, null, 2));
    console.log("✅ Logger updated:");
}
async function syncLogger() {
    const syncData = await (0, startSyncScheduler_1.loadSyncData)();
    const activeIntervals = {};
    const agentIds = Object.keys(syncData);
    for (const agentKey of agentIds) {
        const agent = syncData[agentKey];
        const agentId = agent?.resultData?.agentId;
        const reportFrequency = agent?.resultData?.reportFrequency ?? 0.2;
        if (!agentId)
            continue;
        const intervalMs = reportFrequency * 60 * 1000;
        if (activeIntervals[agentId]) {
            clearInterval(activeIntervals[agentId]);
            console.log(`Cleared previous interval of log sync for ${agentId}`);
        }
        console.log(`📅 Scheduling logger sync for agent ${agentId} every ${reportFrequency} minutes`);
        activeIntervals[agentId] = setInterval(async () => {
            try {
                console.log(`[🔄] Syncing log config for agent: ${agentId}`);
                await updateAgentReport(agent);
            }
            catch (err) {
                console.error(`[❌] log Sync failed for ${agentId}:`, err.message);
            }
        }, intervalMs);
    }
}
