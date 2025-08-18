import { promises as fs } from "fs";
import path from "path";
import { loadSyncData } from "../sync/startSyncScheduler";
import axios from "axios";
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

  console.log(loggerData);

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

  newRules.forEach((rule: any) => {
    const index = loggerData?.rules.findIndex((r: any) => r.name === rule.name);

    if (index !== undefined && index !== -1) {
      const existing = loggerData.rules[index];

      if (rule?.pattern !== existing.pattern) {
        loggerData.rules[index] = {
          ...rule,
          matchCount: 1,
          lastProcessed: new Date().toISOString(),
          error: rule.error || existing.error || "",
          isMask: rule.isMask,
          isEncrypt: rule.isEncrypt,
        };
      } else {
        loggerData.rules[index] = {
          ...existing,
          ...rule,
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
        isMask: rule.isMask ?? false,
        isEncrypt: rule.isEncrypt ?? true,
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

  const url = `https://access.axiomprotect.com:6653/AxiomProtect/v1/dsagent/addDSAgentReportData`;
  const res = await axios.post(url, loggerData);

  console.log(res);
  await fs.writeFile(loggerPath, JSON.stringify(loggerData, null, 2));
  console.log("✅ Logger updated:", loggerPath);
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

    const intervalMs = reportFrequency * 10 * 1000;

    if (activeIntervals[agentId]) {
      clearInterval(activeIntervals[agentId]);
      console.log(`Cleared previous interval for ${agentId}`);
    }

    console.log(
      `📅 Scheduling logger sync for agent ${agentId} every ${reportFrequency} minutes`
    );

    activeIntervals[agentId] = setInterval(async () => {
      try {
        console.log(`[🔄] Syncing log  config for agent: ${agentId}`);

        await updateAgentReport(agent);
      } catch (err) {
        console.error(
          `[❌] Sync failed for ${agentId}:`,
          (err as Error).message
        );
      }
    }, intervalMs);
  }
}
