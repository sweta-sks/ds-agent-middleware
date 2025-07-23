import axios from "axios";
import { AgentConfig } from "../type";

export class DSAgentClient {
  constructor(
    private readonly baseUrl: string,
    private readonly accountId: string
  ) {}

  async getAgentConfig(agentId: string): Promise<AgentConfig> {
    const url = `${this.baseUrl}/v1/dsagent/getDSAgentById?accountId=${this.accountId}&agentId=${agentId}`;
    const response = await axios.get(url);

    return response.data.data.configurations;
  }
}
