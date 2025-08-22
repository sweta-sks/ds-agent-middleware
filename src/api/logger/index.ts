import { promises as fs } from "fs";
import path from "path";
import { loadSyncData } from "../sync/startSyncScheduler";
import axios from "axios";
import { DSAgentClient } from "../ds-agent-client";
const loggerPath = path.join(__dirname, "index.json");

export async function updateAgentReport(apiResponse: any) {
  const agentData = apiResponse?.resultData || {};

  const deviceDetails = agentData.deviceDetails || {};
  let loggerData: any = {};

  try {
    await fs.mkdir(path.dirname(loggerPath), { recursive: true });

    const fileContent = await fs.readFile(loggerPath, "utf-8");

    loggerData = fileContent.trim() !== "" ? JSON.parse(fileContent) : {};
  } catch (err) {
    loggerData = {};
  }

  if (
    !loggerData ||
    Object.keys(loggerData).length === 0 ||
    !loggerData.agentId
  ) {
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
    message:
      apiResponse?.resultCode === 0
        ? ""
        : apiResponse?.resultMessage || "Unknown error",
  });

  const newRules = agentData?.configurations?.regxRules || [];
  const action = agentData?.configurations?.action;

  newRules.forEach((rule: any) => {
    const index = loggerData?.rules.findIndex((r: any) => r.name === rule.name);

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
      } else {
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
    } else {
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
  fileExts.forEach((ext: string) => {
    const existing = loggerData.files.find((f: any) => f.type === ext);
    if (existing) {
      existing.count++;
    } else {
      loggerData.files.push({ type: ext, count: 1 });
    }
  });

  loggerData.reportOn = new Date().toISOString();

  const client = new DSAgentClient();
  const userConfig = await client.getAuthenticatePayload();

  const { jwt } = await client.getAuthenticateToken(userConfig);

  const url = `https://access.axiomprotect.com:6653/AxiomProtect/v1/dsagent/addDSAgentReportData`;
  const res = await axios.post(url, loggerData, {
    headers: {
      authToken: jwt,
      "Content-Type": "application/json",
    },
  });

  await fs.writeFile(loggerPath, JSON.stringify(loggerData, null, 2));
  console.log("✅ Logger updated:");
}

export async function syncLogger() {
  const syncData = await loadSyncData();
  const activeIntervals: Record<string, NodeJS.Timeout> = {};

  const agentIds = Object.keys(syncData);
  for (const agentKey of agentIds) {
    const agent = syncData[agentKey];

    const agentId = agent?.resultData?.agentId;
    const reportFrequency = agent?.resultData?.reportFrequency ?? 0.2;

    if (!agentId) continue;

    const intervalMs = reportFrequency * 60 * 1000;

    if (activeIntervals[agentId]) {
      clearInterval(activeIntervals[agentId]);
      console.log(`Cleared previous interval of log sync for ${agentId}`);
    }

    console.log(
      `📅 Scheduling logger sync for agent ${agentId} every ${reportFrequency} minutes`
    );

    activeIntervals[agentId] = setInterval(async () => {
      try {
        console.log(`[🔄] Syncing log config for agent: ${agentId}`);

        await updateAgentReport(agent);
      } catch (err) {
        console.error(
          `[❌] log Sync failed for ${agentId}:`,
          (err as Error).message
        );
      }
    }, intervalMs);
  }
}
