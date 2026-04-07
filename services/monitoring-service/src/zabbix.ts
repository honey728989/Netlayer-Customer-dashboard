import { requestJson } from "@netlayer/platform";

interface ZabbixHost {
  hostid: string;
  host: string;
  name: string;
  status: string;
}

interface ZabbixTrigger {
  triggerid: string;
  description: string;
  priority: string;
  value: string;
  hosts: { hostid: string; name: string }[];
  lastchange: string;
}

export class ZabbixClient {
  private authToken?: string;

  constructor(
    private readonly baseUrl: string,
    private readonly username: string,
    private readonly password: string
  ) {}

  private async rpc<T>(method: string, params: Record<string, unknown>) {
    const response = await requestJson<{ result: T }>(`${this.baseUrl}/api_jsonrpc.php`, {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        method,
        params,
        auth: this.authToken ?? null,
        id: Date.now()
      })
    });

    return response.result;
  }

  async login() {
    const response = await requestJson<{ result: string }>(`${this.baseUrl}/api_jsonrpc.php`, {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "user.login",
        params: {
          username: this.username,
          password: this.password
        },
        id: 1
      })
    });

    this.authToken = response.result;
    return this.authToken;
  }

  async getHosts() {
    if (!this.authToken) {
      await this.login();
    }

    return this.rpc<ZabbixHost[]>("host.get", {
      output: ["hostid", "host", "name", "status"]
    });
  }

  async getTriggers() {
    if (!this.authToken) {
      await this.login();
    }

    return this.rpc<ZabbixTrigger[]>("trigger.get", {
      output: ["triggerid", "description", "priority", "value", "lastchange"],
      selectHosts: ["hostid", "name"],
      filter: { value: 1 },
      sortfield: "lastchange",
      sortorder: "DESC"
    });
  }
}
