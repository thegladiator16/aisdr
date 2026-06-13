import { google } from "googleapis";

export class GmailClient {
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;

  constructor(accessToken: string, refreshToken: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    ) as never;
    (this.oauth2Client as { setCredentials: (c: object) => void }).setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    body: string;
    replyToMessageId?: string;
    threadId?: string;
  }): Promise<{ messageId: string; threadId: string }> {
    const gmail = google.gmail({ version: "v1", auth: this.oauth2Client as never });

    const bodyHtml = params.body.replace(/\n/g, "<br>");

    const emailLines = [
      `To: ${params.to}`,
      `Subject: ${params.subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=utf-8",
    ];

    if (params.replyToMessageId) {
      emailLines.push(`In-Reply-To: ${params.replyToMessageId}`);
      emailLines.push(`References: ${params.replyToMessageId}`);
    }

    emailLines.push("", bodyHtml);

    const raw = Buffer.from(emailLines.join("\r\n"))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw, threadId: params.threadId },
    });

    return {
      messageId: response.data.id!,
      threadId: response.data.threadId!,
    };
  }

  async getNewReplies(since: Date): Promise<unknown[]> {
    const gmail = google.gmail({ version: "v1", auth: this.oauth2Client as never });
    const sinceTimestamp = Math.floor(since.getTime() / 1000);

    const response = await gmail.users.messages.list({
      userId: "me",
      q: `is:inbox after:${sinceTimestamp}`,
      maxResults: 50,
    });

    const messages = response.data.messages ?? [];

    const fullMessages = await Promise.all(
      messages.map(async (msg) => {
        const full = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "full",
        });
        return full.data;
      })
    );

    return fullMessages;
  }

  static isConfigured(): boolean {
    return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }

  static getRedirectUri(): string {
    const base =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://aisdr-web.vercel.app";
    return `${base}/api/v1/integrations/gmail`;
  }

  static getAuthUrl(): string {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      GmailClient.getRedirectUri()
    );

    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
    });
  }

  static async exchangeCode(code: string) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      GmailClient.getRedirectUri()
    );

    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }
}
