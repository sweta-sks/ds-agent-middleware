import path from "path";
import { promises as fs } from "fs";
import { DSAgentClient } from "../ds-agent-client";

const SYNC_FILE = path.join(__dirname, "index.json");

export async function loadSyncData(): Promise<Record<string, any>> {
  try {
    const fileContent = await fs.readFile(SYNC_FILE, "utf-8");

    return JSON.parse(fileContent);
  } catch {
    return {};
  }
}

export async function startSyncScheduler(agentId?: string) {
  console.log("[🕒] Starting DS Agent Sync Scheduler...");
  const client = new DSAgentClient();
  const activeIntervals: Record<string, NodeJS.Timeout> = {};

  const syncData = await loadSyncData();
  const agentIds = agentId ? [agentId] : Object.keys(syncData);

  for (const agentKey of agentIds) {
    const agent = syncData[agentKey];

    const agentId = agent?.resultData?.agentId;
    const syncFrequency = agent?.resultData?.syncFrequency ?? 0.2; // in minutes

    if (!agentId) continue;

    const intervalMs = syncFrequency * 60 * 1000;

    if (activeIntervals[agentId]) {
      clearInterval(activeIntervals[agentId]);
      console.log(`Cleared previous interval for ${agentId}`);
    }

    console.log(
      `📅 Scheduling sync for agent ${agentId} every ${syncFrequency} minutes`
    );

    activeIntervals[agentId] = setInterval(async () => {
      try {
        console.log(`[🔄] Syncing config for agent: ${agentId}`);
        await client.getSyncConfig(agentId);
      } catch (err) {
        console.error(
          `[❌] Sync failed for ${agentId}:`,
          (err as Error).message
        );
      }
    }, intervalMs);
  }
}
