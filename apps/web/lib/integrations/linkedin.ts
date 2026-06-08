export class LinkedInClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async launchPhantom(agentId: string, argument: object) {
    const response = await fetch(
      "https://api.phantombuster.com/api/v2/agents/launch",
      {
        method: "POST",
        headers: {
          "X-Phantombuster-Key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: agentId, argument }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`PhantomBuster error ${response.status}: ${text}`);
    }

    return response.json();
  }

  async sendConnectionRequest(params: {
    linkedinUrl: string;
    note: string;
    sessionCookie: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      await this.launchPhantom(
        process.env.PHANTOMBUSTER_NETWORK_BOOSTER_ID!,
        {
          sessionCookie: params.sessionCookie,
          profileUrl: params.linkedinUrl,
          message: params.note.slice(0, 300),
          onlySecondCircle: false,
        }
      );
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendDirectMessage(params: {
    linkedinUrl: string;
    message: string;
    sessionCookie: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      await this.launchPhantom(
        process.env.PHANTOMBUSTER_MESSAGE_SENDER_ID!,
        {
          sessionCookie: params.sessionCookie,
          profileUrl: params.linkedinUrl,
          message: params.message.slice(0, 500),
        }
      );
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
